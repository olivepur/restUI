package com.testdata.manager.model;

import lombok.Data;

@Data
public class TestCase {
    private String vin;
    private String brand;
    private String country;
    private ComponentData b0p;
    private ComponentData b0q;
    private String requestData;
    private String responseData;
} 