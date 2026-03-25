const express = require('express');
const router = express.Router();
const controller = require('../controllers/voiceController');

// Voice Endpoints
router.post('/parse-voice', controller.parseVoice);
router.post('/save-record', controller.saveRecord);

// Reporting Endpoints
router.get('/reports/seasonal', controller.getSeasonalReport);
router.get('/expenses', controller.getAllExpenses);

// Management
router.get('/seasons', controller.getSeasons);
router.post('/seasons/set-active', controller.setActiveSeason);
router.get('/farms', controller.getFarms);

module.exports = router;
