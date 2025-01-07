package com.map.MetaHive.controller;

import com.map.MetaHive.model.Player;
import com.map.MetaHive.service.GameSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class PlayerController {

    @Autowired
    private GameSessionService gameSessionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/createRoom")
    public void createRoom(@Payload Map<String, Object> payload) {  // Remove headerAccessor
        String username = (String) payload.get("username");
        String roomId = gameSessionService.createRoom();

        Map<String, Object> response = new HashMap<>();
        response.put("roomId", roomId);
        response.put("success", true);

        System.out.println("Room created: " + roomId);

        // Simply send to the queue directly
        messagingTemplate.convertAndSend("/queue/roomCreated", response);
    }

    @MessageMapping("/joinRoom")
    public void joinRoom(SimpMessageHeaderAccessor headerAccessor, @Payload Map<String, Object> payload) {
        String username = (String) payload.get("username");
        String roomId = (String) payload.get("roomId");

        Map<String, Object> response = new HashMap<>();
        response.put("success", gameSessionService.roomExists(roomId));  // Check if the room exists

        // Send response back to the client
        messagingTemplate.convertAndSend("/queue/joinResult", response);
    }

    @MessageMapping("/register")
    public void registerPlayer(@Payload Player player) {
        System.out.println("Registering player: " + player.getUsername() + " in room: " + player.getRoomId());
        gameSessionService.addPlayer(player);
        broadcastPlayerStates(player.getRoomId());
    }

    @MessageMapping("/move")
    public void movePlayer(@Payload Player playerMovement) {
        Player existingPlayer = gameSessionService.getPlayerById(
                playerMovement.getRoomId(),
                playerMovement.getId()
        );

        if (existingPlayer != null) {
            existingPlayer.setX(playerMovement.getX());
            existingPlayer.setY(playerMovement.getY());
            existingPlayer.setDirection(playerMovement.getDirection());
            existingPlayer.setIsMoving(playerMovement.getIsMoving());
            existingPlayer.setAnimation(playerMovement.getAnimation());
            existingPlayer.setTimestamp(playerMovement.getTimestamp());

            broadcastPlayerStates(playerMovement.getRoomId());
        }
    }

    private void broadcastPlayerStates(String roomId) {
        Map<String, Player> players = gameSessionService.getPlayersInRoom(roomId);
        System.out.println("Broadcasting player states for room " + roomId + ": " + players.size() + " players");
//        messagingTemplate.convertAndSend(
//                "/topic/rooms/" + roomId + "/players",
//                players
//        );
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/players", players);
    }
}