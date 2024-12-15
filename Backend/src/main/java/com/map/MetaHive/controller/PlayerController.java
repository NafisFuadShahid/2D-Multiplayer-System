package com.map.MetaHive.controller;


import com.map.MetaHive.model.Player;
import com.map.MetaHive.service.GameSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class PlayerController {

    @Autowired
    private GameSessionService gameSessionService;

    @MessageMapping("/register")
    @SendTo("/topic/players")
    public Player registerPlayer(Player player) {
        gameSessionService.addPlayer(player);
        return player;
    }

    @MessageMapping("/move")
    @SendTo("/topic/players")
    public Player movePlayer(Player playerMovement) {
        Player existingPlayer = gameSessionService.getPlayerById(playerMovement.getId());

        if (existingPlayer != null) {
            existingPlayer.setX(playerMovement.getX());
            existingPlayer.setY(playerMovement.getY());
        }

        return existingPlayer;
    }
}