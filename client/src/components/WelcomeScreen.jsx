import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../AuthContext';

export default function WelcomeScreen({ onJoinGame, onPlayerProfile, onGameMaster, onTournaments }) {
    const { isSignedIn, isAuthLoading, isAdmin, isApproved, hasProfile, player, me, signIn, signOut } = useAuth();

    return (
        <div className="welcome">
            <h1 className="welcome__brand">⛳️ HaugScore</h1>

            {!isSignedIn ? <NotSignedIn onSignIn={signIn} /> : isAuthLoading ? (
                <AuthLoading onSignOut={signOut} />
            ) : (
                <SignedIn
                    player={player}
                    me={me}
                    isAdmin={isAdmin}
                    isApproved={isApproved}
                    hasProfile={hasProfile}
                    onJoinGame={onJoinGame}
                    onPlayerProfile={onPlayerProfile}
                    onGameMaster={onGameMaster}
                    onTournaments={onTournaments}
                    onSignOut={signOut}
                />
            )}
        </div>
    );
}

// Rendered while token exists but server authUpdate hasn't arrived yet.
function AuthLoading({ onSignOut }) {
    return (
        <div className="stack u-text-center" style={{ marginTop: '1rem', opacity: 0.85 }}>
            <div style={{ fontSize: 'var(--fz-lg)' }}>⏳ Signing you in…</div>
            <div className="u-muted" style={{ maxWidth: 360, margin: '0 auto' }}>
                Waiting for the server to verify your session. If this sticks for
                more than a few seconds, sign out and sign in again.
            </div>
            <div>
                <button onClick={onSignOut} className="btn btn--subtle btn--sm">
                    🚪 Sign Out
                </button>
            </div>
        </div>
    );
}

function NotSignedIn({ onSignIn }) {
    return (
        <>
            <p className="welcome__tagline">
                A private scoring companion for our scramble &amp; handicap tournament.
                Sign in with Google, set your HCP, and wait for the Game Master to approve you.
            </p>

            {/* Official GoogleLogin — handles OAuth + FedCM. */}
            <div style={{
                background: 'white', padding: '0.5rem', borderRadius: 'var(--r-md)',
                display: 'inline-block', marginBottom: 'var(--s-5)'
            }}>
                <GoogleLogin
                    onSuccess={onSignIn}
                    onError={() => console.error('Google sign-in failed')}
                    theme="filled_blue"
                    size="large"
                    text="signin_with"
                    shape="pill"
                />
            </div>

            <p className="u-muted" style={{ marginTop: 'var(--s-4)', maxWidth: 480 }}>
                🎉 Let's get this party started!
            </p>
        </>
    );
}

function SignedIn({ player, me, isAdmin, isApproved, hasProfile, onJoinGame, onPlayerProfile, onGameMaster, onTournaments, onSignOut }) {
    const needsProfile = !hasProfile;
    const pendingApproval = hasProfile && !isApproved && !isAdmin;
    const gated = !isApproved && !isAdmin;
    const gateTip = gated ? 'Waiting for Game Master approval' : '';

    return (
        <>
            <div className="welcome__who">
                {player?.logo && <img src={player.logo} alt="" />}
                <span>Signed in as <strong>{player?.name || me?.email}</strong>{isAdmin && ' 👑'}</span>
            </div>

            {needsProfile && (
                <StatusCard tone="warning" icon="📝" title="Complete your profile">
                    Before you can join a game, please set your handicap.
                </StatusCard>
            )}

            {pendingApproval && (
                <StatusCard tone="info" icon="⏳" title="Waiting for approval">
                    Your profile is in — ask the Game Master to approve you, then come back.
                </StatusCard>
            )}

            <p className="welcome__tagline">The Ultimate Golf Scramble Companion</p>

            <div className="welcome__actions">
                <button
                    className="welcome__btn welcome__btn--scramble"
                    onClick={onJoinGame}
                    disabled={gated}
                    title={gateTip}
                >
                    <span className="welcome__btn__icon">🏌️‍♂️</span>
                    Join Scramble
                </button>

                <button
                    className="welcome__btn welcome__btn--tournament"
                    onClick={onTournaments}
                    disabled={gated}
                    title={gateTip}
                >
                    <span className="welcome__btn__icon">🏆</span>
                    Tournaments
                </button>

                <button
                    className="welcome__btn welcome__btn--profile"
                    onClick={onPlayerProfile}
                >
                    <span className="welcome__btn__icon">👤</span>
                    {needsProfile ? 'Complete Profile' : 'My Profile'}
                </button>
            </div>

            <div className="welcome__secondary">
                {isAdmin && (
                    <button onClick={onGameMaster} className="btn btn--ghost btn--sm">👑 Game Master</button>
                )}
                <button onClick={onSignOut} className="btn btn--ghost btn--sm">🚪 Sign Out</button>
            </div>
        </>
    );
}

function StatusCard({ tone, icon, title, children }) {
    return (
        <div className={`card pill--${tone}`} style={{
            padding: 'var(--s-3) var(--s-4)',
            borderRadius: 'var(--r-lg)',
            marginBottom: 'var(--s-4)',
            maxWidth: 500,
            textAlign: 'left',
        }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{icon} {title}</div>
            <div style={{ fontSize: 'var(--fz-sm)', opacity: 0.9 }}>{children}</div>
        </div>
    );
}
