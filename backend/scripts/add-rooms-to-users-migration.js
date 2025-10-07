/**
 * Database Migration Script: Add rooms column to users table
 *
 * This script adds a rooms column (JSON) to the users table to store room data for landlords.
 */

const { Pool } = require('pg');

// Database connection configuration (same as server.js)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
    ssl: false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting add rooms to users migration...');

        await client.query('BEGIN');

        // Check if rooms column exists, add it if not
        const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'rooms'
            AND table_schema = 'public'
        `);

        if (columnCheck.rows.length === 0) {
            console.log('   Adding rooms column to users table...');
            await client.query(`
                ALTER TABLE users ADD COLUMN rooms JSONB
            `);
            console.log('✅ Rooms column added successfully');
        } else {
            console.log('   Rooms column already exists');
        }

        // Add comment to the column
        await client.query(`
            COMMENT ON COLUMN users.rooms IS 'JSON array of room objects for landlord properties'
        `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('🎉 Migration script finished');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
}

module.exports = { runMigration };