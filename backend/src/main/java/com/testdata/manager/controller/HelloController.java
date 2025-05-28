package com.testdata.manager.controller;

import org.springframework.web.bind.annotation.*;
import com.testdata.manager.model.HelloResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/hello/{name}")
    public HelloResponse sayHello(@PathVariable String name) {
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        String message = "Hello, " + name + "!";
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        return new HelloResponse(message, timestamp, name);
    }
} 