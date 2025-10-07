/**
 * Test script for creating and testing tenancies with different payment types
 * Tests cycle-based (4-weekly) and calendar-based (15th of month) payments
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const paymentCalculator = require('./paymentCalculator');
const { generateAgreementPDF } = require('./pdfGenerator');
const path = require('path');
const fs = require('fs').promises;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
    ssl: false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const SALT_ROUNDS = 10;

async function createTestUsers() {
    console.log('👤 Creating test users...');

    // Create test landlord
    const landlordPassword = await bcrypt.hash('landlord123', SALT_ROUNDS);
    const landlordResult = await pool.query(
        `INSERT INTO users (email, password_hash, user_type, full_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone
         RETURNING *`,
        ['test-landlord@example.com', landlordPassword, 'landlord', 'Test Landlord', '+441234567890']
    );
    const landlord = landlordResult.rows[0];
    console.log(`✅ Created landlord: ${landlord.full_name} (ID: ${landlord.id})`);

    // Create test lodgers
    const lodgers = [];
    for (let i = 1; i <= 2; i++) {
        const lodgerPassword = await bcrypt.hash(`lodger${i}123`, SALT_ROUNDS);
        const lodgerResult = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET
             password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone
             RETURNING *`,
            [`test-lodger${i}@example.com`, lodgerPassword, 'lodger', `Test Lodger ${i}`, `+44987654321${i}`]
        );
        const lodger = lodgerResult.rows[0];
        lodgers.push(lodger);
        console.log(`✅ Created lodger: ${lodger.full_name} (ID: ${lodger.id})`);
    }

    return { landlord, lodgers };
}

async function createTestTenancies(landlord, lodgers) {
    console.log('\n🏠 Creating test tenancies...');

    const tenancies = [];

    // Test data
    const testData = [
        {
            name: 'Cycle-based (4-weekly)',
            lodger: lodgers[0],
            payment_type: 'cycle',
            payment_frequency: '4-weekly',
            payment_day_of_month: null
        },
        {
            name: 'Calendar-based (15th of month)',
            lodger: lodgers[1],
            payment_type: 'calendar',
            payment_frequency: 'monthly',
            payment_day_of_month: 15
        }
    ];

    for (const data of testData) {
        const tenancyResult = await pool.query(
            `INSERT INTO tenancies (
                landlord_id, lodger_id, property_house_number, property_street_name, property_city, property_county, property_postcode,
                room_description, shared_areas, start_date, initial_term_months, monthly_rent, initial_payment,
                deposit_applicable, deposit_amount, payment_frequency, payment_cycle_days,
                payment_type, payment_day_of_month, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *`,
            [
                landlord.id,
                data.lodger.id,
                '123', // house_number
                'Test Street', // street_name
                'Test City', // city
                'Test County', // county
                'TC1 1AA', // postcode
                'Double room with en-suite bathroom',
                'Kitchen, living room, garden',
                '2024-01-01',
                12,
                800.00,
                1600.00, // 2 months rent
                true,
                800.00,
                data.payment_frequency,
                data.payment_frequency === '4-weekly' ? 28 : 30,
                data.payment_type,
                data.payment_day_of_month,
                'active'
            ]
        );

        const tenancy = tenancyResult.rows[0];
        tenancies.push({ ...tenancy, testName: data.name });
        console.log(`✅ Created tenancy: ${data.name} (ID: ${tenancy.id})`);
    }

    return tenancies;
}

async function generatePaymentSchedules(tenancies) {
    console.log('\n💰 Generating payment schedules...');

    for (const tenancy of tenancies) {
        console.log(`\n📅 Generating schedule for: ${tenancy.testName}`);

        // Generate payment schedule
        const schedule = paymentCalculator.generatePaymentSchedule(
            new Date(tenancy.start_date),
            parseFloat(tenancy.monthly_rent),
            12, // 12 months
            0,
            tenancy.payment_cycle_days,
            tenancy.payment_type,
            tenancy.payment_day_of_month || 1
        );

        console.log(`Generated ${schedule.length} payments`);

        // Insert payment schedule
        for (const payment of schedule) {
            await pool.query(
                `INSERT INTO payment_schedule (
                    tenancy_id, payment_number, due_date, rent_due
                ) VALUES ($1, $2, $3, $4)`,
                [tenancy.id, payment.paymentNumber, payment.dueDate, payment.rentDue]
            );
        }

        // Display first 5 payments
        console.log('First 5 payments:');
        schedule.slice(0, 5).forEach(payment => {
            console.log(`  Payment ${payment.paymentNumber}: ${payment.dueDate} - £${payment.rentDue}`);
        });
    }
}

async function generateTestPDFs(tenancies, landlord, lodgers) {
    console.log('\n📄 Generating test PDFs...');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads', 'agreements');
    await fs.mkdir(uploadsDir, { recursive: true });

    for (const tenancy of tenancies) {
        const lodger = lodgers.find(l => l.id === tenancy.lodger_id);
        const property = {
            address_line1: '123 Test Street',
            address_line2: '',
            city: 'Test City',
            county: 'Test County',
            postcode: 'TC1 1AA',
            shared_areas: tenancy.shared_areas
        };

        const pdfPath = path.join(uploadsDir, `test-agreement-${tenancy.id}.pdf`);

        try {
            await generateAgreementPDF(tenancy, landlord, lodger, property, pdfPath);
            console.log(`✅ Generated PDF for ${tenancy.testName}: ${pdfPath}`);

            // Update tenancy with PDF path
            await pool.query(
                'UPDATE tenancies SET signed_agreement_path = $1 WHERE id = $2',
                [`/uploads/agreements/test-agreement-${tenancy.id}.pdf`, tenancy.id]
            );
        } catch (error) {
            console.error(`❌ Failed to generate PDF for ${tenancy.testName}:`, error.message);
        }
    }
}

async function runTests() {
    try {
        console.log('🧪 Starting tenancy payment type tests...\n');

        // Create test users
        const { landlord, lodgers } = await createTestUsers();

        // Create test tenancies
        const tenancies = await createTestTenancies(landlord, lodgers);

        // Generate payment schedules
        await generatePaymentSchedules(tenancies);

        // Generate PDFs
        await generateTestPDFs(tenancies, landlord, lodgers);

        console.log('\n✅ All tests completed successfully!');
        console.log('\n📊 Test Summary:');
        console.log(`   - Created 1 landlord and 2 lodgers`);
        console.log(`   - Created 2 tenancies (cycle-based and calendar-based)`);
        console.log(`   - Generated payment schedules for both types`);
        console.log(`   - Generated PDF agreements with payment terms`);

        // Display payment schedule verification
        console.log('\n🔍 Payment Schedule Verification:');
        for (const tenancy of tenancies) {
            const payments = await pool.query(
                'SELECT * FROM payment_schedule WHERE tenancy_id = $1 ORDER BY payment_number LIMIT 3',
                [tenancy.id]
            );

            console.log(`\n${tenancy.testName}:`);
            payments.rows.forEach(payment => {
                console.log(`  Payment ${payment.payment_number}: ${payment.due_date} - £${payment.rent_due}`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests()
        .then(() => {
            console.log('\n🎉 Test script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test script failed:', error);
            process.exit(1);
        });
}

module.exports = { runTests };