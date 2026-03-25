const { parseVoiceToJSON } = require('./src/services/aiService');

async function test() {
    const cases = [
        "જાદવ મારે ખેતરે પાંચ વીઘામાં પાંચની રોકણી કરવામાં આવી છે એક વીઘા ના 2500 રૂપિયા આપવાના નક્કી કર્યા છે",
        "જાડા વારે ખેતરે એક મજૂરને પાણી ભરવા માટે મોકલ્યો હતો",
        "જાડો મારે ખેતરે પાંચ વીઘામાં ભાતની રોપણી કરવામાં આવી છે એક વીઘા દીઠ ૨૫૦૦ રૂપિયા નક્કી કર્યા છે",
        "આજે જાડેવારે ખેતરમાં આજે ભાટ ની રોપરી કરવામાં આવી 5 વીઘા માં . કિરીટભાઈ ના મજુર થઇ. એક વીઘાના રૃપિસ 2500 નક્કી કાર્ય છે .",
        "જાડા ખેતર એક ટ્રેક્ટરની મદદથી પાંચ વીઘા જમીન ખેડા કરવામાં આવી છે એ માટે 2000 નો ડીઝલ કરવામાં આવ્યું.",
        "Ambe farm ma 10 pump nakhya khatar na 50 rupiya ek pump na",
        "નિકુંજ ખેતરે  પાંચ વીઘા જમીનમાં ટ્રેક્ટર થી ગવાલ કરવા માં આવ્યું. રુપીયા  1350 નું diesel એન્ડ 300 ડ્રાઈવર  ની મજૂરી.",
        "નિકુલ સાંપડ 4 એમપીકે અને ચાર યુરિયા ખાતર નાખવામાં આવ્યું",
        "નિકુલ વારા ખેતરે ચાર યુરિયા ખાતર નાખવામાં આવ્યું"
    ];

    for (const text of cases) {
        process.env.GEMINI_API_KEY = "dummy"; // Force fallback
        console.log(`\nTesting: ${text}`);
        const result = await parseVoiceToJSON(text);
        console.log(`Result:`, JSON.stringify(result, null, 2));
    }
}

test().catch(e => console.error(e));
