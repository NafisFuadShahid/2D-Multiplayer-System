// WebSocketService.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.players = {};
    this.onPlayerUpdate = null;
    this.currentPlayer = null;
    this.lastUpdate = Date.now();
    this.updateRate = 1000 / 30; // 30 FPS update rate
    this.movementBuffer = [];
    this.bufferSize = 3; // Number of positions to buffer
    this.updateTimeout = null;
    this.lastPosition = null;
    this.positionThreshold = 0.1; // Minimum position change to trigger update
  }

  connect(username, spawnX, spawnY, onConnected, onError) {
    try {
      this.client = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        debug: function(str) {
          console.log('STOMP: ' + str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: () => {
          console.log('WebSocket Connected Successfully');

          // Subscribe to player updates with buffering
          this.client.subscribe('/topic/players', (message) => {
            try {
              const players = JSON.parse(message.body);
              
              // Process received player data with timestamps
              Object.entries(players).forEach(([id, player]) => {
                if (id !== this.currentPlayer?.id) {
                  if (this.players[id]) {
                    // Store previous position for interpolation
                    player.prevX = this.players[id].x;
                    player.prevY = this.players[id].y;
                    player.prevTimestamp = this.players[id].timestamp;
                  } else {
                    player.prevX = player.x;
                    player.prevY = player.y;
                    player.prevTimestamp = Date.now();
                  }
                  
                  player.timestamp = Date.now();
                  this.players[id] = player;
                }
              });

              // Throttled update callback
              if (this.onPlayerUpdate) {
                if (this.updateTimeout) {
                  clearTimeout(this.updateTimeout);
                }
                
                this.updateTimeout = setTimeout(() => {
                  this.onPlayerUpdate(this.players);
                }, this.updateRate);
              }
            } catch (error) {
              console.error('Error parsing player update:', error);
            }
          });

          // Initialize current player
          this.currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            username: username,
            x: spawnX,
            y: spawnY,
            direction: 'down',
            isMoving: false,
            animation: 'idle-down',
            timestamp: Date.now()
          };

          this.lastPosition = { x: spawnX, y: spawnY };

          // Register player with initial position
          this.client.publish({
            destination: '/app/register',
            body: JSON.stringify(this.currentPlayer)
          });

          if (onConnected) onConnected();
        },

        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          if (onError) onError(frame);
        },

        onWebSocketError: (event) => {
          console.error('WebSocket error:', event);
          if (onError) onError(event);
        },

        onDisconnect: () => {
          console.log('Disconnected from WebSocket');
          this.clearState();
        }
      });

      this.client.activate();
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      if (onError) onError(error);
    }
  }

  clearState() {
    this.players = {};
    this.currentPlayer = null;
    this.movementBuffer = [];
    this.lastPosition = null;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }

  shouldUpdatePosition(newX, newY) {
    if (!this.lastPosition) return true;
    
    const dx = Math.abs(newX - this.lastPosition.x);
    const dy = Math.abs(newY - this.lastPosition.y);
    
    return dx > this.positionThreshold || dy > this.positionThreshold;
  }

  bufferMovement(movement) {
    this.movementBuffer.push({
      ...movement,
      timestamp: Date.now()
    });

    if (this.movementBuffer.length >= this.bufferSize) {
      this.flushMovementBuffer();
    }
  }

  flushMovementBuffer() {
    if (this.movementBuffer.length === 0) return;

    // Average out buffered movements
    const averagedMovement = this.movementBuffer.reduce((acc, curr) => {
      acc.x += curr.x;
      acc.y += curr.y;
      return acc;
    }, { x: 0, y: 0 });

    averagedMovement.x /= this.movementBuffer.length;
    averagedMovement.y /= this.movementBuffer.length;

    const lastMovement = this.movementBuffer[this.movementBuffer.length - 1];
    
    // Use the latest movement's properties with averaged position
    const finalMovement = {
      username: lastMovement.username,
      x: averagedMovement.x,
      y: averagedMovement.y,
      direction: lastMovement.direction,
      isMoving: lastMovement.isMoving,
      timestamp: Date.now()
    };

    this.sendMovementUpdate(finalMovement);
    this.movementBuffer = [];
  }

  sendMovementUpdate(playerData) {
    if (this.client?.connected && this.currentPlayer) {
      try {
        // Only send update if position has changed significantly
        if (this.shouldUpdatePosition(playerData.x, playerData.y)) {
          const updatedPlayer = {
            ...this.currentPlayer,
            ...playerData,
            animation: playerData.isMoving ? `run-${playerData.direction}` : `idle-${playerData.direction}`,
            timestamp: Date.now()
          };
          
          this.currentPlayer = updatedPlayer;
          this.lastPosition = { x: playerData.x, y: playerData.y };

          this.client.publish({
            destination: '/app/move',
            body: JSON.stringify(updatedPlayer)
          });
        }
      } catch (error) {
        console.error('Error sending player movement:', error);
      }
    }
  }

  movePlayer(playerData) {
    const now = Date.now();
    
    // If not moving, send update immediately
    if (!playerData.isMoving) {
      this.sendMovementUpdate(playerData);
      return;
    }

    // Buffer movement updates
    if (now - this.lastUpdate >= this.updateRate) {
      this.bufferMovement(playerData);
      this.lastUpdate = now;
    }
  }

  setOnPlayerUpdate(callback) {
    this.onPlayerUpdate = callback;
  }

  disconnect() {
    if (this.client?.connected) {
      try {
        this.client.deactivate();
        this.clearState();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  }

  isConnected() {
    return this.client?.connected ?? false;
  }
}

export default new WebSocketService();