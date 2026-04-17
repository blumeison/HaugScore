import React, { useState } from 'react';
import LiveScoreboard from './LiveScoreboard';

const SCORE_BUTTONS = [
    { label: 'HIO', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8+', value: 8 },
];

export default function MainView({ gameState, myTeamId, onUpdateScore, onOpenSetup }) {
    const [selectedScore, setSelectedScore] = useState(null);
    const [isImageExpanded, setIsImageExpanded] = useState(false);

    const myTeam = gameState.teams.find(t => t.id === myTeamId);

    const standings = [...gameState.teams].sort((a, b) => {
        // Sort by relative-to-par on common holes, fall back to total strokes
        const parForPlayed = (team) => Object.keys(team.scores)
            .reduce((sum, holeNum) => {
                const hole = gameState.course.holes.find(h => h.number === parseInt(holeNum));
                return sum + (hole ? hole.par : 4);
            }, 0);
        const relA = Object.values(a.scores).reduce((s, v) => s + v, 0) - parForPlayed(a);
        const relB = Object.values(b.scores).reduce((s, v) => s + v, 0) - parForPlayed(b);
        if (relA !== relB) return relA - relB;
        return Object.keys(b.scores).length - Object.keys(a.scores).length;
    });

    const myRank = standings.findIndex(t => t.id === myTeamId) + 1;
    const rankBadge = myRank === 1 ? '🥇 1st place' : myRank === 2 ? '🥈 2nd place' : myRank === 3 ? '🥉 3rd place' : `#${myRank}`;

    const currentHole = myTeam?.currentHole || 1;
    const currentPar = gameState.course.holes[currentHole - 1]?.par || 4;

    const handleScoreSelect = (score) => setSelectedScore(score);

    const handleSubmit = () => {
        if (selectedScore !== null) {
            onUpdateScore(myTeamId, currentHole, selectedScore);
            setSelectedScore(null);
        }
    };

    return (
        <div className="main-view">
            {/* Header */}
            <div className="flex justify-end items-center mb-4">
                <button className="setup-btn" onClick={onOpenSetup} title="Team Setup">
                    ⚙️
                </button>
            </div>

            {/* Team Header */}
            <div className="team-header">
                {myTeam?.logo ? (
                    <img src={myTeam.logo} alt={myTeam.name} className="team-logo-large" />
                ) : (
                    <div className="team-logo-large" style={{ background: myTeam?.color }}></div>
                )}
                <h1>{myTeam?.name}</h1>
                {Object.keys(myTeam?.scores || {}).length > 0 && (
                    <div className="wheel-status-badge not-eligible">{rankBadge}</div>
                )}
            </div>

            {/* Hole Image & Info */}
            <div className="hole-info-card" style={{
                position: 'relative',
                marginBottom: '1.5rem',
                borderRadius: '1rem',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer'
            }} onClick={() => setIsImageExpanded(true)}>
                <img
                    src={gameState.course?.holes[currentHole - 1]?.image || "/images/default_hole.jpg"}
                    onError={(e) => { e.target.onerror = null; e.target.src = "/images/default_hole.jpg"; }}
                    alt={`Hole ${currentHole}`}
                    style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                />

                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                    pointerEvents: 'none'
                }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {gameState.course?.name || "Course"}
                    </h3>
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                    padding: '1.5rem 1rem 0.5rem',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Hole {currentHole}</h2>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Par {currentPar} • HCP {gameState.course?.holes[currentHole - 1]?.hcp}</p>
                    </div>
                    <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>🔍</span>
                </div>
            </div>

            {/* Expanded Image Overlay */}
            {isImageExpanded && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                    onClick={() => setIsImageExpanded(false)}
                >
                    <img
                        src={gameState.course?.holes[currentHole - 1]?.image || "/images/default_hole.jpg"}
                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/default_hole.jpg"; }}
                        alt={`Hole ${currentHole} Full View`}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '0.5rem' }}
                    />
                    <button style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                        fontSize: '2rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '50%'
                    }}>✕</button>
                </div>
            )}

            {/* Leaderboard */}
            <div className="scorecard">
                <h3>Leaderboard</h3>
                <table className="scorecard-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>Thru</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((t, i) => {
                            const totalScore = Object.values(t.scores).reduce((sum, s) => sum + s, 0);
                            const parForPlayed = Object.keys(t.scores).reduce((sum, holeNum) => {
                                const hole = gameState.course.holes.find(h => h.number === parseInt(holeNum));
                                return sum + (hole ? hole.par : 4);
                            }, 0);
                            const relativeScore = totalScore - parForPlayed;
                            const holesPlayed = Object.keys(t.scores).length;

                            return (
                                <tr key={t.id} className={t.id === myTeamId ? 'my-team-row' : ''}>
                                    <td>{i + 1}</td>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {t.logo ? (
                                            <img src={t.logo} alt={t.name} className="team-logo-small" />
                                        ) : (
                                            <div className="team-logo-small" style={{ background: t.color }}></div>
                                        )}
                                        {t.name}
                                    </td>
                                    <td>{holesPlayed}</td>
                                    <td className={relativeScore > 0 ? 'over-par' : relativeScore < 0 ? 'under-par' : 'even-par'}>
                                        {holesPlayed === 0 ? '-' : relativeScore > 0 ? `+${relativeScore}` : relativeScore === 0 ? 'E' : relativeScore}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Score Input */}
            <div className="score-input">
                <h2 style={{ margin: '0 0 1.5rem 0' }}>Hole {currentHole} - Par {currentPar}</h2>

                <div className="score-buttons">
                    {SCORE_BUTTONS.map(btn => (
                        <button
                            key={btn.value}
                            className={`score-btn ${selectedScore === btn.value ? 'score-btn-selected' : ''}`}
                            onClick={() => handleScoreSelect(btn.value)}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {selectedScore !== null && (
                    <button className="btn btn-green submit-btn" onClick={handleSubmit}>
                        ✓ SUBMIT SCORE: {selectedScore}
                    </button>
                )}
            </div>

            {/* Live Scoreboard */}
            <LiveScoreboard gameState={gameState} myTeamId={myTeamId} />
        </div>
    );
}
