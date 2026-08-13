import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface StopNode {
  cx: number;
  cy: number;
  color: string;
  strokeColor: string;
  label: string;
  delay: string;
  anchor?: 'middle' | 'start' | 'end';
  labelDy?: number;
}

interface RoutePath {
  d: string;
  stroke: string;
  delay: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const ROUTES: RoutePath[] = [
  { d: 'M 72,80 C 110,60 170,38 240,32 S 340,28 390,26', stroke: '#2563eb', delay: '0s' },
  { d: 'M 72,80 C 120,100 185,112 270,118 S 370,110 420,95', stroke: '#8b5cf6', delay: '-0.8s' },
  { d: 'M 72,80 C 130,72 210,68 295,55 S 370,42 400,36', stroke: '#ec4899', delay: '-1.4s' },
];

const STOPS: StopNode[] = [
  { cx: 240, cy: 32, color: '#2563eb', strokeColor: 'rgba(37,99,235,0.45)', label: 'Điểm 1', delay: '0s', labelDy: -10 },
  { cx: 390, cy: 26, color: '#2563eb', strokeColor: 'rgba(37,99,235,0.45)', label: 'Điểm 2', delay: '0.9s', labelDy: -10 },
  { cx: 270, cy: 118, color: '#8b5cf6', strokeColor: 'rgba(139,92,246,0.45)', label: 'Điểm 3', delay: '0.4s', labelDy: 16 },
  { cx: 420, cy: 95, color: '#8b5cf6', strokeColor: 'rgba(139,92,246,0.45)', label: 'Điểm 4', delay: '1.3s', labelDy: 16 },
  { cx: 295, cy: 55, color: '#ec4899', strokeColor: 'rgba(236,72,153,0.45)', label: 'Điểm 5', delay: '0.7s', labelDy: -10 },
  { cx: 400, cy: 36, color: '#ec4899', strokeColor: 'rgba(236,72,153,0.45)', label: 'Điểm 6', delay: '1.6s', labelDy: -10 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────
const GridPattern: React.FC = () => (
  <defs>
    <pattern id="elog-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.7" />
    </pattern>
  </defs>
);

const HubNode: React.FC = () => (
  <g transform="translate(72,80)">
    <circle className="elog-hub-outer" cx="0" cy="0" r="7" fill="rgba(37,99,235,0.12)" />
    <circle className="elog-hub-mid" cx="0" cy="0" r="7" fill="rgba(15,23,42,0.15)" />
    <circle cx="0" cy="0" r="7" fill="#0F172A" />
    <circle cx="0" cy="0" r="3.2" fill="#ffffff" />
    <text
      x="0" y="20"
      textAnchor="middle"
      fontSize="9"
      fontWeight="600"
      fill="#475569"
    >
      Hub A
    </text>
  </g>
);

const StopNodeComponent: React.FC<{ stop: StopNode }> = ({ stop }) => {
  const { cx, cy, color, strokeColor, label, delay, labelDy = -10 } = stop;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle
        className="elog-node-pulse"
        cx="0" cy="0" r="7"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        style={{ animationDelay: delay }}
      />
      <circle cx="0" cy="0" r="4.5" fill={color} />
      <circle cx="0" cy="0" r="2" fill="#ffffff" />
      <text
        x="0" y={labelDy}
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="600"
        fill={color}
      >
        {label}
      </text>
    </g>
  );
};

const RouteLegend: React.FC = () => (
  <g transform="translate(148,148)">
    {[
      { color: '#2563eb', label: 'Tuyến A' },
      { color: '#8b5cf6', label: 'Tuyến B' },
      { color: '#ec4899', label: 'Tuyến C' },
    ].map(({ color, label }, i) => (
      <g key={label} transform={`translate(${i * 70}, 0)`}>
        <circle cx="4" cy="0" r="4" fill={color} opacity="0.22" />
        <text x="13" y="4" fontSize="8.5" fontWeight="600" fill={color}>{label}</text>
      </g>
    ))}
  </g>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const MapMockup: React.FC = () => {
  return (
    <div className="elog-map-wrapper">

      <div className="elog-map-browser">
        {/* Browser top bar */}
        <div className="elog-map-bar">
          <div className="elog-map-dots">
            <div className="elog-map-dot" style={{ background: '#EF4444' }} />
            <div className="elog-map-dot" style={{ background: '#F59E0B' }} />
            <div className="elog-map-dot" style={{ background: '#10B981' }} />
          </div>
          <div className="elog-map-url">app.elog.io/live-routing-map</div>
        </div>

        {/* Map canvas */}
        <div className="elog-map-canvas">
          <svg
            className="elog-map-svg"
            viewBox="0 0 480 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <GridPattern />

            {/* Grid background */}
            <rect width="480" height="160" fill="url(#elog-map-grid)" />
            <rect width="480" height="160" fill="rgba(248,250,252,0.3)" />

            {/* Animated route paths */}
            {ROUTES.map((route, i) => (
              <path
                key={i}
                className="elog-route-path"
                d={route.d}
                stroke={route.stroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animationDelay: route.delay }}
              />
            ))}

            {/* Hub */}
            <HubNode />

            {/* Delivery stops */}
            {STOPS.map((stop) => (
              <StopNodeComponent key={stop.label} stop={stop} />
            ))}

            {/* Legend */}
            <RouteLegend />
          </svg>

          {/* Hub card overlay */}
          <div className="elog-map-hub-card">
            <div className="elog-map-hub-dot" />
            <div>
              <div className="elog-map-hub-title">ELog Hub A</div>
              <div className="elog-map-hub-sub">Kho chính</div>
            </div>
          </div>

          {/* Telemetry overlay */}
          <div className="elog-map-telemetry">
            <div className="elog-map-telem-row">
              <div className="elog-map-telem-bullet" style={{ background: '#2563EB' }} />
              Đơn đang giao: <strong>14</strong>
            </div>
            <div className="elog-map-telem-row">
              <div className="elog-map-telem-bullet" style={{ background: '#10B981' }} />
              Hiệu suất tuyến: <strong>98.4%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Floating truck badge */}
      <div className="elog-map-float-truck">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" fill="currentColor" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="currentColor" />
          <circle cx="5.5" cy="18.5" r="2.5" fill="currentColor" />
          <circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" />
        </svg>
      </div>

      {/* Floating GPS badge */}
      <div className="elog-map-float-gps">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      </div>
    </div>
  );
};

export default MapMockup;
