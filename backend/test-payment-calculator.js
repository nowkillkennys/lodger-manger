/**
 * Test script for payment calculator generatePaymentSchedule function
 * Tests cycle-based and calendar-based payment scheduling
 */

const { generatePaymentSchedule } = require('./paymentCalculator');

const startDate = '2024-01-01'; // Example start date
const monthlyRent = 1000; // Example monthly rent
const numberOfPayments = 5; // Test with 5 payments

console.log('Testing generatePaymentSchedule with different payment types\n');

// Test cycle-based payments
const cycleDaysList = [7, 14, 30, 28];
cycleDaysList.forEach(cycleDays => {
    console.log(`=== Testing cycle-based with cycleDays = ${cycleDays} ===`);
    const schedule = generatePaymentSchedule(startDate, monthlyRent, numberOfPayments, 0, cycleDays, 'cycle');

    schedule.forEach(payment => {
        console.log(`Payment ${payment.paymentNumber}: Due ${payment.dueDate}, Rent Due: £${payment.rentDue}, Balance: £${payment.balance}`);
    });

    console.log('');
});

// Test calendar-based payments
const paymentDays = [1, 15, 28];
paymentDays.forEach(day => {
    console.log(`=== Testing calendar-based with paymentDayOfMonth = ${day} ===`);
    const schedule = generatePaymentSchedule(startDate, monthlyRent, numberOfPayments, 0, 28, 'calendar', day);

    schedule.forEach(payment => {
        console.log(`Payment ${payment.paymentNumber}: Due ${payment.dueDate}, Rent Due: £${payment.rentDue}, Balance: £${payment.balance}`);
    });

    console.log('');
});

console.log('Test completed successfully!');