import React, { useState, useEffect } from 'react';

// PlayerProfile: the signed-in user edits their own profile record.
// The server creates a stub record automatically on first sign-in (via
// upsertPlayerOnSignIn), so this screen always shows Edit mode — the only
// thing the user has to set is their HCP.

export default function PlayerProfile({ gameState, player, isApproved, hasProfile, onUpdatePlayer, onExit }) {
    const [name, setName] = useState(player?.name || '');
    const [hcp, setHcp] = useState(player?.hcp ?? '');
    const [logo, setLogo] = useState(null); // a freshly picked image (data URL)
    const [justSaved, setJustSaved] = useState(false);

    // Sync fields when server data arrives or player sub changes
    useEffect(() => {
        setName(player?.name || '');
        setHcp(player?.hcp ?? '');
    }, [player?.sub]);

    // Also sync when hcp/name change server-side (e.g. admin edit)
    useEffect(() => {
        if (player) {
            setName(player.name);
            setHcp(player.hcp ?? '');
        }
    }, [player?.name, player?.hcp]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setLogo(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const hcpNum = parseFloat(hcp);
        if (isNaN(hcpNum) || hcpNum < 0 || hcpNum > 54) return;

        // Only send logo if the user picked a new one (undefined = leave alone)
        onUpdatePlayer({
            name: name.trim(),
            logo: logo || undefined,
            hcp: hcpNum,
        });
        setLogo(null);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    };

    const otherPlayers = gameState.players.filter(p => p.sub !== player?.sub);
    const needsProfile = !hasProfile;

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            color: 'white',
            minHeight: '100vh',
        }}>
            <div className="flex justify-between items-center mb-6">
                <h1 style={{ margin: 0 }}>👤 Player Profile</h1>
                <button onClick={onExit} className="btn" style={{ background: '#475569' }}>Exit</button>
            </div>

            {/* Status pill */}
            {needsProfile ? (
                <StatusPill color="#f59e0b" icon="📝">
                    Set your handicap to complete your profile.
                </StatusPill>
            ) : !isApproved ? (
                <StatusPill color="#0ea5e9" icon="⏳">
                    Waiting for Game Master approval before you can join.
                </StatusPill>
            ) : (
                <StatusPill color="#22c55e" icon="✅">
                    You're approved. Head back to the welcome screen to Join a Game.
                </StatusPill>
            )}

            {/* My profile card */}
            <div className="card mb-6" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
                <h2 className="mb-4 text-emerald-400" style={{ marginTop: 0 }}>✏️ My Profile</h2>

                <form onSubmit={handleSave} className="grid gap-4">
                    <div>
                        <label className="block mb-2 font-bold">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">Handicap (HCP)</label>
                        <input
                            type="number"
                            value={hcp}
                            onChange={e => setHcp(e.target.value)}
                            placeholder="e.g. 18.5"
                            min="0"
                            max="54"
                            step="0.1"
                            className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600"
                            required
                            autoFocus={needsProfile}
                        />
                        <div className="text-xs text-gray-400 mt-1">Range 0–54, one decimal place</div>
                    </div>

                    <div>
                        <label className="block mb-2 font-bold">Profile Picture</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full"
                        />
                        {(logo || player?.logo) && (
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <img
                                    src={logo || player?.logo}
                                    alt="Preview"
                                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }}
                                />
                            </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                            Defaults to your Google picture; upload a new one to override.
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-green"
                        disabled={!name.trim() || hcp === '' || parseFloat(hcp) < 0 || parseFloat(hcp) > 54}
                        style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem' }}
                    >
                        {justSaved ? '✓ Saved!' : '💾 Save Changes'}
                    </button>
                </form>
            </div>

            {/* Other players roster */}
            <div className="card" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
                <h2 className="mb-4 text-blue-400" style={{ marginTop: 0 }}>
                    👥 Other Players ({otherPlayers.length})
                </h2>
                {otherPlayers.length === 0 ? (
                    <p className="text-gray-400" style={{ margin: 0 }}>
                        No other players yet.
                    </p>
                ) : (
                    <div className="grid gap-2">
                        {otherPlayers.map(p => (
                            <div key={p.sub} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                                <div className="flex items-center gap-3">
                                    {p.logo ? (
                                        <img src={p.logo} alt={p.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-bold">{p.name}</span>
                                    {!p.approved && (
                                        <span className="text-xs" style={{ background: '#0ea5e944', color: '#0ea5e9', padding: '0.15rem 0.5rem', borderRadius: '0.5rem' }}>pending</span>
                                    )}
                                </div>
                                <span className="text-sm text-gray-300">HCP {p.hcp ?? '—'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusPill({ color, icon, children }) {
    return (
        <div style={{
            background: `${color}22`, border: `1px solid ${color}`,
            padding: '0.75rem 1rem', borderRadius: '0.5rem',
            marginBottom: '1.5rem', fontSize: '0.95rem'
        }}>
            {icon} {children}
        </div>
    );
}
