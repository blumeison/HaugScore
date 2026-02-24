import React from 'react';

export default function Dashboard({ gameState }) {
    const { teams } = gameState;

    const sortedTeams = [...teams].sort((a, b) => {
        const scoreA = Object.values(a.scores).reduce((sum, s) => sum + s, 0);
        const scoreB = Object.values(b.scores).reduce((sum, s) => sum + s, 0);
        return scoreA - scoreB;
    });

    return (
        <div className="dashboard">
            <h1>🏆 HaugScore Live</h1>

            <div className="card">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>Thru</th>
                            <th>Score</th>
                            <th>Effects</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTeams.map((t, i) => {
                            const totalScore = Object.values(t.scores).reduce((sum, s) => sum + s, 0);
                            const holesPlayed = Object.keys(t.scores).length;

                            return (
                                <tr key={t.id} className={t.activeEffects.length > 0 ? 'active-effect' : ''}>
                                    <td>{i + 1}</td>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {t.logo ? (
                                            <img src={t.logo} alt={t.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: t.color }}></div>
                                        )}
                                        {t.name}
                                    </td>
                                    <td>{holesPlayed}</td>
                                    <td>{totalScore > 0 ? `+${totalScore}` : totalScore}</td>
                                    <td>
                                        {t.activeEffects.map((e, idx) => (
                                            <span key={idx} title={`${e.name || e.id} from ${e.from}`}>
                                                {e.id === 'wheel_curse' ? '🎡' : '🐢'}
                                            </span>
                                        ))}
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
