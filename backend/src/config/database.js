const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

const connectWithRetry = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✓ Database connected successfully');

      try {
        // Check if any users exist
        const userCheck = await client.query('SELECT COUNT(*) as user_count FROM users');
        const userCount = parseInt(userCheck.rows[0].user_count);

        if (userCount === 0) {
          console.log('🔧 No users found. Creating initial admin account...');

          // Create admin account without password (will be set via setup wizard)
          await client.query(
            `INSERT INTO users (email, user_type, full_name, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            ['admin@example.com', 'admin', 'System Administrator', true]
          );

          console.log('✓ Admin account created: admin@example.com');
          console.log('⚠️  Admin password needs to be set via setup wizard');
        } else {
          console.log(`✓ Found ${userCount} existing user(s)`);
        }
      } catch (initError) {
        console.error('Error during initialization:', initError);
      }

      client.release();
      return; // Success, exit retry loop
    } catch (err) {
      console.error(`Database connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('Failed to connect to database after all retries');
  process.exit(1); // Exit if we can't connect
};

module.exports = { pool, connectWithRetry };
