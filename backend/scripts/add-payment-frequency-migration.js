/**
 * Database Migration Script: Add payment_frequency field to tenancies table
 *
 * This script ensures that all existing tenancy records have the payment_frequency
 * field set to '4-weekly' for backward compatibility. It can be run safely multiple times.
 */

const { Pool } = require('pg');
const path = require('path');

// Database connection configuration (same as server.js)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
    ssl: false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting payment_frequency migration...');

        await client.query('BEGIN');

        // Check if payment_frequency column exists
        const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tenancies'
            AND column_name = 'payment_frequency'
            AND table_schema = 'public'
        `);

        const columnExists = columnCheck.rows.length > 0;

        if (!columnExists) {
            console.log('📝 Adding payment_frequency column to tenancies table...');

            // Add the payment_frequency column with default value
            await client.query(`
                ALTER TABLE tenancies
                ADD COLUMN payment_frequency VARCHAR(20) DEFAULT '4-weekly'
                CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'monthly', '4-weekly'))
            `);

            console.log('✅ payment_frequency column added successfully');
        } else {
            console.log('ℹ️  payment_frequency column already exists');
        }

        // Update any existing records that have NULL payment_frequency to '4-weekly'
        const updateResult = await client.query(`
            UPDATE tenancies
            SET payment_frequency = '4-weekly'
            WHERE payment_frequency IS NULL
        `);

        console.log(`🔄 Updated ${updateResult.rowCount} existing tenancy records with payment_frequency = '4-weekly'`);

        // Verify the migration was successful
        const verificationResult = await client.query(`
            SELECT
                COUNT(*) as total_tenancies,
                COUNT(CASE WHEN payment_frequency = '4-weekly' THEN 1 END) as four_weekly_count,
                COUNT(CASE WHEN payment_frequency IS NULL THEN 1 END) as null_count
            FROM tenancies
        `);

        const stats = verificationResult.rows[0];
        console.log('📊 Migration verification:');
        console.log(`   Total tenancies: ${stats.total_tenancies}`);
        console.log(`   4-weekly frequency: ${stats.four_weekly_count}`);
        console.log(`   NULL frequency: ${stats.null_count}`);

        if (parseInt(stats.null_count) > 0) {
            throw new Error(`Migration failed: ${stats.null_count} records still have NULL payment_frequency`);
        }

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