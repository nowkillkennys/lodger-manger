const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'changeme123',
    database: process.env.DB_NAME || 'lodger_management'
});

async function addAnnouncementsTables() {
    try {
        console.log('🔄 Adding announcements tables...');

        // Create announcements table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                target_audience VARCHAR(50) DEFAULT 'all',
                is_active BOOLEAN DEFAULT true,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        `);
        console.log('✓ Created announcements table');

        // Create broadcast_messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS broadcast_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                target_role VARCHAR(50),
                sent_by UUID REFERENCES users(id),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                recipient_count INTEGER DEFAULT 0
            )
        `);
        console.log('✓ Created broadcast_messages table');

        // Create user_activity_log table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_activity_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created user_activity_log table');

        console.log('✅ Announcements tables added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding announcements tables:', error);
        process.exit(1);
    }
}

addAnnouncementsTables();
