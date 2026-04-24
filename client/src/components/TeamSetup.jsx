import React, { useState } from 'react';
import { fileToDownscaledDataUrl } from '../utils/imageResize';

export default function TeamSetup({ gameState, myTeamId, onUpdateTeam, onClose }) {
    const myTeam = gameState.teams.find(t => t.id === myTeamId);
    const [name, setName] = useState(myTeam?.name || '');
    const [logo, setLogo] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const scaled = await fileToDownscaledDataUrl(file, 512, 0.85);
            setLogo(scaled);
        } catch (err) {
            console.error('Failed to process image', err);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (myTeam) {
            onUpdateTeam(myTeam.id, name || undefined, logo);
            if (onClose) onClose();
        }
    };

    const handleChangeTeam = () => {
        if (confirm("Are you sure you want to leave this team and join another?")) {
            localStorage.removeItem('myTeamId');
            window.location.reload();
        }
    };

    if (!myTeam) return null;

    return (
        <div className="team-setup">
            <div className="flex justify-between items-center mb-4">
                <h2>🛠️ Team Settings</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div>
                        <label className="block mb-2">Team Name</label>
                        <input
                            type="text"
                            placeholder="Enter Team Name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 rounded bg-slate-800 text-white border border-slate-600"
                        />
                    </div>

                    <div>
                        <label className="block mb-2">Upload Logo</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full"
                        />
                    </div>

                    {(logo || myTeam.logo) && (
                        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                            <img
                                src={logo || myTeam.logo}
                                alt="Preview"
                                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: '2px solid white' }}
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-blue w-full">Save Changes</button>
                </form>

                <hr style={{ margin: '2rem 0', border: '1px solid #444' }} />

                <button onClick={handleChangeTeam} className="btn w-full" style={{ background: '#f59e0b' }}>
                    🔄 Switch / Join Different Team
                </button>
            </div>
        </div>
    );
}
