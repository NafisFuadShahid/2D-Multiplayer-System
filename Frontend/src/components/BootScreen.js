import React, { useState, useEffect } from 'react';
import WebSocketService from '../services/WebSocketService';

function BootScreen({ onGameStart }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState('select'); // 'select', 'create', or 'join'
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState(null);

  useEffect(() => {
    return () => {
      if (WebSocketService.isConnected()) {
        WebSocketService.disconnect();
      }
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a valid name');
      return;
    }
  
    setIsConnecting(true);
    setError('');
    console.log('Starting room creation...');
  
    try {
      console.log('Connecting to WebSocket...');
      await WebSocketService.connect(username.trim());
      console.log('Connected, creating room...');
      const roomId = await WebSocketService.createRoom();
      console.log('Room created:', roomId);
      setCreatedRoomId(roomId);
      setIsConnecting(false);
      onGameStart(username.trim(), roomId);
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setError('Failed to create room. Please try again.');
      
      if (WebSocketService.isConnected()) {
        WebSocketService.disconnect();
      }
    }
  };
  
  const handleJoinRoom = async () => {
    if (!username.trim() || !roomId.trim()) {
      setError('Please enter both name and room ID');
      return;
    }
  
    setIsConnecting(true);
    setError('');
  
    try {
      await WebSocketService.connect(username.trim());
      console.log('Connected, joining room:', roomId.trim());
      await WebSocketService.joinRoom(roomId.trim());
      setIsConnecting(false);
      onGameStart(username.trim(), roomId.trim());
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setError(error.message === 'Invalid room ID' ? 'Invalid room ID' : 'Failed to join room. Please try again.');
      
      if (WebSocketService.isConnected()) {
        WebSocketService.disconnect();
      }
    }
  };

  const renderModeSelection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button
        onClick={() => setMode('create')}
        style={{
          padding: '12px',
          fontSize: '18px',
          backgroundColor: '#4299e1',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Create New Room
      </button>
      <button
        onClick={() => setMode('join')}
        style={{
          padding: '12px',
          fontSize: '18px',
          backgroundColor: '#48bb78',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Join Existing Room
      </button>
    </div>
  );

  const renderCreateRoom = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your name"
        disabled={isConnecting}
        style={{
          padding: '10px',
          fontSize: '16px',
          borderRadius: '4px',
          backgroundColor: '#2d3748',
          color: '#fff',
          border: '1px solid #4a5568'
        }}
      />
      <button
        onClick={handleCreateRoom}
        disabled={isConnecting}
        style={{
          padding: '12px',
          fontSize: '18px',
          backgroundColor: '#4299e1',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isConnecting ? 'wait' : 'pointer',
          opacity: isConnecting ? 0.7 : 1
        }}
      >
        {isConnecting ? 'Creating Room...' : 'Create Room'}
      </button>
      <button
        onClick={() => setMode('select')}
        style={{
          padding: '12px',
          fontSize: '16px',
          backgroundColor: '#718096',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Back
      </button>
    </div>
  );

  const renderJoinRoom = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your name"
        disabled={isConnecting}
        style={{
          padding: '10px',
          fontSize: '16px',
          borderRadius: '4px',
          backgroundColor: '#2d3748',
          color: '#fff',
          border: '1px solid #4a5568'
        }}
      />
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Room ID"
        disabled={isConnecting}
        style={{
          padding: '10px',
          fontSize: '16px',
          borderRadius: '4px',
          backgroundColor: '#2d3748',
          color: '#fff',
          border: '1px solid #4a5568'
        }}
      />
      <button
        onClick={handleJoinRoom}
        disabled={isConnecting}
        style={{
          padding: '12px',
          fontSize: '18px',
          backgroundColor: '#48bb78',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isConnecting ? 'wait' : 'pointer',
          opacity: isConnecting ? 0.7 : 1
        }}
      >
        {isConnecting ? 'Joining Room...' : 'Join Room'}
      </button>
      <button
        onClick={() => setMode('select')}
        style={{
          padding: '12px',
          fontSize: '16px',
          backgroundColor: '#718096',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Back
      </button>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a202c',
      color: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: '#2d3748',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>
          Welcome to the Game
        </h1>
        
        {error && (
          <p style={{
            color: '#fc8181',
            textAlign: 'center',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(252, 129, 129, 0.1)',
            marginBottom: '16px'
          }}>
            {error}
          </p>
        )}

        {createdRoomId && (
          <div style={{
            backgroundColor: '#2f855a',
            color: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <p>Room Created!</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{createdRoomId}</p>
            <p>Share this ID with other players</p>
          </div>
        )}

        {mode === 'select' && renderModeSelection()}
        {mode === 'create' && renderCreateRoom()}
        {mode === 'join' && renderJoinRoom()}
      </div>
    </div>
  );
}

export default BootScreen;