const db = require('./src/config/db');

async function checkLatestRecord() {
    try {
        console.log("--- Checking Latest 5 Expenses ---");
        const query = `
            SELECT e.id, e.farm_id, f.name as farm_name, e.category, e.total_amount, e.description, e.created_at
            FROM expenses e
            LEFT JOIN farms f ON e.farm_id = f.id
            ORDER BY e.created_at DESC LIMIT 5
        `;
        const result = await db.query(query);
        console.table(result.rows);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit();
    }
}

checkLatestRecord();
