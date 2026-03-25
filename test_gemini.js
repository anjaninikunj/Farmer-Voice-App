const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function testGemini() {
    console.log("Testing Gemini API Key...");
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hello, are you active?" }] }]
        });
        console.log("Response Success!");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log("Response Error:");
        if (error.response) {
            console.log(JSON.stringify(error.response.data, null, 2));
        } else {
            console.log(error.message);
        }
    }
}

testGemini();
