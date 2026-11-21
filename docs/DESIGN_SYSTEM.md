# OrderFlow Pro — Global Design System Documentation

## 1. Design System Philosophy & Core Principles

OrderFlow Pro is an enterprise-grade Order Management & Employee Performance Analytics platform.
Every single view and component follows a strictly governed global design system:
- **Data-First Clarity**: Maximum contrast, clear information hierarchy, high readability under continuous daily usage.
- **Unified Visual Identity**: Exactly one font family (Inter), fixed typography scale, centralized color tokens, consistent 44px minimum touch targets, unified elevation and glassmorphism styling.
- **Predictable States**: Cohesive loading skeletons, standardized empty states (clean zero-data displays), and clear feedback banners across every page.
- **Glassmorphism With Discipline**: Subtle translucent surfaces (`rgba(255, 255, 255, 0.8)` or dark mode `rgba(32, 32, 43, 0.75)`), fine borders, soft multi-layer shadows, and frosted backdrop blurs (`backdrop-blur-md`). No muddy gradients or unreadable text.

---

## 2. Typography Specification

OrderFlow Pro utilizes **Inter** across the entire application without exception.

| Token / Usage | Font Size | Line Height | Weight | Letter Spacing | CSS Variable / Utility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Main Dashboard KPIs** | `32px` (2rem) | `1.2` | Bold (`700`) | `-0.025em` | `text-kpi font-bold` |
| **Page Titles** | `24px` (1.5rem) | `1.25` | Semibold (`600`) | `-0.02em` | `text-page-title font-semibold` |
| **Section Titles / Cards** | `20px` (1.25rem) | `1.3` | Semibold (`600`) | `-0.015em` | `text-section-title font-semibold` |
| **Base / Body Text** | `16px` (1rem) | `1.5` | Regular (`400`) / Medium (`500`) | `normal` | `text-base` |
| **Table Content & Secondary**| `14px` (0.875rem) | `1.4` | Regular (`400`) / Medium (`500`) | `normal` | `text-sm` |
| **Small Labels & Badges** | `12px` (0.75rem) | `1.3` | Medium (`500`) / Semibold (`600`) | `+0.01em` | `text-xs font-medium` |

### Font Weights
- **Regular**: `400` — standard body text, table cell data, descriptions
- **Medium**: `500` — form labels, badges, table headers, breadcrumb links
- **Semibold**: `600` — section headers, card titles, prominent buttons, modal headers
- **Bold**: `700` — primary KPI statistics, invoice totals, major report highlights

---

## 3. Centralized Color System

All colors are controlled via CSS custom properties in `src/index.css`. Component styles consume standard CSS variables or Tailwind utility mappings.

### Light Theme
- **Primary**: `#7666C8` (`hsl(250, 48%, 59%)`)
- **Primary Hover / Active**: `#6655B8` (`hsl(250, 44%, 53%)`)
- **Primary Light (Subtle)**: `rgba(118, 102, 200, 0.12)`
- **Background**: `#F5F5FA`
- **Surface**: `#FFFFFF`
- **Surface Secondary**: `#F8F7FC`
- **Text Primary**: `#242333`
- **Text Secondary**: `#77758A`
- **Border**: `#E7E5EF`
- **Success**: `#249B69` (Subtle bg: `rgba(36, 155, 105, 0.12)`)
- **Warning**: `#E6A23C` (Subtle bg: `rgba(230, 162, 60, 0.12)`)
- **Danger**: `#DB5360` (Subtle bg: `rgba(219, 83, 96, 0.12)`)
- **Info**: `#5087CD` (Subtle bg: `rgba(80, 135, 205, 0.12)`)

### Dark Theme
- **Background**: `#15151D`
- **Surface**: `#20202B`
- **Surface Secondary**: `#282835`
- **Text Primary**: `#F4F3FA`
- **Text Secondary**: `#AAA8BA`
- **Border**: `#373544`
- **Primary**: `#9585E8`
- **Primary Hover / Active**: `#8473D8`
- **Primary Subtle**: `rgba(149, 133, 232, 0.15)`
- **Success**: `#2EC687`
- **Warning**: `#F5B041`
- **Danger**: `#E76874`
- **Info**: `#649BE6`

---

## 4. Elevation, Glassmorphism & Shadow System

```css
/* Controlled Enterprise Glassmorphism */
.glass-panel {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 20px -2px var(--shadow-sm);
}

.glass-card {
  background: var(--surface-card);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 var(--shadow-xs);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.glass-card:hover {
  box-shadow: 0 6px 16px -2px var(--shadow-md);
}
```

- **Border Radius Scale**:
  - `sm`: `6px` (badges, mini indicators)
  - `md`: `8px` (inputs, buttons, select menus)
  - `lg`: `12px` (cards, dialogs, drawers, dropdowns)
  - `xl`: `16px` (large containers, modals)
  - `full`: `9999px` (pills, avatar status)

---

## 5. UI Component Specifications

### A. Buttons (`<Button />`)
- **Height / Touch Target**: `40px` (standard), `44px` (large/mobile), `32px` (compact)
- **Radius**: `8px` (`rounded-lg`)
- **Variants**:
  - `primary`: Background `#7666C8`, text `#FFFFFF`, hover `#6655B8`, active scale `0.98`
  - `secondary`: Background `surface-secondary`, text `text-primary`, border `1px solid var(--border-color)`
  - `outline`: Transparent background, border `1px solid var(--border-color)`, text `text-primary`
  - `ghost`: Transparent background, text `text-secondary`, hover background `var(--surface-secondary)`
  - `danger`: Background `#DB5360`, text `#FFFFFF`, hover `#C74350`
  - `success`: Background `#249B69`, text `#FFFFFF`
- **Loading State**: Inline spinner, disabled interaction, preserved button dimensions.

### B. Form Inputs (`<Input />`, `<Select />`, `<Textarea />`)
- **Height**: `40px`
- **Font Size**: `14px` (`text-sm`)
- **Border**: `1px solid var(--border-color)`
- **Focus**: `2px solid var(--primary-color)` with `ring-2 ring-primary/20`
- **Background**: `var(--surface-color)`

### C. Data Tables (`<DataTable />`)
- **Header**: Background `var(--surface-secondary)`, text `12px font-semibold uppercase tracking-wider text-secondary`
- **Rows**: Height `48px`, font `14px`, border-bottom `1px solid var(--border-color)`
- **Hover**: Subtle row highlight `rgba(118, 102, 200, 0.04)`
- **Pagination**: Controlled server-side pagination with row-count select, previous/next, current range (`Showing 1-25 of 120`).

### D. Status Badges (`<Badge />`)
- **Pending**: Warning amber `bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`
- **In Progress**: Info blue `bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20`
- **Completed**: Success green `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`
- **Issue**: Danger red `bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`

### E. Standard Empty States (`<EmptyState />`)
- Rendered whenever database returns 0 rows.
- Visual icon in soft tinted circle.
- Explanatory title ("No Orders Found", "No Payments Recorded").
- Helpful subtitle with instructions.
- Clear primary Call to Action ("+ Add New Order", "+ Add Payment").

---

## 6. Layout Shell Architecture

Every route mounts inside the `<AppLayout />` container:
```
+--------------------------------------------------------------------------+
|  SIDEBAR (260px fixed / collapsable)  |  TOP NAVBAR (64px glassmorphic) |
|  - Logo: OrderFlow Pro                |  - Breadcrumbs & Timezone Pill   |
|  - DASHBOARD                          |  - Date Range Quick Selector     |
|  - WORK MANAGEMENT                    |  - Supabase Health Badge         |
|    * Add Order                        |  - Theme Toggle (Light/Dark)     |
|    * All Orders                       |  - User Profile & Settings       |
|    * Bulk Import                      +----------------------------------+
|  - EMPLOYEES                          |  PAGE HEADER                     |
|    * All Employees                    |  - Title (24px Semibold)         |
|    * Order Takers / Editors / Managers|  - Page Action Buttons (Export)  |
|  - FINANCE                            +----------------------------------+
|    * Payments / Invoices              |  FILTER TOOLBAR (Unified)        |
|  - ATTENDANCE                         +----------------------------------+
|    * Daily / Monthly / Reports        |  MAIN CONTENT VIEW               |
|  - ANALYTICS & REPORTS (10 reports)   |  - KPI Cards Grid                |
|  - SYSTEM                             |  - Analytics Charts Grid         |
|    * Settings / Backup & Restore      |  - Data Tables / Form Views      |
+---------------------------------------+----------------------------------+
```

---

## 7. Icons & Accessibility
- Exclusively **Lucide React** SVG icons.
- No emoji icons in buttons, badges, or headers.
- Accessible ARIA labels (`aria-label`) on all icon-only buttons.
- Visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).
- High-contrast compliance (WCAG AA 4.5:1 ratio for all body and tabular text).
