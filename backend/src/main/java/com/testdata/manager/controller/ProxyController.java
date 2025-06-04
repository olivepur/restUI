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

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {
    private static final Logger logger = LoggerFactory.getLogger(ProxyController.class);

    @Autowired
    private RestTemplate restTemplate;

    private static final String BASE_URL = "https://api.int.group-vehicle-file.com";

    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
    public ResponseEntity<String> proxyRequest(
            @RequestBody(required = false) String body,
            @RequestHeader HttpHeaders headers,
            HttpMethod method,
            HttpServletRequest request) {
        
        try {
            // Get the full request URI and extract the part after /api/proxy
            String requestUri = request.getRequestURI();
            String proxyPath = requestUri.substring(requestUri.indexOf("/api/proxy") + "/api/proxy".length());
            
            // Build the target URL
            String targetUrl = UriComponentsBuilder
                .fromHttpUrl(BASE_URL)
                .path(proxyPath)
                .query(request.getQueryString())
                .build()
                .toUriString();
                
            logger.info("Proxying request to: {}", targetUrl);
            logger.debug("Request method: {}", method);
            logger.debug("Request headers: {}", headers);
            
            // Forward all necessary headers
            HttpHeaders proxyHeaders = new HttpHeaders();
            if (headers.getFirst("Authorization") != null) {
                String authHeader = headers.getFirst("Authorization");
                logger.debug("Forwarding Authorization header: {}", authHeader);
                proxyHeaders.set("Authorization", authHeader);
            }
            proxyHeaders.set("Accept", "application/json");
            proxyHeaders.set("Content-Type", "application/json");
            
            // Create the request entity
            HttpEntity<String> httpEntity = new HttpEntity<>(body, proxyHeaders);
            
            // Make the request to the target system
            logger.info("Sending request to target system...");
            ResponseEntity<String> response = restTemplate.exchange(
                targetUrl,
                method,
                httpEntity,
                String.class
            );
            
            logger.info("Received response with status: {}", response.getStatusCode());
            logger.debug("Response headers: {}", response.getHeaders());
            logger.debug("Response body: {}", response.getBody());
            
            // Create new headers without CORS headers from the external API
            HttpHeaders responseHeaders = new HttpHeaders();
            response.getHeaders().forEach((key, value) -> {
                if (!isCorsHeader(key)) {
                    responseHeaders.put(key, value);
                }
            });
            
            return ResponseEntity
                .status(response.getStatusCode())
                .headers(responseHeaders)
                .body(response.getBody());
            
        } catch (HttpStatusCodeException e) {
            logger.error("Error from target system: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            
            // Create new headers without CORS headers from the error response
            HttpHeaders responseHeaders = new HttpHeaders();
            e.getResponseHeaders().forEach((key, value) -> {
                if (!isCorsHeader(key)) {
                    responseHeaders.put(key, value);
                }
            });
            
            return ResponseEntity
                .status(e.getStatusCode())
                .headers(responseHeaders)
                .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            logger.error("Error proxying request: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    private boolean isCorsHeader(String headerName) {
        return headerName.toLowerCase().startsWith("access-control-") ||
               headerName.toLowerCase().equals("origin") ||
               headerName.toLowerCase().equals("timing-allow-origin");
    }
} 