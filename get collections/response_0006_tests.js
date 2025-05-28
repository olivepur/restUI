// Test main response status
pw.test("Status code is 200", ()=> {
    pw.expect(pw.response.status).toBe(200);
});

// Test response structure
pw.test("Response has required sections", ()=> {
    const response = pw.response.body;
    pw.expect(Object.keys(response).includes("vehicleDeviceInformation")).toBe(true);
    pw.expect(Object.keys(response).includes("ecu")).toBe(true);
    pw.expect(Object.keys(response).includes("nonEcu")).toBe(true);
});

// Test vehicleDeviceInformation status
pw.test("VehicleDeviceInformation status is 200", ()=> {
    const vdi = pw.response.body.vehicleDeviceInformation;
    pw.expect(vdi.status).toBe(200);
});

// Test B0P component data
pw.test("B0P component has correct value", ()=> {
    const vdi = pw.response.body.vehicleDeviceInformation;
    if (vdi && vdi.value && vdi.value.length > 0) {
        const b0p = vdi.value.find(item => item.number === "B0P");
        pw.expect(b0p.rawContent.trim()).toBe("B0P15B123ABC");
    }
});

// Test B0Q component data
pw.test("B0Q component has correct value", ()=> {
    const vdi = pw.response.body.vehicleDeviceInformation;
    if (vdi && vdi.value && vdi.value.length > 0) {
        const b0q = vdi.value.find(item => item.number === "B0Q");
        pw.expect(b0q.rawContent.trim()).toBe("B0Q0005");
    }
});

// Test error sections
pw.test("ECU section has 404 status", ()=> {
    const ecu = pw.response.body.ecu;
    pw.expect(ecu.status).toBe(404);
});

pw.test("NonECU section has 404 status", ()=> {
    const nonEcu = pw.response.body.nonEcu;
    pw.expect(nonEcu.status).toBe(404);
});

// Basic checks
pw.test("Basic checks", () => {
    // 1. Check status
    pw.expect(pw.response.status).toBe(200);
    
    // 2. Check basic structure
    const response = pw.response.body;
    pw.expect(typeof response.vehicleDeviceInformation !== "undefined").toBe(true);
    pw.expect(typeof response.ecu !== "undefined").toBe(true);
    pw.expect(typeof response.nonEcu !== "undefined").toBe(true);
    
    // 3. Check VehicleDeviceInformation status
    const vdi = response.vehicleDeviceInformation;
    pw.expect(vdi.status).toBe(200);
    
    // 4. Check B0P component
    if (vdi && vdi.value && vdi.value.length > 0) {
        const b0p = vdi.value.find(c => c.number === "B0P");
        pw.expect(typeof b0p !== "undefined").toBe(true);
        if (b0p) {
            pw.expect(b0p.rateFlag).toBe("U");
            pw.expect(b0p.type).toBe("");
            pw.expect(b0p.user).toBe("user");
            pw.expect(b0p.rawContent.trim()).toBe("B0P15B123ABC");
            pw.expect(b0p.creationTimestamp).toBe("2025-05-25T06:45:00.03Z");
        }
    }
    
    // 5. Check B0Q component
    if (vdi && vdi.value && vdi.value.length > 0) {
        const b0q = vdi.value.find(c => c.number === "B0Q");
        pw.expect(typeof b0q !== "undefined").toBe(true);
        if (b0q) {
            pw.expect(b0q.rateFlag).toBe("U");
            pw.expect(b0q.type).toBe("");
            pw.expect(b0q.user).toBe("user");
            pw.expect(b0q.rawContent.trim()).toBe("B0Q0005");
            pw.expect(b0q.creationTimestamp).toBe("2025-05-21T12:45:00.03Z");
        }
    }
    
    // 6. Check error sections
    const ecu = response.ecu;
    const nonEcu = response.nonEcu;
    pw.expect(ecu.status).toBe(404);
    pw.expect(nonEcu.status).toBe(404);
}); 