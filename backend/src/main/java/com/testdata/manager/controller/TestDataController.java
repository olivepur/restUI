package com.testdata.manager.controller;

import com.testdata.manager.model.TestCase;
import com.testdata.manager.service.TestScriptGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;

import java.io.IOException;

@Slf4j
@RestController
@RequestMapping("/api/testdata")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class TestDataController {

    private final TestScriptGenerator testScriptGenerator;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFiles(
            @RequestParam(value = "request", required = false) MultipartFile request,
            @RequestParam(value = "response", required = false) MultipartFile response) {
        try {
            if (request == null || response == null) {
                log.error("Missing files - request: {}, response: {}", request != null, response != null);
                return ResponseEntity.badRequest().body("Both request and response files are required");
            }

            if (!request.getContentType().contains("json") || !response.getContentType().contains("json")) {
                log.error("Invalid content type - request: {}, response: {}", 
                    request.getContentType(), response.getContentType());
                return ResponseEntity.badRequest().body("Both files must be JSON");
            }

            log.info("Processing files - request size: {}, response size: {}", 
                request.getSize(), response.getSize());
            
            TestCase result = testScriptGenerator.processFiles(request, response);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error processing files", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Error processing files: " + e.getMessage());
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generateTestScript(@RequestBody TestCase testCase) {
        return ResponseEntity.ok(testScriptGenerator.generateScript(testCase));
    }

    @PostMapping("/export")
    public ResponseEntity<String> exportTestScript(@RequestBody TestCase testCase) {
        return ResponseEntity.ok(testScriptGenerator.exportScript(testCase));
    }
} 