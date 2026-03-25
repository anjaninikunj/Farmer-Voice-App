const db = require('./src/config/db');

async function checkData() {
    try {
        console.log("--- Checking Farms ---");
        const farms = await db.query('SELECT * FROM farms');
        console.table(farms.rows);

        console.log("\n--- Checking Expenses with Farm Join ---");
        const query = `
            SELECT e.id, e.farm_id, f.name as farm_name, e.category, e.total_amount
            FROM expenses e
            LEFT JOIN farms f ON e.farm_id = f.id
            ORDER BY e.created_at DESC LIMIT 20
        `;
        const result = await db.query(query);
        console.table(result.rows);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        // Safe exit
        process.exit();
    }
}

checkData();
