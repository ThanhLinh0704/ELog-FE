# KPI Dashboard Redesign (Logistics Command Center) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade KPI Operational Dashboard UI/UX to a high-end Logistics Command Center theme with dark accents, card visual hierarchy, custom progress indicators, and gradient area charts.

**Architecture:** Component-level visual enhancement across `KpiDashboardPage.tsx` and its 5 subcomponents (`KPIOverview`, `KPICard`, `OperationalInsights`, `PerformanceTabs`, `TrendChart`) while strictly preserving data interfaces and business logic.

**Tech Stack:** React 19, Ant Design 6, Lucide React, Recharts 3, TypeScript, Vite.

## Global Constraints
- **Zero Logic Breaking**: Do not modify API interfaces, query params, calculation functions, or routing logic.
- **Strict Scope**: Touches only `src/pages/dispatcher/kpi/` files.

---

### Task 1: Redesign Header Banner in `KpiDashboardPage.tsx`

**Files:**
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\KpiDashboardPage.tsx`

- [ ] **Step 1: Update Header Banner layout and styling**
- [ ] **Step 2: Verify TypeScript types and UI alignment**
- [ ] **Step 3: Commit changes**

### Task 2: Enhance `KPICard.tsx` & `KPIOverview.tsx`

**Files:**
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\components\KPICard.tsx`
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\components\KPIOverview.tsx`

- [ ] **Step 1: Add top accent line, icon badge, and mini progress bar in `KPICard.tsx`**
- [ ] **Step 2: Update `KPIOverview.tsx` to pass accent color tokens**
- [ ] **Step 3: Commit changes**

### Task 3: Upgrade Cảnh Báo `OperationalInsights.tsx`

**Files:**
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\components\OperationalInsights.tsx`

- [ ] **Step 1: Add header count badge, left accent border cards, and arrow action buttons**
- [ ] **Step 2: Commit changes**

### Task 4: Upgrade `PerformanceTabs.tsx` & Table Progress Bars

**Files:**
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\components\PerformanceTabs.tsx`

- [ ] **Step 1: Custom segmented tabs styling and rounded gradient table progress bars**
- [ ] **Step 2: Commit changes**

### Task 5: Upgrade `TrendChart.tsx` to Gradient Area Chart

**Files:**
- Modify: `c:\SEP_490\ELOG\ELOG_FE\ELog-FE\src\pages\dispatcher\kpi\components\TrendChart.tsx`

- [ ] **Step 1: Convert `LineChart` to `AreaChart` with SVG linear gradients and dark tooltip**
- [ ] **Step 2: Run build verification (`npm run build`)**
- [ ] **Step 3: Commit changes**
