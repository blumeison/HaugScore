import React, { useState, useEffect } from 'react';
import Wheel from './Wheel';
import VideoCall from './VideoCall';
import LiveScoreboard from './LiveScoreboard';
import { startScreenRecording } from '../utils/recorder';

const WHEEL_OPTIONS = [
    "Driver", "Wood", "6 Iron", "8 Iron", "P Wedge", "Lob Wedge", "Putter"
];

const SCORE_BUTTONS = [
    { label: 'HIO', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '🍺 Shot', value: 8 },
];

export default function MainView({ gameState, myTeamId, onUpdateScore, onWheelRequest, onWheelReady, onWheelDone, onOpenSetup, wheelAlert, wheelSpin, onResetGame }) {
    const [showWheel, setShowWheel] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedScore, setSelectedScore] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isImageExpanded, setIsImageExpanded] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [userDismissed, setUserDismissed] = useState(false);

    const myTeam = gameState.teams.find(t => t.id === myTeamId);

    // Consolidate active challenge source
    const activeChallenge = wheelAlert || gameState.activeChallenge;

    // Determine if I am involved in the challenge
    const isSourceTeam = activeChallenge?.sourceTeam?.id === myTeamId;
    const isTargetTeam = activeChallenge?.targetTeam?.id === myTeamId;
    const isParticipant = isSourceTeam || isTargetTeam;

    const handleToggleRecording = async () => {
        if (isRecording && mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setMediaRecorder(null);
        } else {
            const result = await startScreenRecording();
            if (result) {
                setIsRecording(true);
                setMediaRecorder(result.mediaRecorder);

                // Auto-stop when stream ends (e.g. user clicks "Stop Sharing" in browser UI)
                result.mediaRecorder.stream.getVideoTracks()[0].onended = () => {
                    setIsRecording(false);
                    setMediaRecorder(null);
                };
            }
        }
    };

    const standings = [...gameState.teams].sort((a, b) => {
        const scoreA = Object.values(a.scores).reduce((sum, s) => sum + s, 0);
        const scoreB = Object.values(b.scores).reduce((sum, s) => sum + s, 0);
        return scoreA - scoreB;
    });

    const currentHole = myTeam?.currentHole || 1;
    const currentPar = gameState.course.holes[currentHole - 1]?.par || 4;

    const audioRef = React.useRef(null);

    useEffect(() => {
        // Sync local state with server state (for reconnections)
        if (gameState.activeChallenge) {
            // Check if this team has already dismissed on the server
            const myTeamAlreadyDismissed = gameState.activeChallenge.dismissedBy?.includes(myTeamId);

            // Only show if user hasn't explicitly dismissed it AND server says we haven't dismissed
            if (!userDismissed && !myTeamAlreadyDismissed) {
                setShowWheel(true);
            } else if (myTeamAlreadyDismissed && !userDismissed) {
                // If server says we dismissed but local state doesn't know, sync it
                setUserDismissed(true);
                setShowWheel(false);
                setShowVideo(false);
            }

            // If status is 'spinning', ensure we show that state
            // BUT only if we haven't spun locally yet
            if (gameState.activeChallenge.status === 'spinning' && !hasSpun && !isSpinning && !myTeamAlreadyDismissed) {
                setIsSpinning(true);
            }

            if (isParticipant && !userDismissed && !myTeamAlreadyDismissed) {
                setShowVideo(true);
            }
        } else {
            // If server says no challenge, close local (unless we are just finishing up)
            if (!isSpinning) {
                setShowWheel(false);
                setShowVideo(false);
                setHasSpun(false);
                setUserDismissed(false);
            }
        }
    }, [gameState.activeChallenge, isParticipant, hasSpun, isSpinning, userDismissed, myTeamId]);

    useEffect(() => {
        if (wheelAlert) {
            setShowWheel(true);
            setUserDismissed(false); // New alert, reset dismissal
            if (isParticipant) {
                setShowVideo(true);
            }
            playJingle();
        }
    }, [wheelAlert, isParticipant]);

    useEffect(() => {
        if (wheelSpin && showWheel) {
            setIsSpinning(true);
            fadeOutJingle();
        }
    }, [wheelSpin, showWheel]);

    const playJingle = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/spin_me_round.mp3');
        }
        const audio = audioRef.current;
        audio.currentTime = 0;
        audio.volume = 0.7;
        audio.play().catch(e => console.error("Audio play failed:", e));
    };

    const fadeOutJingle = () => {
        const audio = audioRef.current;
        if (!audio) return;

        const fadeInterval = setInterval(() => {
            if (audio.volume > 0.05) {
                audio.volume -= 0.05;
            } else {
                audio.pause();
                audio.currentTime = 0;
                clearInterval(fadeInterval);
            }
        }, 100); // Fade out over ~1.4 seconds
    };

    const handleScoreSelect = (score) => {
        setSelectedScore(score);
    };

    const handleSubmit = () => {
        if (selectedScore !== null) {
            onUpdateScore(myTeamId, currentHole, selectedScore);
            setSelectedScore(null);
        }
    };

    const handleSpinComplete = () => {
        setIsSpinning(false);
        setHasSpun(true);
        // Removed auto-close timeout. User must manually close.
    };

    const handleCloseOverlay = () => {
        setShowWheel(false);
        setShowVideo(false);
        setUserDismissed(true); // Mark as dismissed so it doesn't pop back up
        // Do NOT reset hasSpun here, wait for server clear

        // Notify server we are done
        if (onWheelDone) {
            onWheelDone(myTeamId);
        }

        // Stop recording if active
        if (isRecording && mediaRecorder) {
            handleToggleRecording();
        }
    };

    const renderWheelStatus = () => {
        if (!myTeam) return null;

        // Logic mirroring server/game.js prepareWheelSpin
        const sourceHolesPlayed = Object.keys(myTeam.scores || {}).length;
        const allTeams = gameState.teams;
        const commonHoles = [];
        for (let hole = 1; hole <= 18; hole++) {
            if (allTeams.every(team => team.scores && team.scores[hole] !== undefined)) {
                commonHoles.push(hole);
            }
        }

        // Rule 1: Hole completion requirement
        const unlockHole = gameState.wheelUnlocksAfterHole || 3;
        if (sourceHolesPlayed < unlockHole) {
            return (
                <div className="wheel-status status-locked">
                    🔒 Wheel unlocks after Hole {unlockHole}
                </div>
            );
        }

        // Rule 2: Max spins
        const mySpins = gameState.log.filter(entry => entry.includes(`${myTeam.name} initiated spin`)).length;
        if (mySpins >= 2) {
            return (
                <div className="wheel-status status-locked">
                    ❌ Max 2 spins used
                </div>
            );
        }

        // Rule 3: Common holes
        if (commonHoles.length === 0) {
            return (
                <div className="wheel-status status-waiting">
                    ⏳ Waiting for other teams to finish holes...
                </div>
            );
        }

        // Rule 4: Deficit calculation
        const scoresOnCommonHoles = allTeams.map(team => ({
            team,
            score: commonHoles.reduce((sum, hole) => sum + (team.scores[hole] || 0), 0)
        }));
        scoresOnCommonHoles.sort((a, b) => a.score - b.score);
        const leader = scoresOnCommonHoles[0];
        const myScoreObj = scoresOnCommonHoles.find(s => s.team.id === myTeamId);

        if (!myScoreObj) return null;

        const deficit = myScoreObj.score - leader.score;

        // Leading or Tied
        if (myTeamId === leader.team.id || deficit === 0) {
            return (
                <div className="wheel-status status-good">
                    👑 You are in the lead (or tied)! No wheel needed.
                </div>
            );
        }

        // Not enough deficit
        if (deficit < 3) {
            return (
                <div className="wheel-status status-waiting">
                    📉 Deficit: {deficit} (Need 3+ to spin)
                </div>
            );
        }

        // Eligible!
        return (
            <div className="wheel-request">
                <button className="btn btn-pink" onClick={() => onWheelRequest(myTeamId)}>
                    🎯 Challenge Leader with Wheel!
                </button>
            </div>
        );
    };

    // Check if my team is eligible for the wheel
    const getWheelEligibility = () => {
        if (!myTeam) return { eligible: false, reason: '' };

        const sourceHolesPlayed = Object.keys(myTeam.scores || {}).length;
        const allTeams = gameState.teams;
        const commonHoles = [];
        for (let hole = 1; hole <= 18; hole++) {
            if (allTeams.every(team => team.scores && team.scores[hole] !== undefined)) {
                commonHoles.push(hole);
            }
        }

        // Rule 1: Hole completion requirement
        const unlockHole = gameState.wheelUnlocksAfterHole || 3;
        if (sourceHolesPlayed < unlockHole) {
            return { eligible: false, reason: `🔒 Wheel unlocks after Hole ${unlockHole}` };
        }

        // Rule 2: Max spins
        const mySpins = gameState.log.filter(entry => entry.includes(`${myTeam.name} initiated spin`)).length;
        if (mySpins >= 2) {
            return { eligible: false, reason: '❌ Max 2 spins used' };
        }

        // Rule 2.5: One spin per hole
        <div className="main-view">
            {/* Header */}
            <div className="flex justify-end items-center mb-4">
                <button className="setup-btn" onClick={onOpenSetup} title="Team Setup">
                    ⚙️
                </button>
            </div>

            {/* Team Header - Interactive when wheel eligible */}
            <div
                className={`team-header ${wheelEligibility.eligible ? 'wheel-eligible' : ''}`}
                onClick={wheelEligibility.eligible ? () => onWheelRequest(myTeamId) : undefined}
                style={{ cursor: wheelEligibility.eligible ? 'pointer' : 'default' }}
            >
                {myTeam?.logo ? (
                    <img src={myTeam.logo} alt={myTeam.name} className="team-logo-large" />
                ) : (
                    <div className="team-logo-large" style={{ background: myTeam?.color }}></div>
                )}
                <h1>{myTeam?.name}</h1>
                {wheelEligibility.reason && (
                    <div className={`wheel-status-badge ${wheelEligibility.eligible ? 'eligible' : 'not-eligible'}`}>
                        {wheelEligibility.reason}
                    </div>
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

                {/* Course Name (Top Left) */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                    pointerEvents: 'none'
                }}>
                    <h3 style={{
                        margin: 0,
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        {gameState.course?.name || "Course Waldviertel"}
                    </h3>
                </div>

                {/* Hole Info (Bottom) */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
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
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                    onClick={() => setIsImageExpanded(false)}
                >
                    <img
                        src={gameState.course?.holes[currentHole - 1]?.image || "/images/default_hole.jpg"}
                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/default_hole.jpg"; }}
                        alt={`Hole ${currentHole} Full View`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: '0.5rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    />
                    <button
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            fontSize: '2rem',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            borderRadius: '50%'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Scorecard */}
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
                            const totalPar = Object.keys(t.scores).length * 4;
                            const relativeScore = totalScore - totalPar;
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
                                        {t.activeEffects.length > 0 && (
                                            <span title={t.activeEffects[0]?.name}>🎡</span>
                                        )}
                                    </td>
                                    <td>{holesPlayed}</td>
                                    <td className={relativeScore > 0 ? 'over-par' : relativeScore < 0 ? 'under-par' : 'even-par'}>
                                        {relativeScore > 0 ? `+${relativeScore}` : relativeScore === 0 ? 'E' : relativeScore}
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
                    <button
                        className="btn btn-green submit-btn"
                        onClick={handleSubmit}
                    >
                        ✓ SUBMIT SCORE: {selectedScore}
                    </button>
                )}
            </div>

            {/* Wheel Section */}
            {showWheel && (
                <div className="wheel-overlay">
                    <div className={`wheel-container ${showVideo ? 'with-video' : ''}`}>
                        <div className="wheel-content">
                            <h2>🎡 WHEEL OF NOT IDEAL 🎡</h2>

                            {activeChallenge && isSourceTeam && !wheelSpin && !isSpinning && (
                                <div className="wheel-waiting">
                                    <p>Waiting for {activeChallenge.targetTeam.name} to get ready...</p>
                                    <div className="spinner"></div>
                                </div>
                            )}

                            {activeChallenge && isTargetTeam && !wheelSpin && !isSpinning && (
                                <div className="wheel-alert">
                                    <h2 className="flashing-text">
                                        ⚠️ {activeChallenge.sourceTeam.name} IS SPINNING! ⚠️
                                    </h2>
                                    <p>Gather around the cart!</p>
                                    <button
                                        className="btn btn-pink btn-huge"
                                        onClick={() => onWheelReady(myTeamId)}
                                    >
                                        WE'RE READY! 🎬
                                    </button>
                                </div>
                            )}

                            {(wheelSpin || isSpinning) && (
                                <div>
                                    <Wheel
                                        options={WHEEL_OPTIONS}
                                        spinning={isSpinning}
                                        result={activeChallenge?.spinResult}
                                        onSpinComplete={handleSpinComplete}
                                    />
                                    {!isSpinning && activeChallenge && (
                                        <div className="wheel-result">
                                            <p>
                                                <strong>{activeChallenge.targetTeam.name}</strong> must use: <strong>{activeChallenge.spinResult}</strong>!
                                            </p>
                                            <button
                                                className="btn btn-blue"
                                                style={{ marginTop: '1rem' }}
                                                onClick={handleCloseOverlay}
                                            >
                                                ✅ Done / Close
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Video Toggle Button (only if not already showing) */}
                            {(activeChallenge && isParticipant) && (
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    {!showVideo && (
                                        <button
                                            className="btn"
                                            style={{ background: '#6366f1' }}
                                            onClick={() => setShowVideo(true)}
                                        >
                                            🎥 Open Live Video
                                        </button>
                                    )}

                                    <button
                                        className="btn"
                                        style={{ background: isRecording ? '#ef4444' : '#10b981' }}
                                        onClick={handleToggleRecording}
                                    >
                                        {isRecording ? '⏹ Stop Rec' : '🔴 Record Spin'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Embedded Video Section */}
                        {showVideo && (
                            <div className="video-section">
                                <VideoCall
                                    roomName="HaugScore-Live-Wheel-Room"
                                    displayName={myTeam?.name || "Spectator"}
                                    onLeave={() => setShowVideo(false)}
                                    embedded={true}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Live Scoreboard */}
            <LiveScoreboard gameState={gameState} myTeamId={myTeamId} />
        </div>
    );
}
