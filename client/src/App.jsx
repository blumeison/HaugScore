import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import MainView from './components/MainView';
import TeamSetup from './components/TeamSetup';
import TeamSelector from './components/TeamSelector';
import WelcomeScreen from './components/WelcomeScreen';
import GameMasterDashboard from './components/GameMasterDashboard';
import PlayerProfile from './components/PlayerProfile';
import PlayerTournamentView from './components/PlayerTournamentView';
import { AuthProvider, useAuth } from './AuthContext';

// Server URL resolution:
//   - If VITE_SERVER_URL is set at build time → use it (useful for split deploys)
//   - Dev (vite dev server) → localhost:3001
//   - Prod (same-origin deploy like fly.io) → window.location.origin
const SERVER_URL = import.meta.env.VITE_SERVER_URL
    || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

// Socket with aggressive reconnection settings for flaky mobile/tablet
// connections. `auth` is populated by AuthContext before (re)connection.
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
  transports: ['websocket', 'polling'],
  autoConnect: false, // AuthContext triggers connect after setting auth
});
window.socket = socket;

function AppInner() {
  const { isSignedIn, isAdmin, isApproved, hasProfile, player, me } = useAuth();

  const [gameState, setGameState] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [viewMode, setViewMode] = useState('welcome');
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const notificationTimer = useRef(null);

  // Note: socket.connect() is owned by AuthProvider so the token is always
  // set on the handshake. Don't call socket.connect() here.

  // ── Routing init (restore team binding) ───────────────────────────────────
  useEffect(() => {
    const savedTeamId = localStorage.getItem('myTeamId');
    if (savedTeamId) setMyTeamId(parseInt(savedTeamId));
  }, []);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected:', reason);
      setConnectionStatus('offline');
    });

    socket.on('reconnecting', (attempt) => {
      console.log('Reconnecting, attempt', attempt);
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect', (attempt) => {
      console.log('Reconnected after', attempt, 'attempts');
      setConnectionStatus('connected');
    });

    socket.on('reconnect_error', () => {
      setConnectionStatus('offline');
    });

    socket.on('stateUpdate', (newState) => {
      setGameState(newState);

      // If my team no longer exists (e.g. GM reduced team count), clear localStorage
      const savedId = localStorage.getItem('myTeamId');
      if (savedId && !newState.teams.some(t => t.id === parseInt(savedId))) {
        localStorage.removeItem('myTeamId');
        setMyTeamId(null);
        if (viewMode === 'team') setViewMode('welcome');
      }
    });

    socket.on('notification', (msg) => showNotification(msg));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnecting');
      socket.off('reconnect');
      socket.off('reconnect_error');
      socket.off('stateUpdate');
      socket.off('notification');
    };
  }, [viewMode]);

  // ── Page Visibility API: re-sync when tablet wakes from sleep ─────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          setConnectionStatus('reconnecting');
          socket.connect();
        } else {
          socket.emit('requestState');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showNotification = (msg) => {
    setNotification(msg);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateScore = (teamId, holeNumber, score) => socket.emit('updateScore', { teamId, holeNumber, score });
  const handleUpdateTeam = (teamId, name, logo) => socket.emit('updateTeam', { teamId, name, logo });
  const handleResetGame = () => socket.emit('resetGame');
  const handleSetTeamCount = (count) => socket.emit('setTeamCount', count);
  const handleSetCourse = (courseId) => socket.emit('setCourse', courseId);
  const handleSetPlayerApproval = (sub, approved) => socket.emit('setPlayerApproval', { sub, approved });
  const handleDeletePlayer = (sub) => socket.emit('deletePlayer', sub);
  const handleUpdatePlayer = (patch) => {
    // patch: { sub?, name?, logo?, hcp? } — sub defaults to self server-side
    socket.emit('updatePlayer', patch);
  };

  // ── Tournament ops (all socket-based, permissions enforced server-side) ──
  const tournamentOps = {
    create: (payload) => socket.emit('createTournament', payload),
    update: (id, patch) => socket.emit('updateTournament', { id, patch }),
    remove: (id) => socket.emit('deleteTournament', id),
    addRound: (tournamentId, { courseId, date }) =>
      socket.emit('addRound', { tournamentId, courseId, date }),
    removeRound: (tournamentId, roundId) =>
      socket.emit('removeRound', { tournamentId, roundId }),
    setRoundStatus: (tournamentId, roundId, status) =>
      socket.emit('setRoundStatus', { tournamentId, roundId, status }),
    setScore: (tournamentId, roundId, playerSub, patch) =>
      socket.emit('setScore', { tournamentId, roundId, playerSub, ...patch }),
    clearScore: (tournamentId, roundId, playerSub) =>
      socket.emit('clearScore', { tournamentId, roundId, playerSub }),
    submitScore: (tournamentId, roundId, patch) =>
      socket.emit('submitScore', { tournamentId, roundId, ...patch }),
    updateScrambleMeta: (patch) => socket.emit('updateScrambleMeta', patch),
  };

  // ── Connection status banner ──────────────────────────────────────────────
  const renderConnectionBanner = () => {
    if (connectionStatus === 'connected') return null;
    const isReconnecting = connectionStatus === 'reconnecting';
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: isReconnecting ? '#d97706' : '#dc2626',
        color: 'white', textAlign: 'center',
        padding: '0.6rem 1rem', fontSize: '0.9rem', fontWeight: '600',
        letterSpacing: '0.02em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
      }}>
        {isReconnecting ? '⟳ Reconnecting to server...' : '⚠ No connection — scores are paused'}
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="loading" style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1.5rem' }}>
        {renderConnectionBanner()}
        ⛳ Loading...
      </div>
    );
  }

  // ── Route guards: block views the user shouldn't be on ────────────────────
  // If a signed-out user somehow lands on a gated view, kick them home.
  if ((viewMode === 'profile' || viewMode === 'gm' || viewMode === 'join' || viewMode === 'team' || viewMode === 'tournament') && !isSignedIn) {
    setViewMode('welcome');
    return null;
  }
  // GM needs admin; Join/Team need approval.
  if (viewMode === 'gm' && !isAdmin) {
    setViewMode('welcome');
    return null;
  }
  if ((viewMode === 'join' || viewMode === 'team') && !isApproved && !isAdmin) {
    setViewMode('welcome');
    return null;
  }
  if (viewMode === 'tournament' && !isApproved && !isAdmin) {
    setViewMode('welcome');
    return null;
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  if (viewMode === 'welcome') {
    return (
      <>
        {renderConnectionBanner()}
        <WelcomeScreen
          onJoinGame={() => setViewMode('join')}
          onPlayerProfile={() => setViewMode('profile')}
          onGameMaster={() => setViewMode('gm')}
          onTournaments={() => setViewMode('tournament')}
        />
      </>
    );
  }

  if (viewMode === 'profile') {
    return (
      <>
        {renderConnectionBanner()}
        <PlayerProfile
          gameState={gameState}
          player={player}
          isApproved={isApproved}
          hasProfile={hasProfile}
          onUpdatePlayer={handleUpdatePlayer}
          onExit={() => setViewMode('welcome')}
        />
      </>
    );
  }

  if (viewMode === 'gm') {
    return (
      <>
        {renderConnectionBanner()}
        <GameMasterDashboard
          gameState={gameState}
          onUpdateTeam={handleUpdateTeam}
          onResetGame={handleResetGame}
          onSetCourse={handleSetCourse}
          onSetTeamCount={handleSetTeamCount}
          onUpdatePlayer={handleUpdatePlayer}
          onSetPlayerApproval={handleSetPlayerApproval}
          onDeletePlayer={handleDeletePlayer}
          tournamentOps={tournamentOps}
          onExit={() => setViewMode('welcome')}
        />
      </>
    );
  }

  if (viewMode === 'tournament') {
    return (
      <>
        {renderConnectionBanner()}
        <PlayerTournamentView
          gameState={gameState}
          player={player}
          tournamentOps={tournamentOps}
          onExit={() => setViewMode('welcome')}
        />
      </>
    );
  }

  if (viewMode === 'join') {
    return (
      <>
        {renderConnectionBanner()}
        <TeamSelector
          gameState={gameState}
          onSelectTeam={(id) => {
            setMyTeamId(id);
            localStorage.setItem('myTeamId', id);
            setViewMode('team');
          }}
        />
      </>
    );
  }

  // Default: Team View (scramble)
  return (
    <div className="app">
      {renderConnectionBanner()}

      {notification && (
        <div style={{
          position: 'fixed', top: connectionStatus !== 'connected' ? '44px' : '20px', right: '20px',
          background: notification.type === 'error' ? '#ef4444' : notification.type === 'warning' ? '#f59e0b' : '#ec4899',
          color: 'white', padding: '1rem 1.5rem', borderRadius: '0.5rem',
          zIndex: 10000, animation: 'fadeIn 0.3s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: '400px'
        }}>
          {notification.message}
        </div>
      )}

      <MainView
        gameState={gameState}
        myTeamId={myTeamId}
        onUpdateScore={handleUpdateScore}
        onOpenSetup={() => setShowSetup(true)}
        onExit={() => {
          localStorage.removeItem('myTeamId');
          setMyTeamId(null);
          setViewMode('welcome');
        }}
      />

      {showSetup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '1rem', padding: '2rem',
            maxWidth: '600px', width: '90%', position: 'relative'
          }}>
            <TeamSetup
              gameState={gameState}
              myTeamId={myTeamId}
              onUpdateTeam={handleUpdateTeam}
              onClose={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider socket={socket}>
      <AppInner />
    </AuthProvider>
  );
}
