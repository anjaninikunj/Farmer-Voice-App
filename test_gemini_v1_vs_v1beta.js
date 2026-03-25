const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
// Try v1 instead of v1beta
const urlV1 = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function testGemini() {
    console.log("Testing Gemini 1.5 Flash on V1...");
    try {
        const response = await axios.post(urlV1, {
            contents: [{ parts: [{ text: "Hello" }] }]
        });
        console.log("V1 Success!");
    } catch (e1) {
        console.log("V1 fail:", e1.message);
        console.log("Testing Gemini 1.5 Flash on V1BETA...");
        try {
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "Hello" }] }]
            });
            console.log("V1BETA Success!");
        } catch (e2) {
            console.log("V1BETA fail:", e2.message);
        }
    }
}

testGemini();
