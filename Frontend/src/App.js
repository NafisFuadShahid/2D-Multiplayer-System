import React, { useState } from 'react';
import BootScreen from './components/BootScreen';
import GameCanvas from './components/GameCanvas';
import WebSocketService from './services/WebSocketService';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const handleGameStart = (name) => {
    setPlayerName(name);
    setGameStarted(true);
  };

  const handleGameExit = () => {
    WebSocketService.disconnect();
    setGameStarted(false);
    setPlayerName('');
  };

  return (
    <div>
      {!gameStarted ? (
        <BootScreen onGameStart={handleGameStart} />
      ) : (
        <GameCanvas 
          playerName={playerName} 
          onExit={handleGameExit} 
        />
      )}
    </div>
  );
}

export default App;