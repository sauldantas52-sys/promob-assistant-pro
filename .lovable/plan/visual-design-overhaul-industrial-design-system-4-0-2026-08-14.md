# Visual Design Overhaul - Industrial Design System 4.0

This plan refines the entire Monta AI interface into a modern, high-contrast industrial design system. It focuses on large rounded corners (2rem+), bold tracking, and specific functional color coding for production steps while preserving all business rules.

## Design Principles
- **Industrial Hierarchy**: Bold typography (SF Pro Display style), high-contrast badges, and dark surfaces for factory environments.
- **Physical Markers**: G1/G2/G3 groups use distinctive color coding.
- **Operational Clarity**: Status tones are mapped to high-visibility colors (Red for Blocked/Corte, Orange for Production, Blue for Conference/Shipping, Green for Assembly/Success).
- **Modern Surfaces**: Cards with deep soft shadows and `rounded-[2rem]` or larger.

## Proposed Changes

### 1. Global Styles (`src/styles.css`)
- Refine the custom industrial palette.
- Add utility classes for consistent industrial spacing and typography.

### 2. Layout & Shell (`src/components/AppShell.tsx`)
- Modernize sidebar with high-contrast active states and dark navy industrial background.
- Update top navigation for mobile to match the industrial theme.

### 3. Dashboard (`src/routes/_authenticated.dashboard.tsx`)
- Apply "Operational 4.0" layout with oversized metrics and high-contrast recent project cards.
- Refine "Quick Actions" with a dark industrial style.

### 4. Project List (`src/routes/_authenticated.projects.index.tsx`)
- Redesign project cards to look like industrial files with bold status badges.
- Modernize search/filter bars with large rounded containers.

### 5. Project Details (`src/routes/_authenticated.projects.$projectId.tsx`)
- Overhaul the header with bold project tracking.
- Apply consistent "Industrial 4.0" styling to all tabs (Engineering, Production, Maintenance).
- Modernize the "OP" (Order of Production) section with clear visual locks.

### 6. Production & Wallboard (`src/routes/_authenticated.production.tsx`, `src/routes/_authenticated.factory-wallboard.tsx`)
- Enhance the Wallboard for TV viewing: deep dark backgrounds, massive neon metrics, and clear block indicators.
- Refine the Production Queue with industrial status cards.

### 7. Operations: Picking, Assembly & Shipping
- **Picking**: High-contrast checklist for warehouse usage.
- **Assembly**: Large buttons and clear progress markers for mobile-first floor usage.
- **Shipping**: Card-based volume management with clear scanning and loading states.

## Technical Details
- Using Tailwind v4 semantic tokens.
- No changes to Supabase schema, RLS, or RBAC logic.
- Preserving all QR code and physical group (G1/G2/G3) logic.
- Mobile-first responsiveness for all operational views.
