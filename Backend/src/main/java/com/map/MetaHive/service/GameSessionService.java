package com.map.MetaHive.service;

import com.map.MetaHive.model.Player;
import com.map.MetaHive.model.Room;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameSessionService {
    private Map<String, Room> activeRooms = new ConcurrentHashMap<>();
    private static final int ROOM_ID_LENGTH = 6;
    private static final String ROOM_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public String createRoom() {
        String roomId;
        do {
            roomId = generateRoomId();  // Generate a random room ID
        } while (activeRooms.containsKey(roomId));  // Ensure the room ID is unique

        // Log the room creation
        System.out.println("Room created with ID: " + roomId);

        Room newRoom = new Room(roomId);  // Create a new room object
        activeRooms.put(roomId, newRoom);  // Add the room to activeRooms
        return roomId;  // Return the generated room ID
    }

    private String generateRoomId() {
        Random random = new Random();
        StringBuilder roomId = new StringBuilder();

        for (int i = 0; i < ROOM_ID_LENGTH; i++) {
            int index = random.nextInt(ROOM_ID_CHARS.length());
            roomId.append(ROOM_ID_CHARS.charAt(index));
        }

        return roomId.toString();
    }

    public boolean joinRoom(String roomId, Player player) {
        Room room = activeRooms.get(roomId);
        if (room != null) {
            room.addPlayer(player);
            return true;
        }
        return false;
    }

    public void addPlayer(Player player) {
        Room room = activeRooms.get(player.getRoomId());
        if (room != null) {
            System.out.println("Adding player to room " + player.getRoomId() + ": " + player.getUsername());
            room.addPlayer(player);
            System.out.println("Current players in room: " + room.getPlayers().size());
        } else {
            System.out.println("Failed to add player - room not found: " + player.getRoomId());
        }
    }

    public Map<String, Player>getPlayersInRoom(String roomId) {
        Room room = activeRooms.get(roomId);
        if (room != null) {
            System.out.println("Getting players for room " + roomId + ": " + room.getPlayers().size() + " players");
            return room.getPlayers();
        }
        System.out.println("Room not found: " + roomId);
        return new ConcurrentHashMap<>();
    }

    public Player getPlayerById(String roomId, String playerId) {
        Room room = activeRooms.get(roomId);
        if (room != null) {
            return room.getPlayers().get(playerId);
        }
        return null;
    }

    public void removePlayer(String roomId, String playerId) {
        Room room = activeRooms.get(roomId);
        if (room != null) {
            room.removePlayer(playerId);

            // Remove room if empty
            if (room.getPlayers().isEmpty()) {
                activeRooms.remove(roomId);
            }
        }
    }



    public boolean roomExists(String roomId) {
        return activeRooms.containsKey(roomId);
    }
}
