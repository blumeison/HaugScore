import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import MainView from './components/MainView';
import TeamSetup from './components/TeamSetup';
import TeamSelector from './components/TeamSelector';
import WelcomeScreen from './components/WelcomeScreen';
import GameMasterDashboard from './components/GameMasterDashboard';

// Connect to backend
const socket = io('http://localhost:3001');
window.socket = socket;

function App() {
  const [gameState, setGameState] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [viewMode, setViewMode] = useState('loading'); // loading, welcome, gm, join, team
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState(null);
  const [wheelAlert, setWheelAlert] = useState(null);
  const [wheelSpin, setWheelSpin] = useState(false);

  useEffect(() => {
    const savedTeamId = localStorage.getItem('myTeamId');
    if (savedTeamId) {
      setMyTeamId(parseInt(savedTeamId));
      setViewMode('team');
    } else {
      setViewMode('welcome');
    }
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('stateUpdate', (newState) => {
      console.log('State updated:', newState);
      setGameState(newState);
    });

    socket.on('notification', (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
    });

    socket.on('wheelAlert', (data) => {
      console.log('Wheel Alert:', data);
      setWheelAlert(data);
      setWheelSpin(false);
      showWheelNotification(data);
    });

    socket.on('wheelSpin', () => {
      console.log('Wheel Spin START!');
      setWheelSpin(true);
    });

    return () => {
      socket.off('connect');
      socket.off('stateUpdate');
      socket.off('notification');
      socket.off('wheelAlert');
      socket.off('wheelSpin');
    };
  }, []);

  const showWheelNotification = (data) => {
    setNotification({
      message: `🎡 ${data.sourceTeam.name} is challenging ${data.targetTeam.name} with the WHEEL!`,
      type: 'warning'
    });
  };

  const handleUpdateScore = (teamId, holeNumber, score) => {
    socket.emit('updateScore', { teamId, holeNumber, score });
  };

  const handleWheelRequest = (teamId) => {
    setWheelAlert(null);
    setWheelSpin(false);
    socket.emit('wheelSpinRequest', { teamId });
  };

  const handleWheelReady = (targetTeamId) => {
    socket.emit('wheelReady', { targetTeamId });
  };

  const handleWheelDone = (teamId) => {
    setWheelAlert(null);
    setWheelSpin(false);
    socket.emit('wheelDone', { teamId });
  };

  const handleUpdateTeam = (teamId, name, logo) => {
    socket.emit('updateTeam', { teamId, name, logo });
  };

  const handleResetGame = () => {
    console.log('App: handleResetGame called, emitting socket event');
    socket.emit('resetGame');
  };

  const handleSetCourse = (courseId) => {
    fetch('http://localhost:3001/api/set-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    }).catch(err => console.error("Failed to set course:", err));
  };

  const handleSetGameConfig = (config) => {
    socket.emit('setGameConfig', config);
  };

  if (!gameState) {
    return <div className="loading" style={{ textAlign: 'center', marginTop: '3rem', fontSize: '1.5rem' }}>⛳️ Loading...</div>;
  }

  // ROUTING LOGIC
  if (viewMode === 'welcome') {
    return (
      <WelcomeScreen
        onJoinGame={() => setViewMode('join')}
        onGameMaster={() => setViewMode('gm')}
      />
    );
  }

  if (viewMode === 'gm') {
    return (
      <GameMasterDashboard
        gameState={gameState}
        onUpdateTeam={handleUpdateTeam}
        onResetGame={handleResetGame}
        onSetCourse={handleSetCourse}
        onSetGameConfig={handleSetGameConfig}
        onExit={() => setViewMode('welcome')}
      />
    );
  }

  if (viewMode === 'join') {
    return (
      <TeamSelector
        gameState={gameState}
        onSelectTeam={(id) => {
          setMyTeamId(id);
          setViewMode('team');
        }}
      />
    );
  }

  // Default: Team View
  return (
    <div className="app">
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
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
        onWheelRequest={handleWheelRequest}
        onWheelReady={handleWheelReady}
        onWheelDone={handleWheelDone}
        onOpenSetup={() => setShowSetup(true)}
        wheelAlert={wheelAlert}
        wheelSpin={wheelSpin}
        onResetGame={handleResetGame}
      />

      {showSetup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            position: 'relative'
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

export default App;
