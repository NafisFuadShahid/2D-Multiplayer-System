import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connectionPromise = null;
    this.players = {};
    this.onPlayerUpdate = null;
    this.currentPlayer = null;
    this.currentRoom = null;
    this.movementInterval = null;
    this.lastUpdate = Date.now();
    this.updateRate = 1000 / 60;
    this.maxRetries = 3;
    this.retryCount = 0;
    this.retryDelay = 2000;
    this.roomSubscription = null;
    this.username = null;
  }
  verifyRoomSubscription(roomId) {
    console.log('Current room subscription:', this.roomSubscription);
    console.log('Current room:', this.currentRoom);
    console.log('Current player:', this.currentPlayer);
  }

  async connect(username, onConnected, onError) {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          debug: (str) => console.log('STOMP: ' + str),
          reconnectDelay: this.retryDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          
          onConnect: () => {
            console.log('WebSocket Connected Successfully');
            this.username = username;
            this.retryCount = 0;
            resolve();
            if (onConnected) onConnected();
          },

          onStompError: (frame) => {
            console.error('STOMP error:', frame);
            this.handleConnectionError(frame, reject, onError);
          },

          onWebSocketError: (event) => {
            console.error('WebSocket error:', event);
            this.handleConnectionError(event, reject, onError);
          },

          onDisconnect: () => {
            console.log('Disconnected from WebSocket');
            this.cleanup();
          }
        });

        this.client.activate();
      } catch (error) {
        this.handleConnectionError(error, reject, onError);
      }
    });

    return this.connectionPromise;
  }

  handleConnectionError(error, reject, onError) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        this.connectionPromise = null;
        this.connect(this.username, null, onError);
      }, this.retryDelay);
    } else {
      this.cleanup();
      reject(error);
      if (onError) onError(error);
    }
  }

  async createRoom(callback) {
    try {
        await this.ensureConnected();
        
        return new Promise((resolve) => {
            const subscription = this.client.subscribe('/queue/roomCreated', (message) => {
                const response = JSON.parse(message.body);
                if (response.success) {
                    this.currentRoom = response.roomId;
                    this.subscribeToRoom(response.roomId);
                    subscription.unsubscribe();
                    if (callback) callback(response.roomId);
                    resolve(response.roomId);
                }
            });

            this.client.publish({
                destination: '/app/createRoom',
                body: JSON.stringify({ username: this.username })
            });
        });
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
  }

  async joinRoom(roomId, callback) {
    try {
        await this.ensureConnected();

        return new Promise((resolve, reject) => {
            const subscription = this.client.subscribe('/queue/joinResult', async (message) => {
                const response = JSON.parse(message.body);
                subscription.unsubscribe();
                
                if (response.success) {
                    this.currentRoom = roomId;
                    // Don't unsubscribe from room updates
                    await this.subscribeToRoom(roomId);
                    if (callback) callback(true);
                    resolve(true);
                } else {
                    if (callback) callback(false);
                    reject(new Error('Invalid room ID'));
                }
            });

            this.client.publish({
                destination: '/app/joinRoom',
                body: JSON.stringify({
                    username: this.username,
                    roomId: roomId
                })
            });
        });
    } catch (error) {
        console.error('Error joining room:', error);
        throw error;
    }
  }

// In WebSocketService.js, modify the subscribeToRoom method:

subscribeToRoom(roomId) {
  if (this.client?.connected) {
      if (this.roomSubscription) {
          this.roomSubscription.unsubscribe();
      }

      return new Promise((resolve) => {
          this.roomSubscription = this.client.subscribe(`/topic/rooms/${roomId}/players`, (message) => {
              try {
                  console.log('Received player update:', message.body);
                  const players = JSON.parse(message.body);
                  
                  if (this.onPlayerUpdate) {
                      // Pass all players directly to the callback
                      this.onPlayerUpdate(players);
                  }
              } catch (error) {
                  console.error('Error handling player update:', error);
              }
          });

          // Register the current player after subscription is ready
          setTimeout(() => {
              this.currentPlayer = {
                  id: `${this.username}-${Date.now()}`, // Make ID unique
                  username: this.username,
                  x: 0,
                  y: 0,
                  direction: 'down',
                  isMoving: false,
                  animation: 'idle-down',
                  lastUpdate: Date.now(),
                  roomId: roomId
              };

              console.log('Registering player in room:', roomId, this.currentPlayer);
              
              this.client.publish({
                  destination: '/app/register',
                  body: JSON.stringify(this.currentPlayer)
              });
              resolve();
          }, 500);
      });
    }
    return Promise.reject(new Error('WebSocket not connected'));
  }

  async ensureConnected() {
    if (!this.client?.connected) {
      if (!this.connectionPromise) {
        throw new Error('WebSocket not initialized');
      }
      await this.connectionPromise;
    }
  }

  cleanup() {
    this.players = {};
    this.currentPlayer = null;
    this.currentRoom = null;
    this.connectionPromise = null;
    if (this.roomSubscription) {
      this.roomSubscription.unsubscribe();
    }
    this.stopMovementUpdates();
  }

  startMovementUpdates(playerData) {
    if (!this.movementInterval) {
      this.movementInterval = setInterval(() => {
        const now = Date.now();
        if (now - this.lastUpdate >= this.updateRate) {
          this.sendMovementUpdate(playerData);
          this.lastUpdate = now;
        }
      }, this.updateRate);
    }
  }

  stopMovementUpdates() {
    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = null;
    }
  }

  sendMovementUpdate(playerData) {
    if (this.client?.connected && this.currentPlayer && this.currentRoom) {
      try {
        const updatedPlayer = {
          ...this.currentPlayer,
          ...playerData,
          animation: playerData.isMoving ? `run-${playerData.direction}` : `idle-${playerData.direction}`,
          timestamp: Date.now(),
          roomId: this.currentRoom
        };
        
        this.currentPlayer = updatedPlayer;

        this.client.publish({
          destination: '/app/move',
          body: JSON.stringify(updatedPlayer)
        });
      } catch (error) {
        console.error('Error sending player movement:', error);
      }
    }
  }

  movePlayer(playerData) {
    this.sendMovementUpdate(playerData);

    if (playerData.isMoving) {
      this.startMovementUpdates(playerData);
    } else {
      this.stopMovementUpdates();
      this.sendMovementUpdate(playerData);
    }
  }

  setOnPlayerUpdate(callback) {
    this.onPlayerUpdate = callback;
  }

  disconnect() {
    this.stopMovementUpdates();
    if (this.roomSubscription) {
        try {
            this.roomSubscription.unsubscribe();
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    }
    if (this.client?.connected) {
        try {
            this.client.deactivate();
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }
    this.cleanup();
  }

  isConnected() {
    return this.client?.connected ?? false;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }
}

export default new WebSocketService();