import React from 'react';

export default function WelcomeScreen({ onJoinGame, onGameMaster }) {
    return (
        <div className="welcome-screen" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                ⛳️ HaugScore
            </h1>
            <p style={{ fontSize: '1.5rem', marginBottom: '4rem', opacity: 0.8 }}>
                The Ultimate Golf Scramble Companion
            </p>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={onJoinGame}
                    className="btn"
                    style={{
                        padding: '2rem 4rem',
                        fontSize: '2rem',
                        background: 'linear-gradient(to right, #22c55e, #16a34a)',
                        boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)',
                        border: 'none',
                        borderRadius: '1rem',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    🏌️‍♂️ Join Game
                </button>

                <button
                    onClick={onGameMaster}
                    className="btn"
                    style={{
                        padding: '2rem 4rem',
                        fontSize: '2rem',
                        background: 'linear-gradient(to right, #6366f1, #4f46e5)',
                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                        border: 'none',
                        borderRadius: '1rem',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    👑 Game Master
                </button>
            </div>
        </div>
    );
}
