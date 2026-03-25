const db = require('../config/db');
const { parseVoiceToJSON } = require('../services/aiService');

exports.parseVoice = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const data = await parseVoiceToJSON(text);
    res.json(data);
  } catch (error) {
    console.error("AI Parse Error:", error.message);
    res.status(500).json({ error: 'AI parsing failed' });
  }
};

exports.saveRecord = async (req, res) => {
  const d = req.body;
  try {
    // 1. Get Farm ID or default to 1
    const farm = await db.query('SELECT id FROM farms WHERE name ILIKE $1 LIMIT 1', [`%${d.farm_name}%`]);
    const farmId = farm.rows[0]?.id || 1;

    // 2. Get active Season or default to 1
    const season = await db.query('SELECT id FROM seasons WHERE is_active = true LIMIT 1');
    const seasonId = season.rows[0]?.id || 1;

    // 3. Save to Expenses
    const query = `
      INSERT INTO expenses (
        farm_id, season_id, category, activity_type, item_name, description, 
        worker_count, vigha_count, pump_count, bag_count, rate, unit, 
        total_amount, notes, date, voice_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *`;
    
    const vals = [
      farmId, seasonId, d.category, d.activity_type, d.item_name, d.description, 
      d.worker_count, d.vigha_count, d.pump_count, d.bag_count, d.rate, d.unit, 
      d.total_amount, d.notes, d.date, d.voice_text || d.description
    ];

    const result = await db.query(query, vals);
    res.json({ success: true, record: result.rows[0] });
  } catch (e) {
    console.error("Save Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

exports.getSeasonalReport = async (req, res) => {
  try {
    const query = `
      SELECT s.name as season, f.name as farm, e.item_name, SUM(e.bag_count) as total_bags, e.unit
      FROM expenses e
      LEFT JOIN farms f ON e.farm_id = f.id
      LEFT JOIN seasons s ON e.season_id = s.id
      WHERE e.category = 'Fertilizer'
      GROUP BY s.name, f.name, e.item_name, e.unit
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const query = `
      SELECT e.*, COALESCE(f.name, 'General Farm') as farm_name, COALESCE(s.name, 'Global') as season_name
      FROM expenses e
      LEFT JOIN farms f ON e.farm_id = f.id
      LEFT JOIN seasons s ON e.season_id = s.id
      ORDER BY e.date DESC, e.created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
