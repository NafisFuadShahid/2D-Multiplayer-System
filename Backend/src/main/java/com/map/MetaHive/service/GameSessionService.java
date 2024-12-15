package com.map.MetaHive.service;


import com.map.MetaHive.model.Player;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameSessionService {
    private Map<String, Player> activePlayers = new ConcurrentHashMap<>();

    public void addPlayer(Player player) {
        activePlayers.put(player.getId(), player);
    }

    public Player getPlayerById(String playerId) {
        return activePlayers.get(playerId);
    }

    public void removePlayer(String playerId) {
        activePlayers.remove(playerId);
    }

    public Map<String, Player> getAllPlayers() {
        return activePlayers;
    }
}