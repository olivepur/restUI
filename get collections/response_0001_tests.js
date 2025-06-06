// Tests for WAUTTTDLCMROW0001
pw.test("Basic checks", () => {
    // 1. Check status
    pw.expect(pw.response.status).toBe(200);
    // 2. Check if body exists
    pw.expect(true).toBe(true);
    
});



 
 const vehicle = pw.response.body.vehicleDeviceInformation;
 const item_bop = vehicle.value.find(c => c.number === "B0P"); // B-zero-P

  pw.test("vehicle element is valid", () => {
  	  pw.expect(vehicle).not.null;
  });

  pw.test("bop is valid", () => {
  	  pw.expect(item_bop).not.null;
  });
  	
  pw.test("number is valid", () => {
  	  pw.expect(item_bop.number).toBe("B0P");
  });
  
  pw.test("indicatorId is valid", () => {
  	  pw.expect(item_bop.indicatorId).toBe(97);
  });
  pw.test("diagnosticAddress16bit is valid", () => {
  	  pw.expect(item_bop.diagnosticAddress16bit).toBe("4204");
  });
  pw.test("rateFlag is valid", () => {
  	  pw.expect(item_bop.rateFlag).toBe("U");
  });

  pw.test("type is empty", () => {
  	  pw.expect(item_bop.type).toBe.empty;
  });

  pw.test("content for semnticId=6 is valid", () => {
  	const content = item_bop.content.find(s => s.semanticId === 0);
  	pw.expect(content.value.trim()).toBe("B0P");
  });
  
  pw.test("content for semnticId=6 is valid", () => {
  	const content = item_bop.content.find(s => s.semanticId === 6);
  	pw.expect(content.value.trim()).toBe("89A123ABC");
  });
  
  
  // B0Q part
  const  item_boq = vehicle.value.find(c => c.number === "B0Q"); // B-zero-P
  
  pw.test("number is valid", () => {
  	  pw.expect(item_boq.number).toBe("B0Q");
  });
  pw.test("indicatorId is valid", () => {
  	  pw.expect(item_boq.indicatorId).toBe(98);
  });
  pw.test("diagnosticAddress16bit is valid", () => {
  	  pw.expect(item_boq.diagnosticAddress16bit).toBe("4204");
  });
  pw.test("rateFlag is valid", () => {
  	  pw.expect(item_boq.rateFlag).toBe("U");
  });

  pw.test("type is empty", () => {
  	  pw.expect(item_boq.type).toBe.empty;
  });
  
  pw.test("content for semnticId=0 is valid", () => {
  	content = item_boq.content.find(s => s.semanticId === 0);
  	pw.expect(content.value.trim()).toBe("B0Q");
  });
  
  pw.test("content for semnticId=96 is valid", () => {
  	content = item_boq.content.find(s => s.semanticId === 96);
    const revision = pw.env.get("Revision0001a");
  	pw.expect(content.value.trim()).toBe(revision);
  });

  pw.test("Ecu error status checks" , () => {
  	pw.expect(pw.response.body.ecu.status).toBe(404);
  	pw.expect(pw.response.body.ecu.message).toBe("Not Found");
    
  })
  pw.test("NonEcu error status checks" , () => {
  	pw.expect(pw.response.body.nonEcu.status).toBe("403");
    pw.expect(pw.response.body.nonEcu.message).toBe("Forbidden");
    
  })








// Set an environment variable
pw.env.set("variable", "value1");
pw.test("variable", () => {
    const variable = pw.env.get("variable");
    pw.expect(variable).toBe(variable);
});