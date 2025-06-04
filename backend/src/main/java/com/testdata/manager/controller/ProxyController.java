package com.testdata.manager.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {
    private static final Logger logger = LoggerFactory.getLogger(ProxyController.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "https://api.int.group-vehicle-file.com";

    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
    public ResponseEntity<String> proxyRequest(
            @RequestBody(required = false) String body,
            @RequestHeader HttpHeaders headers,
            HttpMethod method,
            HttpServletRequest request) {
        
        try {
            String requestUri = request.getRequestURI();
            String proxyPath = requestUri.substring(requestUri.indexOf("/api/proxy") + "/api/proxy".length());
            
            String targetUrl = UriComponentsBuilder
                .fromHttpUrl(BASE_URL)
                .path(proxyPath)
                .query(request.getQueryString())
                .build()
                .toUriString();
                
            logger.info("Proxying request to: {}", targetUrl);
            logger.debug("Request method: {}", method);
            logger.debug("Request headers: {}", headers);
            
            HttpHeaders proxyHeaders = new HttpHeaders();
            if (headers.getFirst("Authorization") != null) {
                String authHeader = headers.getFirst("Authorization");
                logger.debug("Forwarding Authorization header: {}", authHeader);
                proxyHeaders.set("Authorization", authHeader);
            }
            proxyHeaders.set("Accept", "application/json");
            proxyHeaders.set("Content-Type", "application/json");
            
            HttpEntity<String> httpEntity = new HttpEntity<>(body, proxyHeaders);
            
            logger.info("Sending request to target system...");
            ResponseEntity<String> response = restTemplate.exchange(
                targetUrl,
                method,
                httpEntity,
                String.class
            );
            
            logger.info("Received response with status: {}", response.getStatusCode());
            logger.debug("Response headers: {}", response.getHeaders());
            
            String responseBody = response.getBody();
            // Validate JSON response
            if (responseBody != null) {
                try {
                    // Try to parse the response as JSON to validate it
                    objectMapper.readTree(responseBody);
                    logger.debug("Response body is valid JSON: {}", responseBody);
                } catch (Exception e) {
                    logger.error("Invalid JSON response received: {}", responseBody);
                    logger.error("JSON parsing error: {}", e.getMessage());
                    return ResponseEntity
                        .status(500)
                        .body("{\"error\": \"Invalid JSON response from external API\", \"details\": \"" + e.getMessage() + "\"}");
                }
            } else {
                logger.warn("Received null response body");
                responseBody = "{}";  // Return empty JSON object instead of null
            }
            
            HttpHeaders responseHeaders = new HttpHeaders();
            response.getHeaders().forEach((key, value) -> {
                if (!isCorsHeader(key)) {
                    responseHeaders.put(key, value);
                }
            });
            
            return ResponseEntity
                .status(response.getStatusCode())
                .headers(responseHeaders)
                .body(responseBody);
            
        } catch (HttpStatusCodeException e) {
            logger.error("Error from target system: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            String errorBody = e.getResponseBodyAsString();
            
            // Try to ensure the error response is valid JSON
            try {
                if (errorBody != null && !errorBody.isEmpty()) {
                    objectMapper.readTree(errorBody);
                } else {
                    errorBody = "{\"error\": \"Empty response from external API\"}";
                }
            } catch (Exception jsonError) {
                logger.error("Error response is not valid JSON: {}", jsonError.getMessage());
                errorBody = "{\"error\": \"Invalid JSON in error response\", \"originalError\": \"" + 
                           e.getStatusCode() + ": " + e.getMessage() + "\"}";
            }
            
            HttpHeaders responseHeaders = new HttpHeaders();
            e.getResponseHeaders().forEach((key, value) -> {
                if (!isCorsHeader(key)) {
                    responseHeaders.put(key, value);
                }
            });
            
            return ResponseEntity
                .status(e.getStatusCode())
                .headers(responseHeaders)
                .body(errorBody);
        } catch (Exception e) {
            logger.error("Error proxying request: {}", e.getMessage(), e);
            return ResponseEntity
                .status(500)
                .body("{\"error\": \"Internal server error\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }
    
    private boolean isCorsHeader(String headerName) {
        return headerName.toLowerCase().startsWith("access-control-") ||
               headerName.toLowerCase().equals("origin") ||
               headerName.toLowerCase().equals("timing-allow-origin");
    }
} 