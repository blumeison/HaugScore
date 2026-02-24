import React, { useState, useEffect } from 'react';

export default function TeamSelector({ gameState, onSelectTeam }) {
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        // Check localStorage
        const savedTeamId = localStorage.getItem('myTeamId');
        if (savedTeamId) {
            setSelectedId(parseInt(savedTeamId));
            onSelectTeam(parseInt(savedTeamId));
        }
    }, []);

    const handleSelect = (teamId) => {
        setSelectedId(teamId);
        localStorage.setItem('myTeamId', teamId);
        onSelectTeam(teamId);
    };

    if (selectedId) return null; // Hide once selected

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <h1>🏌️ Select Your Team</h1>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                {gameState.teams.map(t => (
                    <button
                        key={t.id}
                        onClick={() => handleSelect(t.id)}
                        className="btn"
                        style={{
                            background: t.color,
                            padding: '2rem 3rem',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        {t.logo ? (
                            <img src={t.logo} alt={t.name} style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '1rem' }} />
                        ) : (
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#fff', margin: '0 auto 1rem' }}></div>
                        )}
                        <div>{t.name}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
