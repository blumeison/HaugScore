import React, { useState } from 'react';
import ScoreUploadModal from './ScoreUploadModal';
import TournamentStandings from './TournamentStandings';

// Game Master's tournament management panel.
//
// Responsibilities covered in Phase 1 (this component):
//   - Create / delete tournaments
//   - Edit title + rules
//   - Add / remove rounds (course + date), toggle round open/closed
//   - Mark tournament complete / re-activate
// Standings + inline score editing land in Phase 2 (TournamentStandings).

const COURSE_OPTIONS = [
    { id: 'waldviertel', label: '🌲 Waldviertel' },
    { id: 'haugschlag', label: '⛳ Haugschlag' },
    { id: 'monachus', label: '🇨🇿 Monachus' },
];

export default function TournamentSection({ tournaments, tournamentOps, courses, players = [] }) {
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const activeTournaments = tournaments.filter(t => t.status === 'active');
    const completedTournaments = tournaments.filter(t => t.status === 'completed');

    const handleCreate = () => {
        const title = newTitle.trim() || 'New Tournament';
        tournamentOps.create({ title, rules: '' });
        setNewTitle('');
        setCreating(false);
    };

    return (
        <div className="card mb-8" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem' }}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-amber-400 m-0">🏆 Tournaments ({tournaments.length})</h2>
                {!creating ? (
                    <button
                        onClick={() => setCreating(true)}
                        className="btn btn-sm"
                        style={{ background: '#f59e0b' }}
                    >
                        + New Tournament
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                            placeholder="Tournament title"
                            className="p-2 rounded bg-slate-700 text-white border border-slate-600"
                        />
                        <button onClick={handleCreate} className="btn btn-sm" style={{ background: '#22c55e' }}>Create</button>
                        <button onClick={() => { setCreating(false); setNewTitle(''); }} className="btn btn-sm" style={{ background: '#475569' }}>Cancel</button>
                    </div>
                )}
            </div>

            {tournaments.length === 0 ? (
                <p className="text-gray-400 text-center py-4" style={{ margin: 0 }}>
                    No tournaments yet. Create one to get started.
                </p>
            ) : (
                <div className="grid gap-4">
                    {[...activeTournaments, ...completedTournaments].map(t => (
                        <TournamentCard key={t.id} tournament={t} tournamentOps={tournamentOps} courses={courses} players={players} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TournamentCard({ tournament, tournamentOps, courses, players }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(tournament.title);
    const [rules, setRules] = useState(tournament.rules);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showRounds, setShowRounds] = useState(true);

    const isCompleted = tournament.status === 'completed';

    const saveMeta = () => {
        tournamentOps.update(tournament.id, { title: title.trim() || tournament.title, rules });
        setEditing(false);
    };

    return (
        <div
            className="p-4 rounded-lg"
            style={{
                background: isCompleted ? '#0f172a' : '#334155',
                borderLeft: `4px solid ${isCompleted ? '#64748b' : '#f59e0b'}`,
                opacity: isCompleted ? 0.85 : 1,
            }}
        >
            <div className="flex justify-between items-start mb-2" style={{ gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {!editing ? (
                        <>
                            <div className="font-bold text-lg" style={{ color: isCompleted ? '#cbd5e1' : '#fde68a' }}>
                                {tournament.title}
                                {isCompleted && <span className="text-xs ml-2" style={{ background: '#475569', padding: '0.15rem 0.5rem', borderRadius: '0.5rem' }}>completed</span>}
                            </div>
                            {tournament.rules && (
                                <div className="text-sm text-gray-300 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                                    {tournament.rules}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid gap-2">
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="p-2 rounded bg-slate-800 text-white border border-slate-600"
                                placeholder="Title"
                            />
                            <textarea
                                value={rules}
                                onChange={e => setRules(e.target.value)}
                                className="p-2 rounded bg-slate-800 text-white border border-slate-600"
                                rows={4}
                                placeholder="Rules (shown to players before they join)"
                            />
                            <div className="flex gap-2">
                                <button onClick={saveMeta} className="btn btn-sm" style={{ background: '#22c55e' }}>Save</button>
                                <button onClick={() => { setEditing(false); setTitle(tournament.title); setRules(tournament.rules); }} className="btn btn-sm" style={{ background: '#475569' }}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
                {!editing && (
                    <div className="flex gap-2" style={{ flexShrink: 0 }}>
                        <button onClick={() => setEditing(true)} className="btn btn-sm" style={{ background: '#3b82f6' }} title="Edit title & rules">✏️</button>
                        <button
                            onClick={() => tournamentOps.update(tournament.id, { status: isCompleted ? 'active' : 'completed' })}
                            className="btn btn-sm"
                            style={{ background: isCompleted ? '#22c55e' : '#64748b' }}
                            title={isCompleted ? 'Re-open tournament' : 'Mark as completed'}
                        >
                            {isCompleted ? '↩ Reopen' : '✓ Complete'}
                        </button>
                        {confirmDelete ? (
                            <>
                                <button
                                    onClick={() => { tournamentOps.remove(tournament.id); setConfirmDelete(false); }}
                                    className="btn btn-sm"
                                    style={{ background: '#dc2626' }}
                                >Delete?</button>
                                <button onClick={() => setConfirmDelete(false)} className="btn btn-sm" style={{ background: '#475569' }}>✕</button>
                            </>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="btn btn-sm" style={{ background: '#7f1d1d' }} title="Delete tournament">🗑</button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mt-3 mb-2">
                <div className="text-sm font-bold text-gray-300">
                    Rounds ({tournament.rounds.length})
                </div>
                <button onClick={() => setShowRounds(v => !v)} className="btn btn-sm" style={{ background: '#475569' }}>
                    {showRounds ? 'Hide' : 'Show'}
                </button>
            </div>

            {showRounds && (
                <RoundsList tournament={tournament} tournamentOps={tournamentOps} disabled={isCompleted} courses={courses} />
            )}

            {/* Standings: overall leaderboard + per-player round detail */}
            <TournamentStandings
                tournament={tournament}
                players={players}
                courses={courses}
            />
        </div>
    );
}

function RoundsList({ tournament, tournamentOps, disabled, courses }) {
    const [courseId, setCourseId] = useState('waldviertel');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

    const addRound = () => {
        tournamentOps.addRound(tournament.id, { courseId, date });
    };

    return (
        <div className="grid gap-2">
            {tournament.rounds.map((r, idx) => (
                <RoundRow key={r.id} round={r} index={idx + 1} tournament={tournament} tournamentOps={tournamentOps} disabled={disabled} courses={courses} />
            ))}

            {!disabled && (
                <div className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
                    <select
                        value={courseId}
                        onChange={e => setCourseId(e.target.value)}
                        className="p-2 rounded bg-slate-700 text-white border border-slate-600"
                    >
                        {COURSE_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="p-2 rounded bg-slate-700 text-white border border-slate-600"
                    />
                    <button onClick={addRound} className="btn btn-sm" style={{ background: '#22c55e' }}>+ Round</button>
                </div>
            )}

            {tournament.rounds.length === 0 && disabled && (
                <div className="text-sm text-gray-400 text-center py-2">No rounds.</div>
            )}
        </div>
    );
}

function RoundRow({ round, index, tournament, tournamentOps, disabled, courses }) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const course = COURSE_OPTIONS.find(c => c.id === round.courseId);
    const fullCourse = courses?.[round.courseId];
    const isOpen = round.status === 'open';
    const resultCount = Object.keys(round.results || {}).length;

    return (
        <>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                    <div className="font-bold">
                        R{index}: {course?.label || round.courseId}
                    </div>
                    <div className="text-xs text-gray-400">
                        {round.date} · {resultCount} result{resultCount === 1 ? '' : 's'}
                        {' · '}
                        <span style={{ color: isOpen ? '#22c55e' : '#f59e0b' }}>
                            {isOpen ? '🔓 open' : '🔒 closed'}
                        </span>
                    </div>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setUploadOpen(true)}
                            className="btn btn-sm"
                            style={{ background: '#8b5cf6' }}
                            title="Test upload a score for yourself (admin)"
                        >
                            📤 Upload
                        </button>
                        <button
                            onClick={() => tournamentOps.setRoundStatus(tournament.id, round.id, isOpen ? 'closed' : 'open')}
                            className="btn btn-sm"
                            style={{ background: isOpen ? '#f59e0b' : '#22c55e' }}
                        >
                            {isOpen ? 'Close' : 'Reopen'}
                        </button>
                        {confirmRemove ? (
                            <>
                                <button
                                    onClick={() => { tournamentOps.removeRound(tournament.id, round.id); setConfirmRemove(false); }}
                                    className="btn btn-sm"
                                    style={{ background: '#dc2626' }}
                                >Remove?</button>
                                <button onClick={() => setConfirmRemove(false)} className="btn btn-sm" style={{ background: '#475569' }}>✕</button>
                            </>
                        ) : (
                            <button onClick={() => setConfirmRemove(true)} className="btn btn-sm" style={{ background: '#7f1d1d' }} title="Remove round">🗑</button>
                        )}
                    </div>
                )}
            </div>

            {uploadOpen && fullCourse && (
                <ScoreUploadModal
                    tournamentId={tournament.id}
                    roundId={round.id}
                    course={fullCourse}
                    title={`${tournament.title} · R${index} · ${course?.label || round.courseId} · ${round.date}`}
                    onConfirm={({ strokes, teeId }) => {
                        // Admin uploading for themselves → submitScore (self).
                        tournamentOps.submitScore(tournament.id, round.id, { strokes, teeId });
                        setUploadOpen(false);
                    }}
                    onClose={() => setUploadOpen(false)}
                />
            )}
        </>
    );
}
