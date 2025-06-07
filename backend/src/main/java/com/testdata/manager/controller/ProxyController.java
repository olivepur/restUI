package com.testdata.manager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import org.springframework.web.client.HttpStatusCodeException;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/proxy")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ProxyController {
    private static final Logger logger = LoggerFactory.getLogger(ProxyController.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private static final String TARGET_API = "https://api.int.group-vehicle-file.com";
    private static final String BEARER_PREFIX = "Bearer ";

    @Autowired
    public ProxyController(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    private String formatAuthorizationHeader(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        
        // If token already has Bearer prefix, use it as is
        if (token.trim().startsWith(BEARER_PREFIX)) {
            return token.trim();
        }
        
        // Otherwise, add the Bearer prefix
        return BEARER_PREFIX + token.trim();
    }

    @RequestMapping(value = "/**")
    public ResponseEntity<String> proxyRequest(
            @RequestBody(required = false) String body,
            HttpMethod method,
            @RequestHeader HttpHeaders headers,
            HttpServletRequest request) {
        
        try {
            // Get the path after /api/proxy
            String path = request.getRequestURI();
            path = path.substring(path.indexOf("/api/proxy") + "/api/proxy".length());
            
            // Create new headers
            HttpHeaders proxyHeaders = new HttpHeaders();
            
            // Set Accept header to explicitly request JSON
            List<MediaType> acceptTypes = Collections.singletonList(MediaType.APPLICATION_JSON);
            proxyHeaders.setAccept(acceptTypes);
            proxyHeaders.set("Accept", MediaType.APPLICATION_JSON_VALUE);

            // Handle authorization from UI headers only
            String clientAuth = headers.getFirst("Authorization");
            if (clientAuth != null && !clientAuth.trim().isEmpty()) {
                String effectiveAuth = formatAuthorizationHeader(clientAuth);
                proxyHeaders.set("Authorization", effectiveAuth);
                logger.debug("Using authorization header from UI");
            } else {
                logger.warn("No authorization header provided");
                return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\": \"Unauthorized\", \"message\": \"No authorization header provided\"}");
            }
            
            // Copy any other relevant headers except those that need special handling
            headers.forEach((key, value) -> {
                if (!key.equalsIgnoreCase("host") && 
                    !key.equalsIgnoreCase("referer") &&
                    !key.equalsIgnoreCase("content-length") &&
                    !key.equalsIgnoreCase("accept") &&
                    !key.equalsIgnoreCase("accept-encoding") &&
                    !key.equalsIgnoreCase("origin") &&
                    !key.equalsIgnoreCase("authorization") &&
                    !key.equalsIgnoreCase("user-agent")) {
                    proxyHeaders.put(key, value);
                }
            });
            
            String targetUrl = TARGET_API + path;
            logger.info("Proxying request to: {} with method: {}", targetUrl, method);
            logger.debug("Request headers: {}", proxyHeaders);

            HttpEntity<String> requestEntity = new HttpEntity<>(body, proxyHeaders);
            
            ResponseEntity<String> response = restTemplate.exchange(
                    targetUrl,
                    method,
                    requestEntity,
                    String.class
            );

            String responseBody = response.getBody();
            MediaType contentType = response.getHeaders().getContentType();
            
            logger.info("Received response with status: {} and content type: {}", 
                       response.getStatusCode(), contentType);
            logger.debug("Response body: {}", responseBody);

            // Verify JSON response
            if (responseBody != null) {
                try {
                    // Try to parse as JSON to ensure it's valid
                    objectMapper.readTree(responseBody);
                } catch (Exception e) {
                    logger.error("Invalid JSON response: {}", e.getMessage());
                    return ResponseEntity
                        .status(HttpStatus.BAD_GATEWAY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\": \"Invalid JSON response from target API\", \"message\": \"" + e.getMessage() + "\"}");
                }
            }

            // Create response headers
            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.APPLICATION_JSON);
            
            // Copy response headers except problematic ones
            response.getHeaders().forEach((key, value) -> {
                if (!key.equalsIgnoreCase("transfer-encoding") &&
                    !key.equalsIgnoreCase("content-encoding") &&
                    !key.equalsIgnoreCase("content-length") &&
                    !key.toLowerCase().startsWith("access-control-")) {
                    responseHeaders.put(key, value);
                }
            });
            
            return ResponseEntity
                    .status(response.getStatusCode())
                    .headers(responseHeaders)
                    .body(responseBody);
                    
        } catch (HttpStatusCodeException e) {
            logger.error("HTTP error from target API: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            
            // Create error response headers
            HttpHeaders errorHeaders = new HttpHeaders();
            errorHeaders.setContentType(MediaType.APPLICATION_JSON);
            
            String errorBody = e.getResponseBodyAsString();
            try {
                // Verify the error response is valid JSON
                objectMapper.readTree(errorBody);
            } catch (Exception jsonError) {
                // If not valid JSON, create a proper JSON error response
                errorBody = String.format(
                    "{\"error\": \"%s\", \"message\": \"%s\", \"status\": %d}",
                    e.getStatusCode(),
                    e.getStatusText(),
                    e.getRawStatusCode()
                );
            }
            
            return ResponseEntity
                .status(e.getStatusCode())
                .headers(errorHeaders)
                .body(errorBody);
        } catch (Exception e) {
            logger.error("Unexpected error: {}", e.getMessage(), e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\": \"Internal Server Error\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }
} 