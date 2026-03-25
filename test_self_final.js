const axios = require('axios');

async function testSelf() {
    console.log("--- Testing Full Flow: Nikunj Farm 1000 + 500 ---");
    try {
        const text = "નિકુંજ ખેતરે ચાર વીઘા જમીનમાં ટ્રેક્ટર થી ગવાલ કરવા માં આવ્યું. રુપીયા 1000 નું diesel એન્ડ 500 ડ્રાઈવર ની મજૂરી.";
        
        // 1. Simulate Parsing
        console.log("Asking AI/Fallback...");
        const parseResp = await axios.post('http://localhost:3000/api/parse-voice', { text });
        console.log("Parse Result:", JSON.stringify(parseResp.data, null, 2));
        
        // 2. Simulate Saving
        if (parseResp.data.rate || parseResp.data.total_amount) {
            console.log("Saving to DB...");
            const saveResp = await axios.post('http://localhost:3000/api/save-record', parseResp.data);
            console.log("Save Result:", JSON.stringify(saveResp.data, null, 2));
        } else {
            console.error("FAILED: No amount extracted!");
        }
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit();
    }
}

testSelf();
