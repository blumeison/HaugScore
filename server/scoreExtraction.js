// Score extraction via Claude vision.
//
// Flow: user uploads 1–N screenshots of their round scorecard (from whatever
// app they used — Golfshot, Grint, Blue Golf, Swing, the course's own
// scorekeeping app, whatever). We ask Claude to read the GROSS STROKES per
// hole (not stableford points), because many apps don't show stableford at
// all. Stableford math is then computed server-side using the selected tee's
// CR/Slope and the hole's SI — see server/stableford.js.
//
// We pass all images in a single turn to Claude along with the course + par
// so it can sanity-check hole numbers. We return the raw extraction to the
// client WITHOUT committing it — the user always gets a confirm step so an
// LLM mis-read costs them 2 seconds, not a corrupted tournament.

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

if (!client) {
    console.warn('[scoreExtraction] ANTHROPIC_API_KEY not set — /api/extract-score will 503');
}

const SYSTEM_PROMPT = `You are a golf scorecard reader. The user uploads one or more screenshots of the SAME completed round of golf from a phone-based scoring app. Your job is to extract the gross STROKES TAKEN on each of the 18 holes.

CRITICAL — picking the right row:
Phone scorecards almost always show at least two rows of numbers per nine:
  (a) the PAR row — the "supposed strokes", identical on every card for the same course, typically 3/4/5 values.
  (b) the PLAYER'S ACTUAL STROKES row — what they actually scored.
You MUST return row (b), never row (a). Warning signs you're looking at the wrong row:
  - The numbers are almost all 3/4/5 and they match the par row exactly → that's par, not strokes.
  - None of the numbers are circled/squared/coloured → probably par.
The strokes row usually has MARKUP (coloured circles, squares, underlines, or bold) indicating birdies/eagles (below par) and bogeys/doubles (above par). If both an "Out" and "In" sub-total are visible, the strokes row total will equal the reported round total (e.g. 91 = 44 + 47), while the par row total will be par of the course (e.g. 72 = 36 + 36). Use these totals to verify you picked the right row.

Other rules:
1. If multiple images are parts of the same round (front 9 + back 9, overview + detail, full 18), combine them.
2. Return the GROSS (actual) strokes per hole — NOT stableford points, NOT net strokes. If the strokes row shows "6" on hole 1, return 6.
3. Each hole value must be a positive integer (1–15) or null when you genuinely can't read it. Do NOT guess.
4. Also try to detect the tee colour the player used ("white", "yellow", "blue", "red", "black", "orange") and gender ("men" or "ladies") if visible. If unsure leave them null — the user picks them manually.
5. Output MUST be valid JSON matching the schema below. No prose outside the JSON.

JSON schema:
{
  "strokes": {
    "1": <int|null>, "2": <int|null>, ..., "18": <int|null>
  },
  "outTotal": <int|null>,      // the reported front-9 total if visible (e.g. "Out" = 44)
  "inTotal":  <int|null>,      // the reported back-9 total if visible (e.g. "In"  = 47)
  "grandTotal": <int|null>,    // the reported round total if visible (e.g. 91)
  "teeColor": "white"|"yellow"|"blue"|"red"|"black"|"orange"|null,
  "gender": "men"|"ladies"|null,
  "confidence": <number 0.0-1.0>,
  "rationale": "<1–2 sentences: which row you picked and how its total matched the grand total>"
}`;

/**
 * @param {object} args
 * @param {Array<{mediaType: string, data: string}>} args.images  base64-encoded (no prefix)
 * @param {number|null} args.playerHcp
 * @param {string|null} args.courseName
 * @param {number|null} args.par
 * @returns {Promise<{strokes: object, teeColor: string|null, gender: string|null, confidence: number, rationale: string}>}
 */
async function extractScore({ images, playerHcp, courseName, par }) {
    if (!client) {
        throw Object.assign(new Error('LLM not configured'), { status: 503 });
    }
    if (!Array.isArray(images) || images.length === 0) {
        throw Object.assign(new Error('No images provided'), { status: 400 });
    }
    if (images.length > 6) {
        throw Object.assign(new Error('Too many images (max 6)'), { status: 400 });
    }

    const hcpText = typeof playerHcp === 'number'
        ? `The player's handicap index is ${playerHcp}.`
        : '';
    const courseText = courseName
        ? `The round was played on "${courseName}"${par ? ` (par ${par})` : ''}.`
        : '';

    const contentBlocks = [
        ...images.map(img => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: img.mediaType || 'image/jpeg',
                data: img.data,
            },
        })),
        {
            type: 'text',
            text: `${courseText} ${hcpText} Extract the GROSS STROKES per hole (1 through 18) from the scorecard screenshot(s) above. Respond with JSON only.`.trim(),
        },
    ];

    const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
    });

    const text = resp.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim();

    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        throw Object.assign(
            new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`),
            { status: 502 }
        );
    }

    const clampStroke = (v) => {
        if (v === null || v === undefined) return null;
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) return null;
        if (n > 15) return 15;
        return n;
    };

    const strokes = {};
    const src = parsed.strokes && typeof parsed.strokes === 'object' ? parsed.strokes : {};
    for (let h = 1; h <= 18; h++) {
        strokes[h] = clampStroke(src[h] ?? src[String(h)]);
    }

    const teeColorRaw = typeof parsed.teeColor === 'string' ? parsed.teeColor.toLowerCase() : null;
    const validColors = ['white', 'yellow', 'blue', 'red', 'black', 'orange'];
    const teeColor = validColors.includes(teeColorRaw) ? teeColorRaw : null;

    const genderRaw = typeof parsed.gender === 'string' ? parsed.gender.toLowerCase() : null;
    const gender = (genderRaw === 'men' || genderRaw === 'ladies') ? genderRaw : null;

    let confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    let rationale = typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 500) : '';

    // Sanity checks: if the model also reported a grand total, verify it
    // matches the sum of the strokes it gave us. Big mismatch usually
    // means it extracted the par row instead of the strokes row.
    const sum = Object.values(strokes).reduce((a, b) => a + (b || 0), 0);
    const reportedTotal = parseInt(parsed.grandTotal, 10);
    if (!isNaN(reportedTotal) && reportedTotal > 0) {
        const delta = Math.abs(sum - reportedTotal);
        if (delta > 2) {
            confidence = Math.min(confidence, 0.3);
            rationale = `⚠️ Extracted holes sum to ${sum} but scorecard says ${reportedTotal}. Possibly read the PAR row instead of strokes — double-check each hole. ${rationale}`;
        }
    }
    // And: if the par-row trap happened (every value is 3/4/5 and total is 70-74),
    // that's a strong signal even without a grandTotal.
    const allParLike = Object.values(strokes).every(v => v === null || (v >= 3 && v <= 5));
    if (allParLike && sum >= 68 && sum <= 75 && course_like_par_hit(strokes)) {
        confidence = Math.min(confidence, 0.35);
        rationale = `⚠️ Every extracted value is 3/4/5 (typical par row). Verify you're reading the player's strokes, not the par row. ${rationale}`;
    }

    return {
        strokes,
        teeColor,
        gender,
        confidence,
        rationale,
    };
}

// Helper: 18 values all strictly in [3,5] with total 68-75 is the par-row trap.
function course_like_par_hit(strokes) {
    const vals = Object.values(strokes);
    if (vals.some(v => v === null)) return false;
    return vals.length === 18;
}

module.exports = { extractScore };
