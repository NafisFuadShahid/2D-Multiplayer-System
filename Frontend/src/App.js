// src/App.js

import React, { useState } from 'react';
import BootScreen from './components/BootScreen';
import GameCanvas from './components/GameCanvas';

function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [playerInfo, setPlayerInfo] = useState({ username: '', roomId: '' });

    /**
     * Callback to initiate the game after successful room creation/joining.
     * @param {string} username - The player's username.
     * @param {string} roomId - The room ID.
     */
    const handleGameStart = (username, roomId) => {
        setPlayerInfo({ username, roomId });
        setGameStarted(true);
    };

    return (
        <>
            {!gameStarted ? (
                <BootScreen onGameStart={handleGameStart} />
            ) : (
                <GameCanvas playerName={playerInfo.username} roomId={playerInfo.roomId} />
            )}
        </>
    );
}

export default App;
