/**
 * Database Migration Script: Add payment_type and payment_day_of_month fields to tenancies table
 *
 * This script adds the new payment type fields to support cycle-based and calendar-based payments.
 */

const { Pool } = require('pg');
const path = require('path');

// Database connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
    ssl: false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting payment type migration...');

        await client.query('BEGIN');

        // Check if payment_type column exists
        const typeColumnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tenancies'
            AND column_name = 'payment_type'
            AND table_schema = 'public'
        `);

        const typeColumnExists = typeColumnCheck.rows.length > 0;

        if (!typeColumnExists) {
            console.log('📝 Adding payment_type and payment_day_of_month columns to tenancies table...');

            // Add the payment_type column
            await client.query(`
                ALTER TABLE tenancies
                ADD COLUMN payment_type VARCHAR(20) DEFAULT 'cycle'
                CHECK (payment_type IN ('cycle', 'calendar'))
            `);

            // Add the payment_day_of_month column
            await client.query(`
                ALTER TABLE tenancies
                ADD COLUMN payment_day_of_month INTEGER
                CHECK (payment_day_of_month >= 1 AND payment_day_of_month <= 31)
            `);

            console.log('✅ payment_type and payment_day_of_month columns added successfully');
        } else {
            console.log('ℹ️  payment_type column already exists');
        }

        // Update existing records to set payment_type to 'cycle' for backward compatibility
        const updateResult = await client.query(`
            UPDATE tenancies
            SET payment_type = 'cycle'
            WHERE payment_type IS NULL
        `);

        console.log(`🔄 Updated ${updateResult.rowCount} existing tenancy records with payment_type = 'cycle'`);

        // Verify the migration was successful
        const verificationResult = await client.query(`
            SELECT
                COUNT(*) as total_tenancies,
                COUNT(CASE WHEN payment_type = 'cycle' THEN 1 END) as cycle_count,
                COUNT(CASE WHEN payment_type IS NULL THEN 1 END) as null_count
            FROM tenancies
        `);

        const stats = verificationResult.rows[0];
        console.log('📊 Migration verification:');
        console.log(`   Total tenancies: ${stats.total_tenancies}`);
        console.log(`   Cycle payments: ${stats.cycle_count}`);
        console.log(`   NULL payment types: ${stats.null_count}`);

        if (parseInt(stats.null_count) > 0) {
            throw new Error(`Migration failed: ${stats.null_count} records still have NULL payment_type`);
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