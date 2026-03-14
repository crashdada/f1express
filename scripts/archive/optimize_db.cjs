const Database = require('better-sqlite3');
const db = new Database('C:\\Users\\jaymz\\Desktop\\oc\\f1-website\\public\\f1.db');

console.log('=== Optimizing Database Performance ===');

try {
    // 1. Add indexes for faster joins and lookups
    console.log('- Adding indexes...');
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_race_results_driver_id ON race_results(driver_id);
    CREATE INDEX IF NOT EXISTS idx_race_results_team_id ON race_results(team_id);
    CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);
    CREATE INDEX IF NOT EXISTS idx_races_season ON races(season);
    CREATE INDEX IF NOT EXISTS idx_races_round ON races(round_number);
  `);

    // 2. Denormalize: Add team_color to drivers table for faster querying
    console.log('- Denormalizing driver team colors...');

    // Check if column exists
    const tableInfo = db.prepare("PRAGMA table_info(drivers)").all();
    const hasColorCol = tableInfo.some(col => col.name === 'team_color');

    if (!hasColorCol) {
        db.prepare("ALTER TABLE drivers ADD COLUMN team_color TEXT").run();
        console.log('  Added team_color column to drivers table.');
    }

    // Pre-calculate and fill the team_color
    const drivers = db.prepare("SELECT driver_id FROM drivers").all();

    const updateStmt = db.prepare(`
    UPDATE drivers SET team_color = COALESCE(
      (SELECT t.color
       FROM race_results rr2
       JOIN races r2 ON rr2.race_id = r2.race_id
       JOIN teams t ON rr2.team_id = t.team_id
       WHERE rr2.driver_id = ? AND r2.season >= 2024
       ORDER BY r2.season DESC, r2.round_number DESC
       LIMIT 1),
      (SELECT t.color
       FROM race_results rr3
       JOIN teams t ON rr3.team_id = t.team_id
       WHERE rr3.driver_id = ?
       GROUP BY t.team_id
       ORDER BY SUM(rr3.points) DESC
       LIMIT 1)
    ) WHERE driver_id = ?
  `);

    const transaction = db.transaction((driversList) => {
        for (const driver of driversList) {
            updateStmt.run(driver.driver_id, driver.driver_id, driver.driver_id);
        }
    });

    transaction(drivers);
    console.log(`  Updated team_color for ${drivers.length} drivers.`);

    // 3. VACUUM the database to optimize file size and structure
    console.log('- Vacuuming database...');
    db.exec('VACUUM');

    console.log('\n✅ Database optimization complete.');
} catch (err) {
    console.error('❌ Optimization failed:', err.message);
} finally {
    db.close();
}
