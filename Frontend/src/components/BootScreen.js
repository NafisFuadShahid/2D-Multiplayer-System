// BootScreen.js
import React, { useState, useEffect } from 'react';
import WebSocketService from '../services/WebSocketService';

function BootScreen({ onGameStart }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    return () => {
      if (WebSocketService.isConnected()) {
        WebSocketService.disconnect();
      }
    };
  }, []);

  const handleStart = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setError('Please enter a valid name');
      return;
    }

    if (isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Add connection timeout
      const connectionPromise = new Promise((resolve, reject) => {
        WebSocketService.connect(
          trimmedUsername,
          0, // spawnX
          0, // spawnY
          () => {
            resolve();
          },
          (error) => {
            reject(error);
          }
        );
      });

      // Wait for connection with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timed out'));
        }, 5000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      
      setIsConnecting(false);
      onGameStart(trimmedUsername);
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
      setError(error.message || 'Failed to connect to game server. Please try again.');
      
      // Cleanup on error
      if (WebSocketService.isConnected()) {
        WebSocketService.disconnect();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleStart();
    }
  };

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
        <h1 style={{fontSize: '24px', marginBottom: '20px', textAlign: 'center'}}>
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
        <div style={{marginBottom: '20px'}}>
          <label 
            htmlFor="username-input" 
            style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}
          >
            Enter Your Name
          </label>
          <input 
            type="text" 
            id="username-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Your name" 
            disabled={isConnecting}
            style={{
              width: '100%', 
              padding: '10px', 
              fontSize: '16px', 
              border: '1px solid #4a5568', 
              borderRadius: '4px', 
              backgroundColor: '#2d3748', 
              color: '#fff',
              opacity: isConnecting ? 0.7 : 1
            }}
          />
        </div>
        <button 
          onClick={handleStart}
          disabled={isConnecting}
          style={{
            width: '100%', 
            padding: '12px', 
            fontSize: '18px', 
            backgroundColor: isConnecting ? '#2c5282' : '#4299e1', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: isConnecting ? 'wait' : 'pointer', 
            transition: 'background-color 0.3s',
            opacity: isConnecting ? 0.7 : 1
          }}
        >
          {isConnecting ? 'Connecting...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}

export default BootScreen;