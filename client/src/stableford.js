// Client-side mirror of server/stableford.js. Used for live preview in the
// upload modal while the user tweaks strokes. Server recomputes on commit
// so this never has to be exactly trusted — keep the two files in sync.

export function computeCourseHandicap(hcpIndex, slope, cr, par) {
    if (hcpIndex == null || slope == null || cr == null || par == null) return 0;
    const raw = Number(hcpIndex) * Number(slope) / 113 + (Number(cr) - Number(par));
    return Math.round(raw);
}

export function strokesReceived(ch, si) {
    if (!ch || ch <= 0) return 0;
    const base = Math.floor(ch / 18);
    const extra = si <= (ch % 18) ? 1 : 0;
    return base + extra;
}

export function pointsForHole(grossStrokes, par, strokesGiven) {
    if (grossStrokes == null || grossStrokes <= 0) return 0;
    const net = grossStrokes - strokesGiven;
    const diff = net - par;
    if (diff <= -2) return 4;
    if (diff === -1) return 3;
    if (diff === 0) return 2;
    if (diff === 1) return 1;
    return 0;
}

export function computeRound({ strokes, course, tee, playerHcp }) {
    if (!course || !tee) return { brutto: 0, netto: 0, courseHandicap: 0, bruttoPerHole: {}, nettoPerHole: {} };
    const ch = computeCourseHandicap(playerHcp, tee.slope, tee.cr, course.par);
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
