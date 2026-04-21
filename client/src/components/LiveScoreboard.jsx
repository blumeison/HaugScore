import React from 'react';

// Scramble live scoreboard — uses the SAME unified scorecard visual language
// as the tournament round detail (cream table, yellow PAR row, coloured
// sc-cell--* strokes cells, tabular numbers).

export default function LiveScoreboard({ gameState, myTeamId }) {
    const course = gameState.course;
    const teams = gameState.teams;

    const frontNine = course.holes.slice(0, 9);
    const backNine = course.holes.slice(9, 18);

    return (
        <div className="scorecard-shell live-scoreboard">
            <div className="scorecard-shell__title">
                🏌️ {course.name} — Live Scoreboard 🏌️
            </div>

            <NineBoard holes={frontNine} teams={teams} myTeamId={myTeamId} label="Front 9" />
            <NineBoard holes={backNine} teams={teams} myTeamId={myTeamId} label="Back 9" />

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

function cellClassFor(score, par) {
    if (!score) return 'sc-cell--empty';
    const d = score - par;
    if (d <= -2) return 'sc-cell--eagle';
    if (d === -1) return 'sc-cell--birdie';
    if (d === 0) return 'sc-cell--par';
    if (d === 1) return 'sc-cell--bogey';
    return 'sc-cell--double';
}

function NineBoard({ holes, teams, myTeamId, label }) {
    const parTotal = holes.reduce((s, h) => s + h.par, 0);

    return (
        <div className="scorecard-nine">
            <div className="scorecard-nine__header">{label}</div>
            <div style={{ overflowX: 'auto' }}>
                <table className="scorecard">
                    <thead>
                        <tr>
                            <th className="label-col scorecard__team-col">Team</th>
                            {holes.map(h => (
                                <th key={h.number}>
                                    <div className="scorecard__hole-num">{h.number}</div>
                                </th>
                            ))}
                            <th className="total-col">Total</th>
                        </tr>
                        <tr className="scorecard__par-row">
                            <td className="label-col">PAR</td>
                            {holes.map(h => <td key={h.number}>{h.par}</td>)}
                            <td className="total-col">{parTotal}</td>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(team => {
                            const total = holes.reduce((s, h) => s + (team.scores[h.number] || 0), 0);
                            const holesPlayed = holes.filter(h => team.scores[h.number] !== undefined);
                            const parPlayed = holesPlayed.reduce((s, h) => s + h.par, 0);
                            const diff = total - parPlayed;
                            const isMe = team.id === myTeamId;

                            return (
                                <tr key={team.id} className={isMe ? 'is-self' : ''}>
                                    <td className="label-col scorecard__team-col">
                                        <div className="team-info">
                                            {team.logo ? (
                                                <img src={team.logo} alt={team.name} className="team-mini-logo" />
                                            ) : (
                                                <div className="team-mini-logo" style={{ background: team.color }} />
                                            )}
                                            <span>{team.name}</span>
                                        </div>
                                    </td>
                                    {holes.map(h => {
                                        const score = team.scores[h.number];
                                        return (
                                            <td key={h.number} className={cellClassFor(score, h.par)}>
                                                {score || '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="total-col">
                                        <strong>{total || 0}</strong>
                                        {diff !== 0 && total > 0 && (
                                            <span className={`total-diff--${diff > 0 ? 'over' : 'under'}`} style={{ marginLeft: 4, fontSize: 'var(--fz-xs)' }}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
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
