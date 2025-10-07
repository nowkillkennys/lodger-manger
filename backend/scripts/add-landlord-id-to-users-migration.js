/**
 * Database Migration Script: Add landlord_id field to users table
 *
 * This script adds a landlord_id field to track which landlord created which lodger.
 * It can be run safely multiple times.
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting landlord_id migration...');

        await client.query('BEGIN');

        // Check if landlord_id column exists
        const columnCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'landlord_id'
            AND table_schema = 'public'
        `);

        const columnExists = columnCheck.rows.length > 0;

        if (!columnExists) {
            console.log('📝 Adding landlord_id column to users table...');

            // Add the landlord_id column
            await client.query(`
                ALTER TABLE users
                ADD COLUMN landlord_id UUID REFERENCES users(id) ON DELETE SET NULL
            `);

            console.log('✅ landlord_id column added successfully');

            // Update existing lodgers to set landlord_id based on their tenancies
            console.log('🔄 Updating existing lodgers with landlord_id from tenancies...');
            const updateResult = await client.query(`
                UPDATE users u
                SET landlord_id = (
                    SELECT t.landlord_id
                    FROM tenancies t
                    WHERE t.lodger_id = u.id
                    ORDER BY t.created_at ASC
                    LIMIT 1
                )
                WHERE u.user_type = 'lodger'
                AND u.landlord_id IS NULL
            `);

            console.log(`✅ Updated ${updateResult.rowCount} existing lodger records with landlord_id`);
        } else {
            console.log('ℹ️  landlord_id column already exists');
        }

        // Verify the migration was successful
        const verificationResult = await client.query(`
            SELECT
                COUNT(*) FILTER (WHERE user_type = 'lodger') as total_lodgers,
                COUNT(*) FILTER (WHERE user_type = 'lodger' AND landlord_id IS NOT NULL) as lodgers_with_landlord,
                COUNT(*) FILTER (WHERE user_type = 'lodger' AND landlord_id IS NULL) as lodgers_without_landlord
            FROM users
        `);

        const stats = verificationResult.rows[0];
        console.log('📊 Migration verification:');
        console.log(`   Total lodgers: ${stats.total_lodgers}`);
        console.log(`   Lodgers with landlord_id: ${stats.lodgers_with_landlord}`);
        console.log(`   Lodgers without landlord_id: ${stats.lodgers_without_landlord}`);

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
