import React from 'react';

const BrowserDashboardMockup: React.FC = () => {
  // Chart data as defined in the Flutter source code
  const chartBars = [
    { ratio: 0.55, color: '#2563eb' },
    { ratio: 0.75, color: '#2563eb' },
    { ratio: 0.45, color: '#cbd5e1' },
    { ratio: 0.90, color: '#2563eb' },
    { ratio: 0.60, color: '#cbd5e1' },
    { ratio: 0.80, color: '#2563eb' },
    { ratio: 0.50, color: '#cbd5e1' },
    { ratio: 0.70, color: '#8b5cf6' },
    { ratio: 0.40, color: '#cbd5e1' },
    { ratio: 0.85, color: '#8b5cf6' },
    { ratio: 0.65, color: '#ec4899' },
    { ratio: 0.55, color: '#ec4899' },
  ];

  return (
    <div className="elog-mockup-wrapper">
      {/* Browser Canvas Mockup */}
      <div className="elog-mockup-browser">
        {/* Browser Top Header */}
        <div className="elog-mockup-bar">
          <div className="elog-mockup-dots">
            <span className="elog-mockup-dot elog-mockup-dot-red" />
            <span className="elog-mockup-dot elog-mockup-dot-orange" />
            <span className="elog-mockup-dot elog-mockup-dot-green" />
          </div>
          <div className="elog-mockup-address">
            app.elog.io/dashboard
          </div>
        </div>

        {/* Analytics Stats */}
        <div className="elog-mockup-stats">
          {/* Stat 1 */}
          <div className="elog-mockup-stat-item">
            <span className="elog-mockup-stat-dot" style={{ backgroundColor: '#2563eb' }} />
            <div className="elog-mockup-stat-info">
              <span className="elog-mockup-stat-value">847</span>
              <span className="elog-mockup-stat-label">Active</span>
            </div>
          </div>
          {/* Stat 2 */}
          <div className="elog-mockup-stat-item">
            <span className="elog-mockup-stat-dot" style={{ backgroundColor: '#8b5cf6' }} />
            <div className="elog-mockup-stat-info">
              <span className="elog-mockup-stat-value">2.4K</span>
              <span className="elog-mockup-stat-label">Delivered</span>
            </div>
          </div>
          {/* Stat 3 */}
          <div className="elog-mockup-stat-item">
            <span className="elog-mockup-stat-dot" style={{ backgroundColor: '#ec4899' }} />
            <div className="elog-mockup-stat-info">
              <span className="elog-mockup-stat-value">126</span>
              <span className="elog-mockup-stat-label">Routes</span>
            </div>
          </div>
        </div>

        {/* Mini Bar Chart */}
        <div className="elog-mockup-chart">
          {chartBars.map((bar, index) => (
            <div
              key={index}
              className="elog-mockup-chart-bar"
              style={{
                height: `${bar.ratio * 100}%`,
                backgroundColor: bar.color,
              }}
            />
          ))}
        </div>

        {/* Mockup Footer */}
        <div className="elog-mockup-footer">
          <span className="elog-mockup-footer-title">Delivery Overview</span>
          <span className="elog-mockup-footer-subtitle">Last 7 days</span>
        </div>
      </div>

      {/* Floating Truck Icon (Bottom-Left) */}
      <div className="elog-mockup-float-truck">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" fill="currentColor" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="currentColor" />
          <circle cx="5.5" cy="18.5" r="2.5" fill="currentColor" />
          <circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {/* Floating Cargo Box Icon (Bottom-Right) */}
      <div className="elog-mockup-float-box">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.1" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
    </div>
  );
};

export default BrowserDashboardMockup;
