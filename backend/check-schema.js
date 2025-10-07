const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:JmWBTfKJK0gyldqOX49tkGewO@localhost:5432/lodger_management',
    ssl: false
});

async function checkSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tenancies'
            AND table_schema = 'public'
            ORDER BY column_name
        `);
        console.log('Tenancies table columns:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkSchema();