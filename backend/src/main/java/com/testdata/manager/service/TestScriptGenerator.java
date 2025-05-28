package com.testdata.manager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testdata.manager.model.TestCase;
import com.testdata.manager.model.ComponentData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class TestScriptGenerator {

    private final ObjectMapper objectMapper;

    public TestCase processFiles(MultipartFile request, MultipartFile response) throws IOException {
        if (request == null || response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Both request and response files are required");
        }

        TestCase testCase = new TestCase();
        
        try {
            // Store raw data
            testCase.setRequestData(new String(request.getBytes()));
            testCase.setResponseData(new String(response.getBytes()));

            // Parse response JSON
            JsonNode responseJson = objectMapper.readTree(response.getBytes());
            JsonNode vdi = responseJson.path("vehicleDeviceInformation").path("value");
            
            if (!vdi.isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid response format: vehicleDeviceInformation.value must be an array");
            }

            boolean foundB0P = false;
            boolean foundB0Q = false;

            for (JsonNode component : vdi) {
                String number = component.path("number").asText();
                ComponentData componentData = new ComponentData();
                componentData.setValue(component.path("rawContent").asText("").trim());
                componentData.setTimestamp(component.path("creationTimestamp").asText(""));
                componentData.setRateFlag(component.path("rateFlag").asText(""));
                componentData.setType(component.path("type").asText(""));
                componentData.setUser(component.path("user").asText(""));

                if ("B0P".equals(number)) {
                    testCase.setB0p(componentData);
                    foundB0P = true;
                } else if ("B0Q".equals(number)) {
                    testCase.setB0q(componentData);
                    foundB0Q = true;
                }
            }

            if (!foundB0P || !foundB0Q) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Response must contain both B0P and B0Q components");
            }

            // Parse request JSON for additional data
            JsonNode requestJson = objectMapper.readTree(request.getBytes());
            testCase.setVin(requestJson.path("metadata").path("vin").asText(""));
            testCase.setBrand(requestJson.path("metadata").path("brand").asText(""));
            testCase.setCountry(requestJson.path("metadata").path("country").asText(""));

            return testCase;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON format: " + e.getMessage());
        }
    }

    public String generateScript(TestCase testCase) {
        // Get response data as JsonNode for easier access
        JsonNode responseData;
        try {
            responseData = objectMapper.readTree(testCase.getResponseData());
        } catch (IOException e) {
            return "Error parsing response data: " + e.getMessage();
        }

        // Extract B0P and B0Q components
        JsonNode vdiValue = responseData.path("vehicleDeviceInformation").path("value");
        JsonNode b0p = null;
        JsonNode b0q = null;
        
        if (vdiValue.isArray()) {
            for (JsonNode component : vdiValue) {
                String number = component.path("number").asText();
                if ("B0P".equals(number)) {
                    b0p = component;
                } else if ("B0Q".equals(number)) {
                    b0q = component;
                }
            }
        }

        return String.format("""
            // Tests for %s
            pw.test("Basic checks", () => {
                // 1. Check status
                pw.expect(pw.response.status).toBe(200);
                
                // 2. Check if body exists
                if (pw.response.body) {
                    pw.expect(true).toBe(true);
                }
            });

            pw.test("Response structure", () => {
                // Check all main properties exist
                if (pw.response.body.hasOwnProperty('vehicleDeviceInformation')) {
                    pw.expect(true).toBe(true);
                }
                
                if (pw.response.body.hasOwnProperty('ecu')) {
                    pw.expect(true).toBe(true);
                }
                
                if (pw.response.body.hasOwnProperty('nonEcu')) {
                    pw.expect(true).toBe(true);
                }
            });

            pw.test("VehicleDeviceInformation check", () => {
                // Check VDI status if it exists
                if (pw.response.body.vehicleDeviceInformation && 
                    pw.response.body.vehicleDeviceInformation.hasOwnProperty('status')) {
                    pw.expect(pw.response.body.vehicleDeviceInformation.status).toBe(200);
                }
            });

            pw.test("B0P component check", () => {
                // Check if VDI and value array exist
                if (pw.response.body.vehicleDeviceInformation && 
                    pw.response.body.vehicleDeviceInformation.value) {
                    
                    // Find B0P component
                    const b0p = pw.response.body.vehicleDeviceInformation.value.find(
                        c => c.number === "B0P"
                    );
                    
                    if (b0p) {
                        // Check B0P properties
                        if (b0p.hasOwnProperty('indicatorId')) {
                            pw.expect(b0p.indicatorId).toBe(%d);
                        }
                        
                        if (b0p.hasOwnProperty('diagnosticAddress16bit')) {
                            pw.expect(b0p.diagnosticAddress16bit).toBe("%s");
                        }
                        
                        if (b0p.hasOwnProperty('rateFlag')) {
                            pw.expect(b0p.rateFlag).toBe("%s");
                        }
                        
                        // Check B0P content if it exists
                        if (b0p.content) {
                            const b0pValue = b0p.content.find(c => c.semanticId === 6);
                            if (b0pValue) {
                                pw.expect(b0pValue.value.trim()).toBe("%s");
                            }
                        }
                    }
                }
            });

            pw.test("B0Q component check", () => {
                // Check if VDI and value array exist
                if (pw.response.body.vehicleDeviceInformation && 
                    pw.response.body.vehicleDeviceInformation.value) {
                    
                    // Find B0Q component
                    const b0q = pw.response.body.vehicleDeviceInformation.value.find(
                        c => c.number === "B0Q"
                    );
                    
                    if (b0q) {
                        // Check B0Q properties
                        if (b0q.hasOwnProperty('indicatorId')) {
                            pw.expect(b0q.indicatorId).toBe(%d);
                        }
                        
                        if (b0q.hasOwnProperty('diagnosticAddress16bit')) {
                            pw.expect(b0q.diagnosticAddress16bit).toBe("%s");
                        }
                        
                        if (b0q.hasOwnProperty('rateFlag')) {
                            pw.expect(b0q.rateFlag).toBe("%s");
                        }
                        
                        // Check B0Q content if it exists
                        if (b0q.content) {
                            const b0qValue = b0q.content.find(c => c.semanticId === 96);
                            if (b0qValue) {
                                pw.expect(b0qValue.value).toBe("%s");
                            }
                        }
                    }
                }
            });

            pw.test("Error sections check", () => {
                // Check ECU status
                if (pw.response.body.ecu && 
                    pw.response.body.ecu.hasOwnProperty('status')) {
                    pw.expect(pw.response.body.ecu.status).toBe(404);
                }
                
                // Check nonECU status
                if (pw.response.body.nonEcu && 
                    pw.response.body.nonEcu.hasOwnProperty('status')) {
                    pw.expect(pw.response.body.nonEcu.status).toBe("%s");
                }
            });
            """,
            testCase.getVin(),
            b0p != null ? b0p.path("indicatorId").asInt() : 0,
            b0p != null ? b0p.path("diagnosticAddress16bit").asText() : "",
            b0p != null ? b0p.path("rateFlag").asText() : "",
            b0p != null ? b0p.path("content").get(1).path("value").asText().trim() : "",
            b0q != null ? b0q.path("indicatorId").asInt() : 0,
            b0q != null ? b0q.path("diagnosticAddress16bit").asText() : "",
            b0q != null ? b0q.path("rateFlag").asText() : "",
            b0q != null ? b0q.path("content").get(1).path("value").asText() : "",
            responseData.path("nonEcu").path("status").asText()
        );
    }

    public String exportScript(TestCase testCase) {
        try {
            return objectMapper.writeValueAsString(generateScript(testCase));
        } catch (Exception e) {
            return "Error generating script: " + e.getMessage();
        }
    }
} 