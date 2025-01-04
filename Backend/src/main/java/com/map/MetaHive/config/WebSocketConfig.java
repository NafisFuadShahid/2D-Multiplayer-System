package com.map.MetaHive.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.context.annotation.Bean;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Configure message broker
        config.enableSimpleBroker("/topic"); // For broadcasting messages
        config.setApplicationDestinationPrefixes("/app"); // Prefix for messages sent from clients
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Configure WebSocket endpoint with SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow all origins for flexibility
                .withSockJS(); // Use SockJS as a fallback for WebSocket
    }

    @Bean
    public CorsFilter corsFilter() {
        // Configure CORS for the React app
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true); // Allow credentials (e.g., cookies, headers)
        config.addAllowedOrigin("http://localhost:3000"); // React development server
        config.addAllowedOrigin("http://127.0.0.1:3000"); // Alternate local development origin
        config.addAllowedHeader("*"); // Allow all headers
        config.addAllowedMethod("*"); // Allow all HTTP methods (GET, POST, etc.)

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); // Apply the CORS configuration
        return new CorsFilter(source); // Return the configured filter
    }
}
