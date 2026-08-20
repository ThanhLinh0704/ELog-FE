# KPI Dashboard Redesign — Logistics Command Center (Option 2)

Date: 2026-08-18  
Author: Antigravity AI  
Status: Approved by User  

## 1. Overview
The goal of this task is to enhance the visual aesthetics, visual hierarchy, readability, and overall user experience (UI/UX) of the KPI Operational Dashboard (`KpiDashboardPage` and its sub-components in `src/pages/dispatcher/kpi/`).

All existing business logic, data fetching hooks/APIs, query parameter handling, role-based focus (`isDispatcherFocus`), route navigation, and data calculations will remain 100% intact and untouched. Only the UI components, CSS styling, layout structure, card designs, charts, and table progress rendering will be upgraded.

---

## 2. Design System & Theme Specification

### 2.1 Theme Palette (Logistics Command Center Accent)
- **Header Banner Gradient**: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
- **Card Background**: `#ffffff` with subtle border `#e2e8f0` and box shadow `0 4px 16px rgba(15, 23, 42, 0.06)`
- **Border-Radius**: Cards `12px`, Badges `6px`, Progress Bars `6px`

### 2.2 Metric Accent Colors
- **Tỷ lệ đúng giờ (On-Time Delivery)**: Electric Blue `#3b82f6` (Badge bg: `#eff6ff`)
- **Lấp đầy thể tích (Volume Utilization)**: Emerald Green `#10b981` (Badge bg: `#ecfdf5`)
- **Lấp đầy tải trọng (Weight Utilization)**: Royal Purple `#8b5cf6` (Badge bg: `#f5f3ff`)
- **Chuyến hoàn thành (Trip Completion)**: Cyan Teal `#06b6d4` (Badge bg: `#ecfeff`)
- **Tỷ lệ sự cố (Exceptions/Alerts)**: Crimson Red `#ef4444` / Amber `#f59e0b` (Badge bg: `#fef2f2` / `#fffbeb`)

---

## 3. Component Architecture & UI Changes

### 3.1 `KpiDashboardPage.tsx`
- **Header Banner**:
  - Encapsulate title, period indicator, preset select, custom date picker, and refresh button inside a Command Center styled dark card container.
  - Maintain all current props, handlers (`fetchDailyTrend`, `fetchSummary`, `fetchByRoute`, `fetchByDriver`, `fetchByVehicle`), and date query builders.

### 3.2 `KPIOverview.tsx` & `KPICard.tsx`
- **Top Accent Line**: `border-top: 3px solid <MetricAccentColor>` on each KPI card.
- **Icon Badge**: Display lucide icon inside a circular container (`36x36px`, `border-radius: 50%`, background `rgba(color, 0.1)`).
- **Metric Value Styling**: Font size `26px`, `font-weight: 700`, line height tight.
- **Mini Progress Bar**: Render a small smooth progress bar showing percentage towards target when target is present (`targetLabel`).
- **Status Badge**: Render a polished Ant Design Tag or custom status badge with soft background and status icon.

### 3.3 `OperationalInsights.tsx`
- **Section Header**: Add a badge count indicator (e.g. `5 vấn đề cần theo dõi` in amber/red pill tag).
- **Insight Cards**:
  - Left border strip `border-left: 4px solid #f59e0b` (or `#ef4444` for critical issues, `#10b981` for safe status).
  - Categorized icons: Truck icon for vehicle utilization alerts, Route pin icon for route utilization alerts, Shield/Alert icon for exceptions.
  - Interactive Action Links: Render as sleek outline buttons with right arrow icon (`Xem tuyến →`, `Xem phương tiện →`) with distinct hover states.

### 3.4 `PerformanceTabs.tsx`
- **Tabs Styling**: Segmented button control / modern pill tabs for switching between `Tuyến (Route)`, `Tài xế (Driver)`, and `Phương tiện (Vehicle)`.
- **Table Progress Bars**: Replace plain progress bar with custom Ant Design `Progress` component or styled progress track (rounded corners `6px`, gradient fill, percentage label text).
- **Status Tags**: Standardized soft tags for `Cần theo dõi` vs `Bình thường` / `Tốt`.

### 3.5 `TrendChart.tsx`
- **Chart Type**: Upgrade Recharts `LineChart` to `AreaChart` with SVG linear gradients (`<defs><linearGradient.../></defs>`).
- **Dual Series**: Render both `Tỷ lệ đúng giờ` and `Tỷ lệ lắp đầy thể tích` on the same chart with distinct blue and green gradients.
- **Legend & Controls**: Interactive legend to toggle metrics on/off.
- **Custom Tooltip**: Dark styled tooltip card matching Command Center theme (`background: #0f172a`, `color: #ffffff`).

---

## 4. Non-Functional & Safety Constraints
- **Zero Logic Disruption**: No changes to API calls, data interfaces, state management, or calculations in `src/api/kpiApi.ts`, `src/types/kpi.ts`, `src/utils/performanceStatus.ts`, or `src/utils/insightGenerator.ts`.
- **Responsive Layout**: Ant Design grid responsive breakpoints (`xs`, `sm`, `md`, `lg`, `xl`) remain preserved so mobile and tablet layout views function cleanly.
- **Accessibility & UX**: All text colors maintain high contrast against backgrounds.
