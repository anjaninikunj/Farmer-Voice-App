const axios = require('axios');
require('dotenv').config();

const fs = require('fs');

const MASTER_PROMPT = `
You are a highly accurate Agricultural Data Parser for Gujarati farmers. 
Your task is to extract farm expense and fertilizer usage details from transcribed Gujarati/Hinglish speech.

OUTPUT FORMAT:
Always return a JSON object with this structure:
{
  "farm_name": string | null,
  "category": "Fertilizer" | "Labour" | "Purchase" | "Machine",
  "activity_type": "Planting" | "Weeding" | "Harvesting" | "Irrigation" | "Spraying" | "Purchase" | null,
  "item_name": "Urea" | "NPK" | "DAP" | "Potash" | "Organic" | "Medicine" | "Seed" | "NPK, Urea" | null,
  "payout_model": "Per-Vigha" | "Per-Person" | "Per-Pump" | "Per-Bag" | "Flat-Rate",
  "description": string,
  "worker_count": number | null,
  "vigha_count": number | null,
  "pump_count": number | null,
  "bag_count": number | null,
  "rate": number | null,
  "unit": string | null,
  "total_amount": number | null,
  "notes": string | null,
  "date": string (YYYY-MM-DD)
}

PAYOUT CALCULATION RULES:
1. PER-VIGHA: For 'Transplanting (Ropari)' or 'Harvesting Machine', use (vigha_count * rate).
2. PER-PERSON: For 'Weeding (Nidamar)', 'Watering (Pani)', or general Labour ('majur', 'મજૂર'), use (worker_count * rate). 
   - CRITICAL RULE: If a daily labourer wage (rate) is NOT directly mentioned, ALWAYS default "rate" to 200 and calculate the "total_amount".
3. PER-PUMP: If 'Pump' is mentioned for spreading fertilizer/medicine, use (pump_count * rate).
4. PER-BAG: For fertilizer application (e.g. Urea, NPK) by bag, use (bag_count * rate).
   - EXPLICIT RULE: If the user says "5 bags at 1200", set "bag_count" to 5 and "rate" to 1200. "total_amount" MUST be 6000.

SPECIFIC GUJARATI CONTEXT & NUMBER TRANSLATION:
- Gujarati numbers: એક(1), બે(2), ત્રણ(3), ચાર(4), પાંચ(5), છ(6), સાત(7), આઠ(8), નવ(9), દસ(10).
- If the phrase says "ચાર ચાર ગુણ" (four four bags) of two items (like NPK and Urea), the total "bag_count" is 8 (4 of each). 
- If the phrase says "ચાર ગુણ" (four bags), "bag_count" is 4.
- 'ગુણ' (gun) or 'થેલી' (theli) or 'બોરી' (bori) = bags.
- Recognize 'Jadeve Kshetra', 'Jadavvare', 'Jadavvare khetar', 'Jadevara' as 'Jada Farm'.
- Recognize 'Nidamar' as 'Weeding'.
- Recognize 'Majur' or 'Majuro' or 'મજૂર' as 'worker_count'.
- Ensure category is NEVER null. If multiple activities, use 'Fertilizer' as primary if fertilizer is applied, but ensure 'worker_count' and 'total_amount' for labor is strictly captured in the same payload.
`;

async function parseVoiceToJSON(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }

const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  try {
    const response = await axios.post(geminiUrl, {
      contents: [{ 
        parts: [{ 
          text: MASTER_PROMPT + "\n\nInput: " + text 
        }] 
      }]
    });

    const rawResponse = response.data.candidates[0].content.parts[0].text;
    fs.appendFileSync('ai_debug.log', `[SUCCESS] Input: ${text}\nResponse: ${rawResponse}\n\n`);
    const jsonString = rawResponse.replace(/```json|```/g, '').trim();
    const structuredData = JSON.parse(jsonString);

  // Fallback category if AI fails
  if (!structuredData.category) {
    if (text.includes('majur') || text.includes('મજુર')) structuredData.category = 'Labour';
    else if (text.includes('khatar') || text.includes('urea')) structuredData.category = 'Fertilizer';
    else if (text.includes('seed') || text.includes('biaran')) structuredData.category = 'Seeds';
    else if (text.includes('pani') || text.includes('water')) structuredData.category = 'Irrigation';
    else structuredData.category = 'Other';
  }

  // Date Logic
  if (!structuredData.date || structuredData.date === 'today') {
    structuredData.date = new Date().toISOString().split('T')[0];
  } else if (structuredData.date === 'yesterday') {
    const d = new Date(); d.setDate(d.getDate() - 1);
    structuredData.date = d.toISOString().split('T')[0];
  }

  return structuredData;
  }
  catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    fs.appendFileSync('ai_debug.log', `[ERROR] Input: ${text}\nError: ${errorMsg}\n\n`);
    
    // REGEX FALLBACK (If AI Fails or Quota Exceeded)
    console.warn("Gemini Quota/Error hit. Using Regex Fallback.");
    
    // Convert Gujarati numbers to English numbers 
    const gujToEng = (str) => str.replace(/[૦-૯]/g, d => "૦૧૨૩૪૫૬૭૮૯".indexOf(d));
    const normalizedText = gujToEng(text);
    
    const numMap = { 'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10 };
    const numWords = Object.keys(numMap).join('|');

    // 1. Detect raw farm name (English or Gujarati)
    const farmMatch = normalizedText.match(/(Ambe|Nikunj|Jadeve|Jadevere|Jada|Mohanbhai|Vadi|જાડેવે|જાડા|જાડો|મોહનભાઈ|જાડાવરે|જાદવ|જાડેવારે|અંબે|નિકુંજ|જાદવરે)/i);
    const rawFarm = farmMatch ? farmMatch[0] : "General Farm";
    
    // 2. Map Gujarati names to official Database names (English)
    const farmMap = {
        'નિકુંજ': 'Nikunj Farm',
        'Nikunj': 'Nikunj Farm',
        'અંબે': 'Ambe Farm',
        'Ambe': 'Ambe Farm',
        'જાદવ': 'Jadav Farm',
        'જાદવરે': 'Jadav Farm',
        'Jadeve': 'Jadevere Farm',
        'Jadevere': 'Jadevere Farm',
        'જાડેવારે': 'Jadevere Farm',
        'જાડા': 'Jadevere Farm',
        'Vadi': 'Vadi',
        'મોહનભાઈ': 'Mohanbhai Farm'
    };
    
    const farmName = farmMap[rawFarm] || rawFarm;

    const data = {
      farm_name: farmName,
      category: 'Other',
      activity_type: null,
      item_name: null,
      payout_model: 'Flat-Rate',
      description: text,
      worker_count: null, vigha_count: null, pump_count: null, bag_count: null,
      rate: null,
      unit: null, total_amount: null,
      notes: "Parsed by Fallback (Gemini Busy/Quota)",
      date: new Date().toISOString().split('T')[0]
    };

    // Robust Rate Parser (Find and Sum multiple amounts if mentioned)
    const ratePatterns = [
        new RegExp(`(\\d{2,6}|${numWords})\\s*(?:rupay|rs|rupees|rupiya|રૃપિસ|રૂપિયા|₹|દીઠ|ના|પ્રતિ|દીઠ|વિંગા|ગુણ|થેલા|થેલી)`, 'gi'),
        /(?:rupay|rs|rupees|rupiya|રૃપિસ|રૂપિયા|₹)\s*(\d{2,6})/gi,
        // Match: 1350 nu diesel, 300 driver ni majuri, etc. (allows skipping one word like 'driver')
        /(\d{2,6})\s*[\w\u0A80-\u0AFF]*\s*(?:નું|નો|ની|ના|nu|no|ni|na)\s*(?:ડીઝલ|ટ્રેક્ટર|ભાડું|ખર્ચ|મજૂરી|મજુર|મજુરી|diesel|tractor|labor|driver|majuri|ખાતર|ખાન)/gi, 
        /(?:મજૂરી|મજુર|મજુરી|diesel|tractor|labor|driver|majuri|ખર્ચ|ખાતર)\s*(?:ના|ની|nu|no|ni|na)\s*(\d{2,6})/gi
    ];

    let totalSum = 0;
    let ratesFound = [];

    for (const pattern of ratePatterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(normalizedText)) !== null) {
            const val = parseInt(match[1]) || (match[1] ? numMap[match[1]] : 0);
            if (val && !ratesFound.includes(val)) {
                ratesFound.push(val);
                totalSum += val;
            }
        }
    }
    
    if (totalSum > 0) {
        data.rate = totalSum;
    }

    // Fertilizer check
    if (normalizedText.includes('uriya') || normalizedText.includes('urea') || normalizedText.includes('khatar') || normalizedText.includes('યુરિયા') || normalizedText.includes('એમપીકે') || normalizedText.includes('ખાતર') || normalizedText.includes('ડીએપી')) {
        data.category = 'Fertilizer';
        data.item_name = (normalizedText.includes('uriya') || normalizedText.includes('urea') || normalizedText.includes('યુરિયા')) ? 'Urea' : 
                         (normalizedText.includes('એમપીકે') || normalizedText.includes('npk')) ? 'NPK' : 'Fertilizer';
        
        const bagMatch = normalizedText.match(new RegExp(`(\\d+|${numWords})\\s*(bag|thela|sack|bori|થેલા|બોરી|ગુણ|થેલી)`, 'i'));
        if (bagMatch) {
            data.bag_count = parseInt(bagMatch[1]) || numMap[bagMatch[1]] || 0;
            data.payout_model = 'Per-Bag';
        }
    } 
    
    // Seeds check
    if (normalizedText.includes('biaran') || normalizedText.includes('seeds') || normalizedText.includes('બીયારણ')) {
        data.category = 'Seeds';
    }

    // Irrigation check
    if (normalizedText.includes('pani') || normalizedText.includes('water') || normalizedText.includes('પાણી')) {
        data.category = 'Irrigation';
    }

    // Pump count check
    const pumpMatch = normalizedText.match(new RegExp(`(\\d+|${numWords})\\s*(pump|પમ્પ|પંપ|સ્પે)`, 'i'));
    if (pumpMatch) {
        data.pump_count = parseInt(pumpMatch[1]) || numMap[pumpMatch[1]] || 0;
        data.payout_model = 'Per-Pump';
    }

    // Vigha/Planting check
    const vighaMatch = normalizedText.match(new RegExp(`(\\d+|${numWords})\\s*(vigha|વીઘા|વિંગા|વીગા|વિઘા)`, 'i'));
    if (vighaMatch) {
        data.vigha_count = parseInt(vighaMatch[1]) || numMap[vighaMatch[1]] || 1;
        if (!data.payout_model || data.payout_model === 'Flat-Rate') {
            data.payout_model = 'Per-Vigha';
        }
    }

    // Labour / Worker check
    const workerMatch = normalizedText.match(new RegExp(`(\\d+|${numWords})\\s*(majur|labour|worker|મજુર|મજૂર|રોકણી|રોપણી)`, 'i'));
    if (workerMatch || normalizedText.includes('મજૂર') || normalizedText.includes('મજુર') || normalizedText.includes('રોકણી') || normalizedText.includes('રોપણી')) {
        data.worker_count = workerMatch ? (parseInt(workerMatch[1]) || numMap[workerMatch[1]] || 1) : 1;
        if (!data.vigha_count && (!data.payout_model || data.payout_model === 'Flat-Rate')) {
            data.payout_model = 'Per-Person';
            if (!data.rate) data.rate = 200; // Default wage
        }
    }

    // Final Category Decision logic
    const labourKeywords = ['ropyu', 'ropari', 'રોપણી', 'રોકણી', 'વીઘા', 'વિંગા', 'majur', 'મજુર', 'મજૂર', 'સાફ', 'ગવાલ', 'gaval'];
    if (labourKeywords.some(k => normalizedText.includes(k))) {
        data.category = 'Labour';
    }

    // Machine/Tractor check (Only if not already Labour/Transplanting)
    if ((normalizedText.includes('tractor') || normalizedText.includes('diesel') || normalizedText.includes('ટ્રેક્ટર') || normalizedText.includes('ડીઝલ') || normalizedText.includes('ખેડા')) && data.category !== 'Labour') {
        data.category = 'Machine';
        data.item_name = normalizedText.includes('diesel') ? 'Diesel' : 'Machine';
        if (data.item_name === 'Diesel' || normalizedText.includes('ડીઝલ')) {
            data.payout_model = 'Flat-Rate';
        }
    }

    // Special case for Irrigation override
    if (normalizedText.includes('pani') || normalizedText.includes('પાણી')) {
        data.category = 'Irrigation';
    }

    // Safe fallback total calculation
    if (data.rate) {
        if (data.payout_model === 'Per-Vigha' && data.vigha_count) data.total_amount = data.rate * data.vigha_count;
        else if (data.payout_model === 'Per-Bag' && data.bag_count) data.total_amount = data.rate * data.bag_count;
        else if (data.payout_model === 'Per-Pump' && data.pump_count) data.total_amount = data.rate * data.pump_count;
        else if (data.payout_model === 'Per-Person' && data.worker_count) data.total_amount = data.rate * data.worker_count;
        else data.total_amount = data.rate;
    }

    return data;
  }
}

module.exports = { parseVoiceToJSON };
