package com.testdata.manager.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import com.testdata.manager.model.HelloResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/hello/{name}")
    public ResponseEntity<HelloResponse> sayHello(@PathVariable String name) {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        String message = "Hello, " + name + "!";
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        
        if(name.equals("E")) {
            HelloResponse errorResponse = new HelloResponse("Unauthorized access for " + name, timestamp, name);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }
        
        return ResponseEntity.ok(new HelloResponse(message, timestamp, name));
    }
} 