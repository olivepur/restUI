package com.testdata.manager.model;

public class HelloResponse {
    private String message;
    private String timestamp;
    private String name;

    public HelloResponse(String message, String timestamp, String name) {
        this.message = message;
        this.timestamp = timestamp;
        this.name = name;
    }

    // Getters and setters
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
} 