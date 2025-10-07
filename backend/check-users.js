const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:JmWBTfKJK0gyldqOX49tkGewO@localhost:5432/lodger_management',
    ssl: false
});

async function checkUsers() {
    try {
        const result = await pool.query('SELECT id, email, user_type, full_name, password_hash FROM users');
        console.log('Users:');
        result.rows.forEach(user => {
            console.log(`${user.id} - ${user.email} - ${user.user_type} - ${user.full_name} - ${user.password_hash}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkUsers();