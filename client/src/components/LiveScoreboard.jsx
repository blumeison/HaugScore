import React from 'react';

export default function LiveScoreboard({ gameState, myTeamId }) {
    const course = gameState.course;
    const teams = gameState.teams;

    // Split into front 9 and back 9
    const frontNine = course.holes.slice(0, 9);
    const backNine = course.holes.slice(9, 18);

    const getScoreColor = (score, par) => {
        if (!score) return '';
        const diff = score - par;
        if (diff <= -2) return 'eagle'; // Eagle or better
        if (diff === -1) return 'birdie';
        if (diff === 0) return 'par';
        if (diff === 1) return 'bogey';
        return 'double-bogey'; // Double bogey or worse
    };

    const calculateTotal = (team, holes) => {
        return holes.reduce((sum, hole) => {
            const score = team.scores[hole.number];
            return sum + (score || 0);
        }, 0);
    };

    const calculatePar = (holes) => {
        return holes.reduce((sum, hole) => sum + hole.par, 0);
    };

    const renderNine = (holes, title) => {
        const parTotal = calculatePar(holes);

        return (
            <div className="scoreboard-nine">
                <div className="scoreboard-header">
                    <h3>{title}</h3>
                </div>
                <table className="scoreboard-table">
                    <thead>
                        <tr className="header-row">
                            <th className="team-col">Team</th>
                            {holes.map(hole => (
                                <th key={hole.number} className="hole-col">
                                    <div className="hole-number">{hole.number}</div>
                                    <div className="hole-hcp">HCP {hole.hcp}</div>
                                </th>
                            ))}
                            <th className="total-col">Total</th>
                        </tr>
                        <tr className="par-row">
                            <td className="par-label">PAR</td>
                            {holes.map(hole => (
                                <td key={hole.number} className="par-value">{hole.par}</td>
                            ))}
                            <td className="par-total">{parTotal}</td>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(team => {
                            const total = calculateTotal(team, holes);

                            // Calculate par differential based ONLY on holes played in this nine
                            const holesPlayed = holes.filter(hole => team.scores[hole.number] !== undefined);
                            const parForHolesPlayed = holesPlayed.reduce((sum, hole) => sum + hole.par, 0);
                            const parDiff = total - parForHolesPlayed;

                            return (
                                <tr key={team.id} className={team.id === myTeamId ? 'my-team' : ''}>
                                    <td className="team-name">
                                        <div className="team-info">
                                            {team.logo ? (
                                                <img src={team.logo} alt={team.name} className="team-mini-logo" />
                                            ) : (
                                                <div className="team-mini-logo" style={{ background: team.color }}></div>
                                            )}
                                            <span>{team.name}</span>
                                        </div>
                                    </td>
                                    {holes.map(hole => {
                                        const score = team.scores[hole.number];
                                        const colorClass = getScoreColor(score, hole.par);
                                        return (
                                            <td key={hole.number} className={`score-cell ${colorClass}`}>
                                                {score || '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="team-total">
                                        <span className="total-score">{total || 0}</span>
                                        {parDiff !== 0 && total > 0 && (
                                            <span className={`total-diff ${parDiff > 0 ? 'over' : 'under'}`}>
                                                {parDiff > 0 ? `+${parDiff}` : parDiff}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="live-scoreboard">
            <div className="scoreboard-title">
                <h2>🏌️ {course.name} - Live Scoreboard 🏌️</h2>
            </div>

            <div className="scoreboard-grid">
                {renderNine(frontNine, "Front 9")}
                {renderNine(backNine, "Back 9")}
            </div>

            <div className="scoreboard-legend">
                <div className="legend-item eagle">Eagle or better</div>
                <div className="legend-item birdie">Birdie</div>
                <div className="legend-item par">Par</div>
                <div className="legend-item bogey">Bogey</div>
                <div className="legend-item double-bogey">Double Bogey+</div>
            </div>
        </div>
    );
}
