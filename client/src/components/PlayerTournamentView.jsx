import React, { useState } from 'react';
import ScoreUploadModal from './ScoreUploadModal';
import TournamentStandings from './TournamentStandings';

// Player-facing tournament view (mobile-first).
//
// Rules of engagement:
//   - Read-only for tournament metadata + round management (no add/remove).
//   - Upload button ONLY on rounds whose status === 'open' AND whose
//     tournament.status === 'active'.
//   - Re-upload overwrites.

const COURSE_LABEL = {
    waldviertel: '🌲 Waldviertel',
    haugschlag: '⛳ Haugschlag',
    monachus: '🇨🇿 Monachus',
};

export default function PlayerTournamentView({ gameState, player, tournamentOps, onExit }) {
    const tournaments = gameState.tournaments || [];
    const courses = gameState.courses || {};
    const players = gameState.players || [];

    const active = tournaments.filter(t => t.status === 'active');
    const completed = tournaments.filter(t => t.status === 'completed');

    const [selectedId, setSelectedId] = useState(() => active[0]?.id || completed[0]?.id || null);
    const selected = tournaments.find(t => t.id === selectedId) || active[0] || completed[0] || null;

    return (
        <div className="page">
            <div className="page-header">
                <h1>🏆 Tournaments</h1>
                <button className="btn btn--ghost" onClick={onExit}>← Back</button>
            </div>

            {tournaments.length === 0 && (
                <div className="card card--sunken u-text-center u-muted">
                    No tournaments yet. The Game Master hasn't created one.
                </div>
            )}

            {tournaments.length > 1 && (
                <div className="tab-bar" role="tablist" aria-label="Select tournament">
                    {[...active, ...completed].map(t => {
                        const isSel = t.id === selected?.id;
                        const isDone = t.status === 'completed';
                        return (
                            <button
                                key={t.id}
                                role="tab"
                                onClick={() => setSelectedId(t.id)}
                                className={`tab ${isDone ? 'is-completed' : ''}`}
                                aria-pressed={isSel}
                            >
                                {isDone ? '✓ ' : ''}{t.title}
                            </button>
                        );
                    })}
                </div>
            )}

            {selected && (
                <TournamentBody
                    tournament={selected}
                    player={player}
                    players={players}
                    courses={courses}
                    tournamentOps={tournamentOps}
                />
            )}
        </div>
    );
}

function TournamentBody({ tournament, player, players, courses, tournamentOps }) {
    const isCompleted = tournament.status === 'completed';

    return (
        <div className={`card card--tournament ${isCompleted ? 'is-completed' : ''}`}>
            <div className="card__header">
                <div className="u-flex-1" style={{ minWidth: 0 }}>
                    <h2 className="card__title">
                        {tournament.title}
                        {isCompleted && (
                            <span className="pill pill--muted" style={{ marginLeft: '0.5rem', fontSize: 'var(--fz-xs)', verticalAlign: 'middle' }}>
                                completed
                            </span>
                        )}
                    </h2>
                    {tournament.rules && (
                        <div className="u-muted" style={{
                            marginTop: '0.5rem',
                            fontSize: 'var(--fz-sm)',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {tournament.rules}
                        </div>
                    )}
                </div>
            </div>

            <div className="stack">
                <h3 className="section-title">Rounds</h3>
                {tournament.rounds.length === 0 && (
                    <div className="card card--sunken u-text-center u-muted">
                        No rounds set up yet.
                    </div>
                )}
                {tournament.rounds.map((r, idx) => (
                    <PlayerRoundRow
                        key={r.id}
                        round={r}
                        index={idx + 1}
                        tournament={tournament}
                        player={player}
                        course={courses[r.courseId]}
                        tournamentOps={tournamentOps}
                        tournamentCompleted={isCompleted}
                    />
                ))}
            </div>

            <TournamentStandings
                tournament={tournament}
                players={players}
                courses={courses}
            />
        </div>
    );
}

function PlayerRoundRow({ round, index, tournament, player, course, tournamentOps, tournamentCompleted }) {
    const [uploadOpen, setUploadOpen] = useState(false);

    const isOpen = round.status === 'open' && !tournamentCompleted;
    const myResult = player?.sub ? round.results?.[player.sub] : null;
    const uploadLabel = myResult ? '↻ Re-upload' : '📤 Upload score';

    const lockedReason = tournamentCompleted
        ? 'Tournament is completed'
        : round.status !== 'open'
            ? 'Round is closed by the Game Master'
            : '';

    return (
        <>
            <div className="round-row">
                <div className="round-row__meta">
                    <strong>R{index}: {COURSE_LABEL[round.courseId] || round.courseId}</strong>
                    <div className="round-row__sub">
                        <span>{round.date}</span>
                        <span className={isOpen ? 'pill pill--success' : 'pill pill--warning'} style={{ padding: '1px 8px' }}>
                            {isOpen ? '🔓 open' : '🔒 closed'}
                        </span>
                    </div>
                    {myResult && (
                        <div className="round-row__score">
                            Netto <strong>{myResult.netto ?? '—'}</strong>
                            <span className="u-muted"> · Brutto {myResult.brutto ?? '—'}</span>
                        </div>
                    )}
                </div>

                <div className="round-row__actions">
                    {isOpen ? (
                        <button
                            className={`btn ${myResult ? 'btn--blue' : 'btn--violet'} btn--sm`}
                            onClick={() => setUploadOpen(true)}
                        >
                            {uploadLabel}
                        </button>
                    ) : (
                        <span title={lockedReason} className="u-muted" style={{ fontSize: 'var(--fz-xs)' }}>
                            🔒 {lockedReason}
                        </span>
                    )}
                </div>
            </div>

            {uploadOpen && course && (
                <ScoreUploadModal
                    tournamentId={tournament.id}
                    roundId={round.id}
                    course={course}
                    title={`${tournament.title} · R${index} · ${COURSE_LABEL[round.courseId] || round.courseId} · ${round.date}`}
                    onConfirm={({ strokes, teeId }) => {
                        tournamentOps.submitScore(tournament.id, round.id, { strokes, teeId });
                        setUploadOpen(false);
                    }}
                    onClose={() => setUploadOpen(false)}
                />
            )}
        </>
    );
}
