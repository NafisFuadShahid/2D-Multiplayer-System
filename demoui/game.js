class OfficeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
  
        // Game state
        this.players = {};
        this.localPlayer = null;
        this.assets = {};
  
        // Tile and environment setup
        this.tileSize = 64;
        this.mapWidth = Math.floor(this.canvas.width / this.tileSize);
        this.mapHeight = Math.floor(this.canvas.height / this.tileSize);
  
        // WebSocket
        this.socket = null;
        this.stompClient = null;
  
        // Asset paths
        this.assetPaths = {
            //floor: 'assets/floor_tile.png',
            wall: 'assets/wall_tile.png',
            table: 'assets/table.png',
            chair: 'assets/chair.png',
            player: 'assets/player.png',
            computer: 'assets/computer.png'
        };
  
        this.setupEventListeners();
    }
  
    setupEventListeners() {
        const startGameBtn = document.getElementById('startGameBtn');
        const usernameInput = document.getElementById('usernameInput');
  
        startGameBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            if (username) {
                this.initGame(username);
            } else {
                alert('Please enter a username');
            }
        });
  
        // Player movement
        window.addEventListener('keydown', (e) => {
            if (!this.localPlayer) return;
  
            const speed = 5;
            let moved = false;
  
            switch (e.key) {
                case 'ArrowLeft': this.localPlayer.x -= speed; moved = true; break;
                case 'ArrowRight': this.localPlayer.x += speed; moved = true; break;
                case 'ArrowUp': this.localPlayer.y -= speed; moved = true; break;
                case 'ArrowDown': this.localPlayer.y += speed; moved = true; break;
            }
  
            if (moved && this.stompClient) {
                // Send movement updates to the server
                this.stompClient.send("/app/move", {}, JSON.stringify(this.localPlayer));
            }
        });
    }
  
    async loadAssets() {
        const assetPromises = Object.entries(this.assetPaths).map(([key, path]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.assets[key] = img;
                    resolve();
                };
                img.onerror = reject;
                img.src = path;
            });
        });
  
        await Promise.all(assetPromises);
    }
  
    initGame(username) {
        this.loadAssets().then(() => {
            this.initializeConnection(username);
        });
    }
  
    initializeConnection(username) {
        // WebSocket connection
        this.socket = new SockJS('http://localhost:8080/ws');
        this.stompClient = Stomp.over(this.socket);
  
        this.stompClient.connect({}, (frame) => {
            console.log('Connected: ' + frame);
  
            // Initialize local player
            this.localPlayer = {
                id: this.generateUUID(),
                username: username,
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                color: this.getRandomColor()
            };
  
            // Subscribe to player updates
            this.stompClient.subscribe('/topic/players', (message) => {
                const player = JSON.parse(message.body);
                this.updatePlayerPosition(player);
            });
  
            // Register local player
            this.stompClient.send("/app/register", {}, JSON.stringify(this.localPlayer));
  
            // Start rendering loop
            this.gameLoop();
        });
    }
  
    updatePlayerPosition(player) {
        // Update other players' positions
        this.players[player.id] = player;
        this.gameLoop();
    }
  
    gameLoop() {
        this.render();
    }
  
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
        // Render environment
        this.renderEnvironment();
  
        // Render all players
        Object.values(this.players).forEach(player => this.renderPlayer(player));
        if (this.localPlayer) this.renderPlayer(this.localPlayer);
    }
  
    renderEnvironment() {
        // Render floor tiles
        for (let x = 0; x < this.mapWidth; x++) {
            for (let y = 0; y < this.mapHeight; y++) {
                if (this.assets.floor) {
                    this.ctx.drawImage(
                        this.assets.floor,
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }
  
        // Render sample walls
        if (this.assets.wall) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.ctx.drawImage(this.assets.wall, x * this.tileSize, 0, this.tileSize, this.tileSize);
            }
        }
  
        // Example furniture
        if (this.assets.table) {
            this.ctx.drawImage(this.assets.table, this.canvas.width / 2 - 64, this.canvas.height / 2 - 64, 128, 128);
        }
        if (this.assets.chair) {
            this.ctx.drawImage(this.assets.chair, this.canvas.width / 2 - 100, this.canvas.height / 2, 64, 64);
        }
    }
  
    renderPlayer(player) {
        // Render player image or fallback rectangle
        if (this.assets.player) {
            this.ctx.drawImage(this.assets.player, player.x, player.y, 32, 32);
        } else {
            this.ctx.fillStyle = player.color || '#000000';
            this.ctx.fillRect(player.x, player.y, 32, 32);
        }
  
        // Display username
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.username, player.x + 16, player.y - 5);
    }
  
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
  
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
  }
  
  // Initialize the game
  document.addEventListener('DOMContentLoaded', () => {
    new OfficeGame();
});