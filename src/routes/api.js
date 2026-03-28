const express = require('express');
const router = express.Router();
const controller = require('../controllers/voiceController');

// Voice Endpoints
router.post('/parse-voice', controller.parseVoice);
router.post('/save-record', controller.saveRecord);

// Reporting Endpoints
router.get('/reports/seasonal', controller.getSeasonalReport);
router.get('/expenses', controller.getAllExpenses);
router.put('/expenses/:id', controller.updateExpense);
router.delete('/expenses/:id', controller.deleteExpense);

// Management
router.get('/seasons', controller.getSeasons);
router.post('/seasons/set-active', controller.setActiveSeason);
router.get('/farms', controller.getFarms);

module.exports = router;
