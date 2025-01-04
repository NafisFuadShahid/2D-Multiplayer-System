package com.map.MetaHive.controller;


import com.map.MetaHive.model.Player;
import com.map.MetaHive.service.GameSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class PlayerController {

    @Autowired
    private GameSessionService gameSessionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/register")
    public void registerPlayer(Player player) {
        gameSessionService.addPlayer(player);
        broadcastPlayerStates();
    }

    @MessageMapping("/move")
    public void movePlayer(Player playerMovement) {
        Player existingPlayer = gameSessionService.getPlayerById(playerMovement.getId());

        if (existingPlayer != null) {
            existingPlayer.setX(playerMovement.getX());
            existingPlayer.setY(playerMovement.getY());
            existingPlayer.setDirection(playerMovement.getDirection());
            existingPlayer.setIsMoving(playerMovement.getIsMoving());
            existingPlayer.setAnimation(playerMovement.getAnimation());
            existingPlayer.setTimestamp(playerMovement.getTimestamp());

            broadcastPlayerStates();
        }
    }

    private void broadcastPlayerStates() {
        messagingTemplate.convertAndSend("/topic/players", gameSessionService.getAllPlayers());
    }
}
