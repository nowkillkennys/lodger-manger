/**
 * Map payment frequency to cycle days
 * @param {string} paymentFrequency - Payment frequency ('weekly', 'bi-weekly', 'monthly', '4-weekly')
 * @returns {number} Number of days in the payment cycle
 */
function mapPaymentFrequencyToDays(paymentFrequency) {
  const frequencyMap = {
    'weekly': 7,
    'bi-weekly': 14,
    'monthly': 30,
    '4-weekly': 28
  };
  return frequencyMap[paymentFrequency] || 28; // Default to 28 days
}

module.exports = { mapPaymentFrequencyToDays };
