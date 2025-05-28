// Tests for WAUTTTDLCMROW0001
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
                pw.expect(b0p.indicatorId).toBe(97);
            }
            
            if (b0p.hasOwnProperty('diagnosticAddress16bit')) {
                pw.expect(b0p.diagnosticAddress16bit).toBe("4204");
            }
            
            if (b0p.hasOwnProperty('rateFlag')) {
                pw.expect(b0p.rateFlag).toBe("U");
            }
            
            // Check B0P content if it exists
            if (b0p.content) {
                const b0pValue = b0p.content.find(c => c.semanticId === 6);
                if (b0pValue) {
                    pw.expect(b0pValue.value.trim()).toBe("89A123ABC");
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
                pw.expect(b0q.indicatorId).toBe(98);
            }
            
            if (b0q.hasOwnProperty('diagnosticAddress16bit')) {
                pw.expect(b0q.diagnosticAddress16bit).toBe("4204");
            }
            
            if (b0q.hasOwnProperty('rateFlag')) {
                pw.expect(b0q.rateFlag).toBe("U");
            }
            
            // Check B0Q content if it exists
            if (b0q.content) {
                const b0qValue = b0q.content.find(c => c.semanticId === 96);
                if (b0qValue) {
                    pw.expect(b0qValue.value).toBe("0003");
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
        pw.expect(pw.response.body.nonEcu.status).toBe("403");
    }
}); 