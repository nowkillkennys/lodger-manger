import React from 'react';

/**
 * StatCard Component
 * 
 * A reusable card component for displaying statistics with an icon
 * Used in the landlord dashboard to show key metrics
 * 
 * @param {string} title - The label for the statistic
 * @param {string|number} value - The main value to display
 * @param {ReactElement} icon - Lucide React icon component
 * @param {string} color - Tailwind background color class (e.g., 'bg-indigo-50')
 */
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 ${color} rounded-lg`}>
        {icon}
      </div>
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default StatCard;