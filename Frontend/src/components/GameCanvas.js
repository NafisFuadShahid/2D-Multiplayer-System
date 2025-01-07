import React, { useEffect, useRef } from 'react';
import kaboom from 'kaboom';
import WebSocketService from '../services/WebSocketService';

function GameCanvas({ playerName }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const otherPlayers = useRef({});
  const playerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 1000 / 30; // 30 FPS update rate
  const INTERPOLATION_DELAY = 100; // ms to interpolate between states

  useEffect(() => {
    const k = kaboom({
      global: false,
      width: 800,
      height: 600,
      scale: 2,
      debug: false, // Disable debug in production
      background: [0, 0, 0, 1],
      canvas: canvasRef.current,
      stretch: true,
      letterbox: true,
    });

    gameRef.current = k;

    k.loadSprite("player", "/ash.png", {
      sliceX: 52,
      sliceY: 1,
      anims: {
        "idle-right": { from: 0, to: 5, speed: 10, loop: true },
        "idle-up": { from: 6, to: 11, speed: 10, loop: true },
        "idle-left": { from: 12, to: 17, speed: 10, loop: true },
        "idle-down": { from: 18, to: 23, speed: 10, loop: true },
        "run-right": { from: 24, to: 29, speed: 15, loop: true },
        "run-up": { from: 30, to: 35, speed: 15, loop: true },
        "run-left": { from: 36, to: 41, speed: 15, loop: true },
        "run-down": { from: 42, to: 47, speed: 15, loop: true },
      },
    });

    k.loadSprite("map", "/mapfinal1.png");

    const PLAYER_SPEED = 7200;

    const startGame = async () => {
      try {
        const mapResponse = await fetch("/map.json");
        if (!mapResponse.ok) throw new Error(`Failed to load map.json: ${mapResponse.statusText}`);
        const mapData = await mapResponse.json();

        const map = k.add([
          k.pos(0, 0),
          k.anchor("topleft"),
        ]);

        const mapSprite = map.add([
          k.sprite("map"),
          k.anchor("topleft"),
        ]);

        // Set up boundaries
        const boundariesLayer = mapData.layers.find((layer) => layer.name === "boundaries");
        if (boundariesLayer?.objects) {
          boundariesLayer.objects.forEach((obj) => {
            k.add([
              k.rect(obj.width, obj.height),
              k.pos(obj.x, obj.y),
              k.area(),
              k.body({ isStatic: true }),
              k.opacity(0),
              "boundary",
            ]);
          });
        }

        // Initialize player position
        let spawnX = mapSprite.width / 2;
        let spawnY = mapSprite.height / 2;

        const spawnLayer = mapData.layers.find((layer) => layer.name === "spawnpoint");
        if (spawnLayer?.objects?.[0]) {
          spawnX = spawnLayer.objects[0].x;
          spawnY = spawnLayer.objects[0].y;
        }

        const player = k.add([
          k.sprite("player"),
          k.pos(spawnX, spawnY),
          k.area({ width: 32, height: 32 }),
          k.anchor("center"),
          k.body(),
          {
            speed: PLAYER_SPEED,
            isMoving: false,
            direction: "down",
            lastServerPosition: { x: spawnX, y: spawnY },
            pendingInputs: [],
          },
        ]);

        playerRef.current = player;
        player.play("idle-down");

        const nameTag = k.add([
          k.text(playerName, { size: 16, color: k.rgb(255, 255, 255) }),
          k.pos(player.pos.x, player.pos.y - 20),
          k.anchor("center"),
          { followsPlayer: true },
        ]);

        // Improved player update handling with interpolation
        // In GameCanvas.js, modify the WebSocket player update handler:

        WebSocketService.setOnPlayerUpdate((players) => {
          const currentTime = Date.now();
          
          Object.entries(players).forEach(([id, playerData]) => {
              if (id !== playerName) {  // Only handle other players
                  if (!otherPlayers.current[id]) {
                      // Add new player
                      const otherPlayer = k.add([
                          k.sprite("player"),
                          k.pos(playerData.x, playerData.y),
                          k.area({ width: 32, height: 32 }),
                          k.anchor("center"),
                          { 
                              id,
                              username: playerData.username,
                              isMoving: playerData.isMoving,
                              direction: playerData.direction || "down",
                              targetX: playerData.x,
                              targetY: playerData.y,
                              startX: playerData.x,
                              startY: playerData.y,
                              interpolationStart: currentTime,
                          },
                      ]);

                      // Set initial animation
                      otherPlayer.play(playerData.isMoving ? 
                          `run-${playerData.direction}` : 
                          `idle-${playerData.direction}`
                      );

                      const otherPlayerNameTag = k.add([
                          k.text(playerData.username, { size: 16, color: k.rgb(255, 255, 255) }),
                          k.pos(playerData.x, playerData.y - 20),
                          k.anchor("center"),
                      ]);

                      otherPlayers.current[id] = {
                          sprite: otherPlayer,
                          nameTag: otherPlayerNameTag,
                          lastUpdate: currentTime,
                          direction: playerData.direction || "down",
                      };
                      
                      console.log('Added new player:', id);
                  } else {
                      const otherPlayer = otherPlayers.current[id];
                      
                      // Update interpolation targets
                      otherPlayer.sprite.startX = otherPlayer.sprite.pos.x;
                      otherPlayer.sprite.startY = otherPlayer.sprite.pos.y;
                      otherPlayer.sprite.targetX = playerData.x;
                      otherPlayer.sprite.targetY = playerData.y;
                      otherPlayer.sprite.interpolationStart = currentTime;
                      
                      // Update direction and animation
                      otherPlayer.direction = playerData.direction || otherPlayer.direction;
                      const targetAnim = playerData.isMoving ? 
                          `run-${otherPlayer.direction}` : 
                          `idle-${otherPlayer.direction}`;

                      if (otherPlayer.sprite.curAnim !== targetAnim) {
                          otherPlayer.sprite.play(targetAnim);
                      }

                      otherPlayer.lastUpdate = currentTime;
                  }
              }
          });

          // Clean up disconnected players
          Object.keys(otherPlayers.current).forEach((id) => {
              if (!players[id]) {
                  console.log('Removing disconnected player:', id);
                  otherPlayers.current[id].sprite.destroy();
                  otherPlayers.current[id].nameTag.destroy();
                  delete otherPlayers.current[id];
              }
          });
        });

        // Optimized game loop with input prediction
        k.onUpdate(() => {
          // Update player position and movement
          nameTag.pos.x = player.pos.x;
          nameTag.pos.y = player.pos.y - 20;
        
          let dx = 0, dy = 0;
          let newDirection = player.direction;
          let moving = false;
        
          // Movement input check
          if (k.isKeyDown("left")) {
            dx = -1;
            newDirection = "left";
            moving = true;
          } else if (k.isKeyDown("right")) {
            dx = 1;
            newDirection = "right";
            moving = true;
          }
        
          if (k.isKeyDown("up")) {
            dy = -1;
            newDirection = "up";
            moving = true;
          } else if (k.isKeyDown("down")) {
            dy = 1;
            newDirection = "down";
            moving = true;
          }
        
          // Apply movement with fixed speed (not affected by dt)
          if (moving) {
            if (dx !== 0 && dy !== 0) {
              dx *= 0.707;
              dy *= 0.707;
            }
        
            // Move with fixed speed
            const moveSpeed = PLAYER_SPEED / 60; // Convert to per-frame speed
            player.move(dx * moveSpeed, dy * moveSpeed);
        
            // Check for animation update
            if (!player.isMoving || player.direction !== newDirection) {
              player.play(`run-${newDirection}`);
              player.isMoving = true;
              player.direction = newDirection;
            }
          } else if (player.isMoving) {
            // Set to idle animation when not moving
            player.play(`idle-${player.direction}`);
            player.isMoving = false;
          }
        
          // Only send updates if actually moving or state changed
          const currentTime = Date.now();
          if (currentTime - lastUpdateRef.current >= UPDATE_INTERVAL && 
              (moving || player.isMoving)) {
            WebSocketService.movePlayer({
              username: playerName,
              x: player.pos.x,
              y: player.pos.y,
              direction: newDirection,
              isMoving: moving,
              timestamp: currentTime,
            });
            lastUpdateRef.current = currentTime;
          }
        
          // Handle other player movement and state updates
          // ... (previous code remains the same until the other player update section in onUpdate)

// Handle other player movement and state updates
          Object.values(otherPlayers.current).forEach((otherPlayer) => {
            const sprite = otherPlayer.sprite;
            const timeSinceStart = currentTime - sprite.interpolationStart;
            const interpolationProgress = Math.min(1, timeSinceStart / INTERPOLATION_DELAY);

            // Smooth position interpolation
            const newX = k.lerp(sprite.startX, sprite.targetX, interpolationProgress);
            const newY = k.lerp(sprite.startY, sprite.targetY, interpolationProgress);

            // Check if the player is actually moving
            const isMoving = Math.abs(newX - sprite.pos.x) > 0.1 || Math.abs(newY - sprite.pos.y) > 0.1;

            // Update position
            sprite.pos.x = newX;
            sprite.pos.y = newY;

            // Update animation based on movement state
            const currentAnim = sprite.curAnim;
            const targetAnim = isMoving ? 
              `run-${otherPlayer.direction}` : 
              `idle-${otherPlayer.direction}`;

            if (currentAnim !== targetAnim) {
              sprite.play(targetAnim);
            }

            // Update nametag position
            otherPlayer.nameTag.pos.x = sprite.pos.x;
            otherPlayer.nameTag.pos.y = sprite.pos.y - 20;
          });
        
          // Smooth camera follow
          const targetCamPos = player.pos;
          const currentCamPos = k.camPos();
          const smoothSpeed = 0.1;
        
          k.camPos(
            k.lerp(currentCamPos.x, targetCamPos.x, smoothSpeed),
            k.lerp(currentCamPos.y, targetCamPos.y, smoothSpeed)
          );
        });

        // Initial WebSocket connection
        WebSocketService.connect(
          playerName,
          spawnX,
          spawnY,
          () => {
            console.log("Connected to game server");
          },
          (error) => {
            console.error("Failed to connect to game server:", error);
          }
        );

      } catch (error) {
        console.error("Error loading map:", error);
      }
    };

    startGame();

    return () => {
      try {
        if (gameRef.current) {
          gameRef.current.destroy();
          gameRef.current = null;
        }
        WebSocketService.disconnect();
      } catch (error) {
        console.error('Error destroying game:', error);
      }
    };
  }, [playerName]);

  return (
    <canvas 
      ref={canvasRef} 
      id="game" 
      style={{ 
        width: '100%', 
        height: '100vh', 
        display: 'block' 
      }} 
    />
  );
}

export default GameCanvas;