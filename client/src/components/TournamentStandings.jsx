import React, { useMemo, useState } from 'react';

// Tournament standings view.
//
// Two panels:
//   1. SummaryLeaderboard — everyone with at least one submitted score.
//   2. PlayerRoundScorecard — pick a player + round, see a scramble-style
//      scorecard (same visual language as the live scramble scoreboard).
//
// Read-only, derived purely from gameState.

const COURSE_LABEL = {
    waldviertel: '🌲 Waldviertel',
    haugschlag: '⛳ Haugschlag',
    monachus: '🇨🇿 Monachus',
};

export default function TournamentStandings({ tournament, players, courses }) {
    const [sortBy, setSortBy] = useState('netto'); // 'netto' | 'brutto'
    const rounds = tournament.rounds || [];

    const perPlayer = useMemo(() => {
        const map = new Map();
        for (const r of rounds) {
            for (const [sub, result] of Object.entries(r.results || {})) {
                if (!map.has(sub)) {
                    const p = players.find(pp => pp.sub === sub);
                    map.set(sub, {
                        sub,
                        name: p?.name || (p?.email || 'Unknown').split('@')[0],
                        logo: p?.logo || null,
                        hcp: p?.hcp ?? null,
                        byRound: {},
                        totalBrutto: 0,
                        totalNetto: 0,
                        roundsPlayed: 0,
                    });
                }
                const row = map.get(sub);
                row.byRound[r.id] = result;
                row.totalBrutto += (result.brutto || 0);
                row.totalNetto += (result.netto || 0);
                row.roundsPlayed += 1;
            }
        }
        return Array.from(map.values());
    }, [rounds, players]);

    const sorted = useMemo(() => {
        const arr = [...perPlayer];
        arr.sort((a, b) => sortBy === 'brutto'
            ? b.totalBrutto - a.totalBrutto
            : b.totalNetto - a.totalNetto);
        return arr;
    }, [perPlayer, sortBy]);

    const leaderTotal = sorted[0]?.[sortBy === 'brutto' ? 'totalBrutto' : 'totalNetto'] ?? 0;

    if (perPlayer.length === 0) {
        return (
            <div className="card card--sunken" style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span className="u-muted">No scores submitted yet for this tournament.</span>
            </div>
        );
    }

    return (
        <div className="stack" style={{ marginTop: '1rem' }}>
            <SummaryLeaderboard
                sorted={sorted}
                rounds={rounds}
                sortBy={sortBy}
                setSortBy={setSortBy}
                leaderTotal={leaderTotal}
            />
            <DetailPicker
                players={sorted}
                rounds={rounds}
                courses={courses}
            />
        </div>
    );
}

function SummaryLeaderboard({ sorted, rounds, sortBy, setSortBy, leaderTotal }) {
    return (
        <div className="standings card card--sunken">
            <div className="standings__header">
                <h3 className="standings__title">📊 Standings</h3>
                <div className="btn-group" role="group" aria-label="Sort standings">
                    <button
                        type="button"
                        className="btn btn--sm"
                        aria-pressed={sortBy === 'netto'}
                        onClick={() => setSortBy('netto')}
                    >Netto</button>
                    <button
                        type="button"
                        className="btn btn--sm"
                        aria-pressed={sortBy === 'brutto'}
                        onClick={() => setSortBy('brutto')}
                    >Brutto</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="standings-table">
                    <thead>
                        <tr>
                            <th className="t-left">#</th>
                            <th className="t-left">Player</th>
                            <th>HCP</th>
                            {rounds.map((r, idx) => (
                                <th key={r.id}>
                                    <div>R{idx + 1}</div>
                                    <div className="u-muted" style={{ fontSize: 'var(--fz-xs)', fontWeight: 400 }}>
                                        {COURSE_LABEL[r.courseId] || r.courseId}
                                    </div>
                                </th>
                            ))}
                            <th className={sortBy === 'brutto' ? 'is-sorted' : ''}>Brutto</th>
                            <th className={`is-sticky ${sortBy === 'netto' ? 'is-sorted' : ''}`}>Netto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, rank) => {
                            const totalForSort = sortBy === 'brutto' ? p.totalBrutto : p.totalNetto;
                            const diff = totalForSort - leaderTotal;
                            const isLeader = rank === 0;
                            const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1;
                            return (
                                <tr key={p.sub}>
                                    <td className="rank-cell">{medal}</td>
                                    <td>
                                        <div className="player-cell">
                                            {p.logo
                                                ? <img src={p.logo} alt="" className="player-cell__avatar" />
                                                : <div className="player-cell__avatar" style={{ background: 'var(--surface-3)' }} />}
                                            <span>{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="u-muted">{p.hcp != null ? p.hcp : '—'}</td>
                                    {rounds.map(r => {
                                        const res = p.byRound[r.id];
                                        return (
                                            <td key={r.id} className="round-cell">
                                                {res ? (
                                                    <>
                                                        <div className="netto">{res.netto ?? '—'}</div>
                                                        <span className="brutto">brutto {res.brutto ?? '—'}</span>
                                                    </>
                                                ) : <span className="empty">—</span>}
                                            </td>
                                        );
                                    })}
                                    <td className={`total-cell ${sortBy === 'brutto' ? 'is-sorted' : ''}`}>
                                        {p.totalBrutto}
                                        {sortBy === 'brutto' && !isLeader && (
                                            <span className="diff">({diff})</span>
                                        )}
                                    </td>
                                    <td className={`total-cell is-sticky ${sortBy === 'netto' ? 'is-sorted' : ''}`}>
                                        {p.totalNetto}
                                        {sortBy === 'netto' && !isLeader && (
                                            <span className="diff">({diff})</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DetailPicker({ players, rounds, courses }) {
    const [playerSub, setPlayerSub] = useState(players[0]?.sub || '');
    const [roundId, setRoundId] = useState(() => {
        const first = players[0];
        if (!first) return '';
        const played = rounds.filter(r => first.byRound[r.id]);
        return played[played.length - 1]?.id || rounds[0]?.id || '';
    });

    const selectedPlayer = players.find(p => p.sub === playerSub);
    const selectedRound = rounds.find(r => r.id === roundId);
    const result = selectedPlayer?.byRound[roundId] || null;
    const course = courses?.[selectedRound?.courseId];

    return (
        <div className="card card--sunken">
            <div className="standings__header" style={{ marginBottom: 'var(--s-3)' }}>
                <h3 className="standings__title">🔍 Round detail</h3>
                <div className="cluster">
                    <select value={playerSub} onChange={e => setPlayerSub(e.target.value)}>
                        {players.map(p => (
                            <option key={p.sub} value={p.sub}>{p.name}</option>
                        ))}
                    </select>
                    <select value={roundId} onChange={e => setRoundId(e.target.value)}>
                        {rounds.map((r, idx) => (
                            <option key={r.id} value={r.id}>
                                R{idx + 1}: {COURSE_LABEL[r.courseId] || r.courseId} · {r.date}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!result ? (
                <div style={{ textAlign: 'center', padding: 'var(--s-4)' }} className="u-muted">
                    {selectedPlayer?.name || 'This player'} has no score for this round.
                </div>
            ) : !course ? (
                <div style={{ textAlign: 'center', padding: 'var(--s-4)' }} className="u-muted">
                    Course data missing.
                </div>
            ) : (
                <PlayerRoundScorecard
                    result={result}
                    course={course}
                    player={selectedPlayer}
                />
            )}
        </div>
    );
}

// Uses the unified scramble-style scorecard classes so the tournament round
// detail looks identical to the live scramble scoreboard.
function PlayerRoundScorecard({ result, course, player }) {
    const tee = course.tees.find(t => t.id === result.teeId);
    const holes = course.holes;
    const frontNine = holes.slice(0, 9);
    const backNine = holes.slice(9, 18);

    return (
        <div className="scorecard-shell">
            <div className="scorecard-shell__title">
                🏌️ {course.name || 'Scorecard'}
            </div>

            <div className="scorecard-shell__meta">
                <span><strong>{player?.name}</strong></span>
                {tee && <span>{tee.label} {tee.gender === 'ladies' ? '♀' : '♂'}</span>}
                {player?.hcp != null && <span>HCP <strong>{player.hcp}</strong></span>}
                {result.courseHandicap != null && <span>CH <strong>{result.courseHandicap}</strong></span>}
                <span>Brutto <strong>{result.brutto ?? '—'}</strong></span>
                <span>Netto <strong style={{ color: 'var(--accent-amber-soft)' }}>{result.netto ?? '—'}</strong></span>
            </div>

            <NineTable holes={frontNine} label="Front 9" result={result} tee={tee} />
            <NineTable holes={backNine} label="Back 9" result={result} tee={tee} />

            <div className="scorecard-legend">
                <span className="legend-item"><span className="sc-cell--eagle" style={{ padding: '2px 6px', borderRadius: 3 }}>Eagle</span></span>
                <span className="legend-item"><span className="sc-cell--birdie" style={{ padding: '2px 6px', borderRadius: 3 }}>Birdie</span></span>
                <span className="legend-item"><span className="sc-cell--par" style={{ padding: '2px 6px', borderRadius: 3, border: '1px solid #ddd' }}>Par</span></span>
                <span className="legend-item"><span className="sc-cell--bogey" style={{ padding: '2px 6px', borderRadius: 3 }}>Bogey</span></span>
                <span className="legend-item"><span className="sc-cell--double" style={{ padding: '2px 6px', borderRadius: 3 }}>Double+</span></span>
            </div>
        </div>
    );
}

function cellClassFor(strokes, par) {
    if (strokes == null) return 'sc-cell--empty';
    const d = strokes - par;
    if (d <= -2) return 'sc-cell--eagle';
    if (d === -1) return 'sc-cell--birdie';
    if (d === 0) return 'sc-cell--par';
    if (d === 1) return 'sc-cell--bogey';
    return 'sc-cell--double';
}

function NineTable({ holes, label, result, tee }) {
    const strokesObj = result.strokes || {};
    const nettoObj = result.nettoPerHole || {};
    const vorgabeObj = computeVorgabe(result, tee, holes);

    const strokesTotal = holes.reduce((s, h) => s + (strokesObj[h.number] || 0), 0);
    const parTotal = holes.reduce((s, h) => s + h.par, 0);
    const nettoTotal = holes.reduce((s, h) => s + (nettoObj[h.number] || 0), 0);
    const vorgabeTotal = holes.reduce((s, h) => s + (vorgabeObj[h.number] || 0), 0);
    const diff = strokesTotal - parTotal;

    return (
        <div className="scorecard-nine">
            <div className="scorecard-nine__header">{label}</div>
            <div>
                <table className="scorecard">
                    <thead>
                        <tr>
                            <th className="label-col">Hole</th>
                            {holes.map(h => (
                                <th key={h.number}>
                                    <div className="scorecard__hole-num">{h.number}</div>
                                </th>
                            ))}
                            <th className="total-col">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="scorecard__par-row">
                            <td className="label-col">PAR</td>
                            {holes.map(h => <td key={h.number}>{h.par}</td>)}
                            <td className="total-col">{parTotal}</td>
                        </tr>
                        <tr className="scorecard__strokes-row">
                            <td className="label-col">Strokes</td>
                            {holes.map(h => {
                                const s = strokesObj[h.number];
                                return (
                                    <td key={h.number} className={cellClassFor(s, h.par)}>
                                        {s ?? '—'}
                                    </td>
                                );
                            })}
                            <td className="total-col">
                                {strokesTotal || '—'}
                                {strokesTotal > 0 && (
                                    <span className={`total-diff--${diff > 0 ? 'over' : diff < 0 ? 'under' : 'zero'}`} style={{ marginLeft: 4, fontSize: 'var(--fz-xs)' }}>
                                        ({diff >= 0 ? '+' : ''}{diff})
                                    </span>
                                )}
                            </td>
                        </tr>
                        <tr className="scorecard__vorgabe-row">
                            <td className="label-col">Vorgabe</td>
                            {holes.map(h => {
                                const v = vorgabeObj[h.number] || 0;
                                return (
                                    <td key={h.number}>
                                        {v > 0 ? '•'.repeat(Math.min(v, 3)) : ''}
                                    </td>
                                );
                            })}
                            <td className="total-col">{vorgabeTotal || ''}</td>
                        </tr>
                        <tr className="scorecard__points-row">
                            <td className="label-col">Pts</td>
                            {holes.map(h => (
                                <td key={h.number}>{nettoObj[h.number] ?? 0}</td>
                            ))}
                            <td className="total-col">{nettoTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Per-hole extra strokes ("Vorgabe" / shots received) from course handicap:
//   base = floor(CH / 18), then +1 for holes whose SI ≤ (CH % 18)
function computeVorgabe(result, tee, holes) {
    const ch = result.courseHandicap;
    if (ch == null || !tee || !holes) return {};
    const siKey = tee.gender === 'ladies' ? 'siLadies' : 'siMen';
    const chAbs = Math.abs(ch);
    const base = Math.floor(chAbs / 18);
    const rem = chAbs % 18;
    const out = {};
    for (const h of holes) {
        const si = h[siKey];
        out[h.number] = base + (si <= rem ? 1 : 0);
    }
    return out;
}
