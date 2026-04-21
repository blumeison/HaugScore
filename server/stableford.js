// Pure stableford math. Same module is loadable from the client for live
// preview in the upload modal (no server round-trip per keystroke).
//
// WHS formula:
//   CH = round(HI × Slope/113 + (CR - Par))
//
// Per-hole strokes received:
//   base = floor(CH / 18)
//   extra = si <= (CH mod 18) ? 1 : 0  (only when CH >= 0)
//   For negative CH (plus handicaps) we give back strokes on the hardest holes
//   instead: base = ceil(CH/18) (more negative or zero), and we SUBTRACT from
//   the par on holes with si > 18 + (CH mod 18). Keep it simple for now: if
//   CH < 0, treat as 0 (extremely rare in this group).
//
// Stableford points table (net strokes vs par):
//   -2 or better: 4
//   -1         : 3
//    0 (par)   : 2
//   +1         : 1
//   +2 or more : 0
//   missing / 0 strokes : 0

function computeCourseHandicap(hcpIndex, slope, cr, par) {
    if (hcpIndex == null || slope == null || cr == null || par == null) return 0;
    const raw = Number(hcpIndex) * Number(slope) / 113 + (Number(cr) - Number(par));
    return Math.round(raw);
}

function strokesReceived(ch, si) {
    if (!ch || ch <= 0) return 0;
    const base = Math.floor(ch / 18);
    const extra = si <= (ch % 18) ? 1 : 0;
    return base + extra;
}

function pointsForHole(grossStrokes, par, strokesGiven) {
    if (grossStrokes == null || grossStrokes <= 0) return 0;
    const netStrokes = grossStrokes - strokesGiven;
    const diff = netStrokes - par;
    if (diff <= -2) return 4;
    if (diff === -1) return 3;
    if (diff === 0) return 2;
    if (diff === 1) return 1;
    return 0;
}

// strokes: { [holeNumber]: grossStrokes } (1..18)
// course: { par, holes: [{number, par, siMen, siLadies}] }
// tee:    { cr, slope, gender }
// playerHcp: number (HI)
//
// Returns { brutto, netto, courseHandicap, bruttoPerHole, nettoPerHole }
function computeRound({ strokes, course, tee, playerHcp }) {
    if (!course || !tee) return { brutto: 0, netto: 0, courseHandicap: 0, bruttoPerHole: {}, nettoPerHole: {} };
    const ch = computeCourseHandicap(playerHcp, tee.slope, tee.cr, course.par);
    // Brutto = HCP 0: always CH=0 → no strokes given.
    const bruttoPerHole = {};
    const nettoPerHole = {};
    let brutto = 0;
    let netto = 0;
    const siKey = tee.gender === 'ladies' ? 'siLadies' : 'siMen';
    for (const hole of course.holes) {
        const gross = strokes ? strokes[hole.number] : null;
        const si = hole[siKey];
        const given = strokesReceived(ch, si);
        const bPts = pointsForHole(gross, hole.par, 0);
        const nPts = pointsForHole(gross, hole.par, given);
        bruttoPerHole[hole.number] = bPts;
        nettoPerHole[hole.number] = nPts;
        brutto += bPts;
        netto += nPts;
    }
    return { brutto, netto, courseHandicap: ch, bruttoPerHole, nettoPerHole };
}

module.exports = {
    computeCourseHandicap,
    strokesReceived,
    pointsForHole,
    computeRound,
};
