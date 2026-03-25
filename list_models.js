const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        const response = await axios.get(url);
        console.log("Available Models:");
        response.data.models.map(m => console.log(m.name));
    } catch (error) {
        console.log("Error listing models:", error.message);
    }
}

listModels();
