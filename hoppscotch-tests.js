// Authentication Tests
const authTests = {
  "Test Auth Token Generation": `
    pw.test("Status code is 200", ()=> {
      pw.expect(pw.response.status).toBe(200);
    });
    
    pw.test("Response has access token", ()=> {
      pw.expect(pw.response.body.access_token).toBeDefined();
    });
    
    pw.test("Store token in environment", ()=> {
      const token = pw.response.body.access_token;
      pw.env.set("access_token", token);
    });
  `,
};

// Component GET Request Tests
const componentTests = {
  "Test Component Response Structure": `
    // Test main response structure
    pw.test("Response has required sections", ()=> {
      pw.expect(pw.response.body).toHaveProperty("vehicleDeviceInformation");
      pw.expect(pw.response.body).toHaveProperty("ecu");
      pw.expect(pw.response.body).toHaveProperty("nonEcu");
    });

    // Test vehicleDeviceInformation section
    pw.test("VehicleDeviceInformation has correct structure", ()=> {
      const vdi = pw.response.body.vehicleDeviceInformation;
      pw.expect(vdi).toHaveProperty("value");
      pw.expect(vdi).toHaveProperty("status");
      pw.expect(vdi).toHaveProperty("message");
      pw.expect(vdi.status).toBe(200);
    });

    // Test component data
    pw.test("Components have required fields", ()=> {
      const components = pw.response.body.vehicleDeviceInformation.value;
      components.forEach(component => {
        pw.expect(component).toHaveProperty("number");
        pw.expect(component).toHaveProperty("rateFlag");
        pw.expect(component).toHaveProperty("type");
        
        // Check if component has content (some responses do)
        if (component.content) {
          pw.expect(Array.isArray(component.content)).toBe(true);
          component.content.forEach(content => {
            pw.expect(content).toHaveProperty("semanticId");
            pw.expect(content).toHaveProperty("value");
          });
        }

        // Check if component has rawContent (some responses do)
        if (component.rawContent) {
          pw.expect(typeof component.rawContent).toBe("string");
        }
      });
    });

    // Test specific component types exist
    pw.test("Required components exist", ()=> {
      const components = pw.response.body.vehicleDeviceInformation.value;
      const componentNumbers = components.map(c => c.number);
      pw.expect(componentNumbers).toContain("B0P");
      pw.expect(componentNumbers).toContain("B0Q");
    });

    // Test ECU and nonECU sections
    pw.test("ECU and nonECU sections have correct structure", ()=> {
      ["ecu", "nonEcu"].forEach(section => {
        const sectionData = pw.response.body[section];
        pw.expect(sectionData).toHaveProperty("value");
        pw.expect(sectionData).toHaveProperty("status");
        pw.expect(sectionData).toHaveProperty("message");
        pw.expect(Array.isArray(sectionData.value)).toBe(true);
      });
    });
  `,
};

// Test Scenarios
const testScenarios = {
  "Full Component Validation": `
    // Store VIN for later use
    const vin = pw.request.endpoint.split("/").pop();
    pw.env.set("current_vin", vin);

    // Test B0P component
    pw.test("Validate B0P component", ()=> {
      const b0p = pw.response.body.vehicleDeviceInformation.value.find(c => c.number === "B0P");
      pw.expect(b0p).toBeDefined();
      
      if (b0p.content) {
        const semanticValue = b0p.content.find(c => c.semanticId === 6);
        if (semanticValue) {
          pw.env.set("b0p_value", semanticValue.value.trim());
        }
      }
    });

    // Test B0Q component
    pw.test("Validate B0Q component", ()=> {
      const b0q = pw.response.body.vehicleDeviceInformation.value.find(c => c.number === "B0Q");
      pw.expect(b0q).toBeDefined();
      
      if (b0q.content) {
        const semanticValue = b0q.content.find(c => c.semanticId === 96);
        if (semanticValue) {
          pw.env.set("b0q_value", semanticValue.value);
        }
      }
    });
  `,
};

// Pre-request Script for Authentication
const preRequestAuth = `
  // Clear any existing token
  pw.env.set("access_token", "");
`;

// Pre-request Script for Protected Endpoints
const preRequestProtected = `
  // Verify token exists
  const token = pw.env.get("access_token");
  if (!token) {
    throw new Error("No access token found. Please authenticate first.");
  }
`;

// Test Execution Order
const testFlow = `
1. Execute Auth Token Request:
   - Use preRequestAuth
   - Apply authTests
   - Store token in environment

2. Execute GET Component Request:
   - Use preRequestProtected
   - Apply componentTests
   - Apply testScenarios
   - Store component values in environment

3. Execute PATCH Request (if needed):
   - Use preRequestProtected
   - Use stored component values
   - Validate response
`; 