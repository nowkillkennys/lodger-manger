/**
 * Database Migration Script: Convert to structured address fields
 *
 * This script adds structured address fields (house_number, street_name, city, county, postcode)
 * to both users and tenancies tables, migrates existing address data, and removes old address columns.
 */

const { Pool } = require('pg');
const path = require('path');

// Database connection configuration (same as server.js)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
    ssl: false
});

/**
 * Parse a free-text address into structured components
 * This is a best-effort parser for UK addresses
 */
function parseAddress(addressString) {
    if (!addressString || typeof addressString !== 'string') {
        return {
            house_number: null,
            street_name: null,
            city: null,
            county: null,
            postcode: null
        };
    }

    const address = addressString.trim();

    // Extract postcode (UK format: e.g., SW1A 1AA, M1 1AA, etc.)
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
    const postcodeMatch = address.match(postcodeRegex);
    let postcode = null;
    let addressWithoutPostcode = address;

    if (postcodeMatch) {
        postcode = postcodeMatch[1].toUpperCase();
        addressWithoutPostcode = address.replace(postcodeMatch[0], '').trim();
    }

    // Split by commas to get address components
    const parts = addressWithoutPostcode.split(',').map(p => p.trim()).filter(p => p);

    let house_number = null;
    let street_name = null;
    let city = null;
    let county = null;

    if (parts.length >= 1) {
        // First part usually contains house number and street
        const firstPart = parts[0];
        const houseNumberMatch = firstPart.match(/^(\d+[A-Z]?)\s+(.+)/);

        if (houseNumberMatch) {
            house_number = houseNumberMatch[1];
            street_name = houseNumberMatch[2];
        } else {
            street_name = firstPart;
        }
    }

    if (parts.length >= 2) {
        city = parts[1];
    }

    if (parts.length >= 3) {
        county = parts[2];
    }

    return {
        house_number,
        street_name,
        city,
        county,
        postcode
    };
}

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting structured address migration...');

        await client.query('BEGIN');

        // ============================================
        // MIGRATE USERS TABLE
        // ============================================

        console.log('📝 Migrating users table...');

        // Check if new columns exist, add them if not
        const userColumns = ['house_number', 'street_name', 'city', 'county', 'postcode'];

        for (const column of userColumns) {
            const columnCheck = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = $1
                AND table_schema = 'public'
            `, [column]);

            if (columnCheck.rows.length === 0) {
                console.log(`   Adding ${column} column to users table...`);
                await client.query(`
                    ALTER TABLE users ADD COLUMN ${column} VARCHAR(255)
                `);
            }
        }

        // Migrate existing address data for users
        console.log('   Migrating existing user address data...');
        const usersResult = await client.query(`
            SELECT id, address FROM users WHERE address IS NOT NULL AND address != ''
        `);

        let userUpdates = 0;
        for (const user of usersResult.rows) {
            const parsed = parseAddress(user.address);
            await client.query(`
                UPDATE users
                SET house_number = $1, street_name = $2, city = $3, county = $4, postcode = $5
                WHERE id = $6
            `, [parsed.house_number, parsed.street_name, parsed.city, parsed.county, parsed.postcode, user.id]);
            userUpdates++;
        }

        console.log(`   Updated ${userUpdates} user records`);

        // Remove old address column from users
        console.log('   Removing old address column from users table...');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS address');

        // ============================================
        // MIGRATE TENANCIES TABLE
        // ============================================

        console.log('📝 Migrating tenancies table...');

        // Check if new columns exist, add them if not
        const tenancyColumns = ['property_house_number', 'property_street_name', 'property_city', 'property_county', 'property_postcode'];

        for (const column of tenancyColumns) {
            const columnCheck = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'tenancies'
                AND column_name = $1
                AND table_schema = 'public'
            `, [column]);

            if (columnCheck.rows.length === 0) {
                console.log(`   Adding ${column} column to tenancies table...`);
                await client.query(`
                    ALTER TABLE tenancies ADD COLUMN ${column} VARCHAR(255)
                `);
            }
        }

        // Migrate existing property_address data for tenancies
        console.log('   Migrating existing tenancy property address data...');
        const tenanciesResult = await client.query(`
            SELECT id, property_address FROM tenancies WHERE property_address IS NOT NULL AND property_address != ''
        `);

        let tenancyUpdates = 0;
        for (const tenancy of tenanciesResult.rows) {
            const parsed = parseAddress(tenancy.property_address);
            await client.query(`
                UPDATE tenancies
                SET property_house_number = $1, property_street_name = $2, property_city = $3, property_county = $4, property_postcode = $5
                WHERE id = $6
            `, [parsed.house_number, parsed.street_name, parsed.city, parsed.county, parsed.postcode, tenancy.id]);
            tenancyUpdates++;
        }

        console.log(`   Updated ${tenancyUpdates} tenancy records`);

        // Remove old property_address column from tenancies
        console.log('   Removing old property_address column from tenancies table...');
        await client.query('ALTER TABLE tenancies DROP COLUMN IF EXISTS property_address');

        // ============================================
        // VERIFICATION
        // ============================================

        console.log('📊 Migration verification:');

        // Check users table
        const userVerification = await client.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(house_number) as users_with_house_number,
                COUNT(street_name) as users_with_street,
                COUNT(city) as users_with_city,
                COUNT(postcode) as users_with_postcode
            FROM users
        `);
        const userStats = userVerification.rows[0];
        console.log('   Users table:');
        console.log(`     Total users: ${userStats.total_users}`);
        console.log(`     With house number: ${userStats.users_with_house_number}`);
        console.log(`     With street: ${userStats.users_with_street}`);
        console.log(`     With city: ${userStats.users_with_city}`);
        console.log(`     With postcode: ${userStats.users_with_postcode}`);

        // Check tenancies table
        const tenancyVerification = await client.query(`
            SELECT
                COUNT(*) as total_tenancies,
                COUNT(property_house_number) as tenancies_with_house_number,
                COUNT(property_street_name) as tenancies_with_street,
                COUNT(property_city) as tenancies_with_city,
                COUNT(property_postcode) as tenancies_with_postcode
            FROM tenancies
        `);
        const tenancyStats = tenancyVerification.rows[0];
        console.log('   Tenancies table:');
        console.log(`     Total tenancies: ${tenancyStats.total_tenancies}`);
        console.log(`     With house number: ${tenancyStats.tenancies_with_house_number}`);
        console.log(`     With street: ${tenancyStats.tenancies_with_street}`);
        console.log(`     With city: ${tenancyStats.tenancies_with_city}`);
        console.log(`     With postcode: ${tenancyStats.tenancies_with_postcode}`);

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