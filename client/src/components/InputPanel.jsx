import React, { useState, useEffect } from 'react';
import Wheel from './Wheel';

const WHEEL_OPTIONS = [
    "Driver", "Wood", "6 Iron", "8 Iron", "P Wedge", "Lob Wedge", "Putter"
];

export default function InputPanel({ gameState, myTeamId, onUpdateScore, onUseItem, onWheelRequest, onWheelReady, wheelAlert, wheelSpin }) {
    const [selectedHole, setSelectedHole] = useState(1);
    const [score, setScore] = useState(4);
    const [showWheel, setShowWheel] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);

    const myTeam = gameState.teams.find(t => t.id === myTeamId);
    const standings = [...gameState.teams].sort((a, b) => {
        const scoreA = Object.values(a.scores).reduce((sum, s) => sum + s, 0);
        const scoreB = Object.values(b.scores).reduce((sum, s) => sum + s, 0);
        return scoreA - scoreB;
    });

    const amLastPlace = standings[standings.length - 1]?.id === myTeamId;
    const amFirstPlace = standings[0]?.id === myTeamId;

    // Show wheel when alert comes
    useEffect(() => {
        if (wheelAlert) {
            setShowWheel(true);
            // Play sound
            playNotificationSound();
        }
    }, [wheelAlert]);

    // Start spinning when ready signal comes
    useEffect(() => {
        if (wheelSpin && showWheel) {
            setIsSpinning(true);
        }
    }, [wheelSpin, showWheel]);

    const playNotificationSound = () => {
        // Placeholder: Use Web Audio API to generate beep
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        oscillator.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdateScore(myTeamId, selectedHole, score);
    };

    const handleItemUse = (itemId) => {
        const targetId = myTeamId === 3 ? 1 : myTeamId + 1;
        onUseItem(myTeamId, targetId, itemId);
    };

    const handleWheelRequest = () => {
        onWheelRequest(myTeamId);
    };

    const handleWheelReady = () => {
        onWheelReady(myTeamId);
        playNotificationSound();
    };

    const handleSpinComplete = () => {
        setIsSpinning(false);
        setTimeout(() => setShowWheel(false), 3000);
    };

    return (
        <div className="input-panel">
            <h2>📝 {myTeam?.name} Panel</h2>

            <div className="card">
                <form onSubmit={handleSubmit} className="grid">
                    <div>
                        <label>Hole: </label>
                        <select value={selectedHole} onChange={e => setSelectedHole(Number(e.target.value))}>
                            {gameState.course.holes.map(h => (
                                <option key={h.number} value={h.number}>{h.number} (Par {h.par})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Score: </label>
                        <input
                            type="number"
                            value={score}
                            onChange={e => setScore(Number(e.target.value))}
                            onFocus={e => e.target.select()}
                            min="1" max="15"
                        />
                    </div>

                    <button type="submit" className="btn btn-green">Submit Score</button>
                </form>
            </div>

            <div className="card">
                <h3>🎒 Inventory</h3>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <button className="btn btn-pink" onClick={() => handleItemUse('turtle')}>🐢 Turtle</button>
                    <button className="btn" onClick={() => handleItemUse('banana')}>🍌 Banana</button>
                    <button className="btn" onClick={() => handleItemUse('mushroom')}>🍄 Boost</button>
                </div>
            </div>

            {/* Wheel Section */}
            {showWheel ? (
                <div className="card" style={{ borderColor: '#ec4899', animation: amFirstPlace ? 'pulse 1s infinite' : 'none' }}>
                    <h3>🎡 WHEEL OF NOT IDEAL</h3>

                    {wheelAlert && amFirstPlace && !wheelSpin && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <h2 style={{ color: '#ec4899', animation: 'pulse 1s infinite' }}>
                                ⚠️ {wheelAlert.sourceTeam.name} IS SPINNING! ⚠️
                            </h2>
                            <p>Gather around the cart!</p>
                            <button
                                className="btn btn-pink"
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem', width: '100%' }}
                                onClick={handleWheelReady}
                            >
                                WE'RE READY! 🎬
                            </button>
                        </div>
                    )}

                    {wheelAlert && amLastPlace && !wheelSpin && (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <p style={{ fontSize: '1.2rem' }}>Waiting for {wheelAlert.targetTeam.name} to get ready...</p>
                            <div className="spinner" style={{ margin: '1rem auto', width: '50px', height: '50px', border: '5px solid #ccc', borderTop: '5px solid #ec4899', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        </div>
                    )}

                    {wheelSpin && (
                        <div>
                            <Wheel
                                options={WHEEL_OPTIONS}
                                spinning={isSpinning}
                                result={wheelAlert?.spinResult}
                                onSpinComplete={handleSpinComplete}
                            />
                            {!isSpinning && wheelAlert && (
                                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>
                                    Result: {wheelAlert.spinResult} for {wheelAlert.targetTeam.name}!
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                amLastPlace && !amFirstPlace && (
                    <div className="card" style={{ borderColor: '#ec4899' }}>
                        <h3>🎡 Wheel of Not Ideal</h3>
                        <p>You're in last place! Challenge the leader!</p>
                        <button className="btn btn-pink" style={{ width: '100%' }} onClick={handleWheelRequest}>
                            REQUEST SPIN 🎯
                        </button>
                    </div>
                )
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button className="btn" style={{ backgroundColor: '#ef4444' }} onClick={() => {
                    if (confirm('Are you sure you want to reset the game?')) {
                        fetch('http://localhost:3001/api/reset', { method: 'POST' });
                    }
                }}>
                    ⚠️ Reset Game
                </button>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
