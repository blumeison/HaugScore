import React, { useState, useEffect } from 'react';
import TournamentSection from './TournamentSection';

export default function GameMasterDashboard({ gameState, onUpdateTeam, onResetGame, onSetCourse, onSetTeamCount, onUpdatePlayer, onSetPlayerApproval, onDeletePlayer, tournamentOps, onExit }) {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [editName, setEditName] = useState('');
    const [editLogo, setEditLogo] = useState(null);
    const [archives, setArchives] = useState([]);
    const [selectedArchive, setSelectedArchive] = useState(null);
    const [showArchives, setShowArchives] = useState(false);

    useEffect(() => {
        loadArchives();
    }, []);

    const SERVER_URL = import.meta.env.VITE_SERVER_URL
        || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const loadArchives = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/archives`);
            const data = await response.json();
            setArchives(data);
        } catch (error) {
            console.error('Failed to load archives:', error);
        }
    };

    const viewArchive = async (filename) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/archives/${filename}`);
            const data = await response.json();
            setSelectedArchive(data);
        } catch (error) {
            console.error('Failed to load archive:', error);
        }
    };

    const handleCourseChange = (e) => {
        onSetCourse(e.target.value);
    };

    const handleTeamCountChange = (e) => {
        onSetTeamCount(parseInt(e.target.value));
    };

    const roundActive = gameState.teams.some(team => Object.keys(team.scores || {}).length > 0);

    const startEditTeam = (team) => {
        setEditingTeam(team);
        setEditName(team.name);
        setEditLogo(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditLogo(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveTeam = () => {
        if (editingTeam) {
            onUpdateTeam(editingTeam.id, editName, editLogo);
            setEditingTeam(null);
        }
    };

    const handleResetGame = () => {
        onResetGame();
        setShowResetConfirm(false);
        setTimeout(() => loadArchives(), 500);
    };

    const formatArchiveName = (archive) => {
        const date = new Date(archive.metadata.archivedAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${archive.metadata.course} - ${dateStr} ${timeStr}`;
    };

    return (
        <div className="gm-dashboard" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
            <div className="flex justify-between items-center mb-8">
                <h1>👑 Game Master Dashboard</h1>
                <button onClick={onExit} className="btn" style={{ background: '#475569' }}>Exit</button>
            </div>

            {/* Game Configuration */}
            <div className="card mb-8" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-emerald-400 m-0">⚙️ Game Setup</h2>
                    {roundActive && (
                        <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded border border-yellow-700">
                            🔒 Settings locked while round is active
                        </span>
                    )}
                </div>

                <div className="grid gap-6">
                    <div>
                        <label className="block mb-2 font-bold">Select Course</label>
                        <select
                            value={gameState.course?.id || 'waldviertel'}
                            onChange={handleCourseChange}
                            disabled={roundActive}
                            className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={roundActive ? "Reset game to change course" : ""}
                        >
                            <option value="waldviertel">🌲 Course Waldviertel (Par 72)</option>
                            <option value="haugschlag">⛳ Course Haugschlag (Par 72)</option>
                            <option value="monachus">🇨🇿 Course Monachus (Par 73)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">Number of Teams</label>
                        <select
                            value={gameState.teams.length}
                            onChange={handleTeamCountChange}
                            disabled={roundActive}
                            className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={roundActive ? "Reset game to change team count" : ""}
                        >
                            <option value={2}>2 Teams</option>
                            <option value={3}>3 Teams</option>
                            <option value={4}>4 Teams</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Past Rounds */}
            <div className="card mb-8" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-purple-400">📜 Past Rounds ({archives.length})</h2>
                    <button
                        onClick={() => { setShowArchives(!showArchives); if (!showArchives) loadArchives(); }}
                        className="btn btn-sm"
                        style={{ background: '#7c3aed' }}
                    >
                        {showArchives ? 'Hide' : 'View'}
                    </button>
                </div>

                {showArchives && (
                    <div className="grid gap-3">
                        {archives.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No past rounds yet. Reset a game to create an archive!</p>
                        ) : (
                            archives.map(archive => (
                                <div
                                    key={archive.filename}
                                    className="p-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg cursor-pointer hover:from-slate-600 hover:to-slate-500 transition-all border border-slate-500"
                                    onClick={() => viewArchive(archive.filename)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="font-bold text-lg text-white mb-1">
                                                {formatArchiveName(archive)}
                                            </div>
                                            <div className="flex gap-4 text-sm text-gray-300">
                                                <span>🏆 Winner: <span className="text-emerald-400 font-semibold">{archive.summary.winner}</span></span>
                                                <span>📊 Score: <span className="font-semibold">{archive.summary.winningScore}</span></span>
                                                <span>⛳ Holes: <span className="font-semibold">{archive.summary.holesCompleted}</span></span>
                                            </div>
                                        </div>
                                        <div className="text-3xl">📊</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Team Management */}
            <div className="card mb-8" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
                <h2 className="mb-4 text-blue-400">👥 Manage Teams</h2>

                <div className="grid gap-4">
                    {gameState.teams.map(team => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                            <div className="flex items-center gap-3">
                                {team.logo ? (
                                    <img src={team.logo} alt={team.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
                                )}
                                <span className="font-bold">{team.name}</span>
                            </div>
                            <button
                                onClick={() => startEditTeam(team)}
                                className="btn btn-sm"
                                style={{ background: '#3b82f6' }}
                            >
                                ✏️ Edit
                            </button>
                        </div>
                    ))}
                </div>

                {/* Edit Modal */}
                {editingTeam && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-slate-800 p-6 rounded-xl w-96">
                            <h3 className="mb-4">Edit {editingTeam.name}</h3>
                            <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full p-2 mb-4 rounded bg-slate-700 text-white"
                                placeholder="Team Name"
                            />
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full mb-4"
                            />
                            <div className="flex gap-2">
                                <button onClick={saveTeam} className="btn btn-green flex-1">Save</button>
                                <button onClick={() => setEditingTeam(null)} className="btn bg-slate-600 flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* HCP Stableford Tournament management */}
            <TournamentSection
                tournaments={gameState.tournaments || []}
                tournamentOps={tournamentOps}
                courses={gameState.courses || {}}
                players={gameState.players || []}
            />

            {/* Players (HCP tournament roster) — pending first, then approved */}
            <PlayersSection
                players={gameState.players || []}
                onUpdatePlayer={onUpdatePlayer}
                onSetPlayerApproval={onSetPlayerApproval}
                onDeletePlayer={onDeletePlayer}
            />

            {/* Danger Zone */}
            <div className="card" style={{ background: '#450a0a', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #ef4444' }}>
                <h2 className="mb-4 text-red-400">⚠️ Danger Zone</h2>

                {!showResetConfirm ? (
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="btn w-full"
                        style={{ background: '#ef4444', fontWeight: ' bold' }}
                    >
                        ☢️ RESET GAME
                    </button>
                ) : (
                    <div className="text-center">
                        <p className="mb-4 font-bold text-white">Are you absolutely sure? This will wipe ALL scores!</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="btn flex-1 bg-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetGame}
                                className="btn flex-1 bg-red-600 font-bold"
                            >
                                YES, WIPE IT
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Archive Viewer - SIMPLE VERSION without modal for now */}
            {selectedArchive && (
                <div className="fixed inset-0 bg-black/95 z-50 overflow-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        <button
                            onClick={() => setSelectedArchive(null)}
                            className="mb-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
                        >
                            ✕ Close
                        </button>

                        <div className="bg-slate-800 p-6 rounded-xl">
                            <h2 className="text-3xl font-bold text-white mb-4">{formatArchiveName(selectedArchive)}</h2>

                            <div className="flex gap-6 mb-6 text-lg">
                                <span>🏆 Winner: <strong className="text-emerald-400">{selectedArchive.summary.winner}</strong></span>
                                <span>📊 Score: <strong>{selectedArchive.summary.winningScore}</strong></span>
                                <span>⛳ Holes: <strong>{selectedArchive.summary.holesCompleted}</strong></span>
                            </div>

                            <div className="text-gray-400">
                                <p>Archive viewer coming soon! Scorecard and details will be displayed here.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Players roster (pending first, then approved) ──────────────────────────
function PlayersSection({ players, onUpdatePlayer, onSetPlayerApproval, onDeletePlayer }) {
    // Pending first, then by name
    const sorted = [...players].sort((a, b) => {
        if (!!a.approved !== !!b.approved) return a.approved ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '');
    });

    const pendingCount = players.filter(p => !p.approved).length;

    return (
        <div className="card mb-8" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-pink-400 m-0">🎟️ Players ({players.length})</h2>
                {pendingCount > 0 && (
                    <span className="text-xs bg-sky-900 text-sky-200 px-2 py-1 rounded border border-sky-700">
                        {pendingCount} pending approval
                    </span>
                )}
            </div>

            {players.length === 0 ? (
                <p className="text-gray-400 text-center py-4" style={{ margin: 0 }}>
                    No players yet. Players appear here after they sign in with Google.
                </p>
            ) : (
                <div className="grid gap-2">
                    {sorted.map(p => (
                        <PlayerRow
                            key={p.sub}
                            player={p}
                            onUpdatePlayer={onUpdatePlayer}
                            onSetPlayerApproval={onSetPlayerApproval}
                            onDeletePlayer={onDeletePlayer}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function PlayerRow({ player, onUpdatePlayer, onSetPlayerApproval, onDeletePlayer }) {
    const [hcp, setHcp] = useState(player.hcp ?? '');
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => { setHcp(player.hcp ?? ''); }, [player.hcp]);

    const commitHcp = () => {
        if (hcp === '' || hcp === null) return;
        const n = parseFloat(hcp);
        if (isNaN(n) || n < 0 || n > 54) {
            setHcp(player.hcp ?? '');
            return;
        }
        if (n !== player.hcp) onUpdatePlayer({ sub: player.sub, hcp: n });
    };

    return (
        <div
            className="p-3 bg-slate-700 rounded"
            style={{
                borderLeft: player.approved ? '3px solid #22c55e' : '3px solid #0ea5e9',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
            }}
        >
            {/* Avatar */}
            {player.logo ? (
                <img src={player.logo} alt={player.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>
                    {(player.name || '?').charAt(0).toUpperCase()}
                </div>
            )}

            {/* Identity — takes remaining space, truncates cleanly */}
            <div style={{ minWidth: 0, flex: '1 1 180px' }}>
                <div className="font-bold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.name}
                    {!player.approved && (
                        <span className="text-xs" style={{ marginLeft: '0.5rem', background: '#0ea5e944', color: '#0ea5e9', padding: '0.15rem 0.5rem', borderRadius: '0.5rem' }}>
                            pending
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-400" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.email}
                </div>
            </div>

            {/* Controls — wrap as a group onto a new line on narrow screens */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: 'auto' }}>
                <label className="text-xs text-gray-300">HCP</label>
                <input
                    type="text"
                    inputMode="decimal"
                    value={hcp}
                    onChange={e => setHcp(e.target.value.replace(',', '.'))}
                    onBlur={commitHcp}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="p-1 rounded bg-slate-800 text-white border border-slate-600"
                    style={{ width: '4rem', textAlign: 'center' }}
                    placeholder="—"
                />

                <button
                    onClick={() => onSetPlayerApproval(player.sub, !player.approved)}
                    className="btn btn-sm"
                    style={{ background: player.approved ? '#475569' : '#22c55e', whiteSpace: 'nowrap' }}
                    title={player.approved ? 'Revoke approval' : 'Approve for scramble'}
                >
                    {player.approved ? '↩ Revoke' : '✓ Approve'}
                </button>

                {confirmDelete ? (
                    <>
                        <button
                            onClick={() => { onDeletePlayer(player.sub); setConfirmDelete(false); }}
                            className="btn btn-sm"
                            style={{ background: '#dc2626', whiteSpace: 'nowrap' }}
                            title="Confirm delete"
                        >
                            Sure?
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="btn btn-sm"
                            style={{ background: '#475569' }}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="btn btn-sm"
                        style={{ background: '#7f1d1d' }}
                        title="Delete player"
                    >
                        🗑
                    </button>
                )}
            </div>
        </div>
    );
}
