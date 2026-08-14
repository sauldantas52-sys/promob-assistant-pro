# Visual Identity Overhaul: Industrial Design System 4.0

This plan refines the visual hierarchy, spacing, typography, and UI elements to achieve a professional industrial appearance for Monta AI.

## Visual Direction
- **Typography:** Heavy use of uppercase, high tracking (letter-spacing), and font-black for headings.
- **Color Palette:** Semantic industrial colors (Corte: Red, Borda: Amber, Usinagem: Purple, etc.) with a deep slate/blue-petróleo foundation.
- **Industrial Elements:** Large rounded corners (up to `rounded-[4rem]`), deep shadows, and bold borders.
- **Responsiveness:** Mobile-first for assembly (large buttons), TV-optimized wallboard (high contrast, large fonts).

## Implementation Details

### 1. Global Style Enhancements (src/styles.css)
- Refine root variables for better contrast.
- Add specific utility classes for industrial spacing and tracking.

### 2. Component Refinements
- **AppShell:** Modernize sidebar with better active states and a glassmorphism effect for the profile section.
- **Cards:** Standardize on `rounded-[3rem]` or `rounded-[4rem]` with deep industrial shadows.
- **Dashboard:** Enhance metrics cards with larger values and distinct icons.
- **Tables:** Improve technical data display with better alignment and spacing.

### 3. Route-Specific Improvements
- **Dashboard:** Refine layout for better hierarchy between metrics and recent projects.
- **Project Index:** Standardize the search and filter bar for a more cohesive industrial look.
- **Project Details:** Overhaul technical tabs and item lists for better legibility.
- **Factory Wallboard:** Maximize TV legibility with larger fonts and higher contrast.
- **Assembly:** Ensure mobile buttons are touch-friendly (min-height `h-16`) and status indicators are ultra-clear.
- **Shipping:** Refine volume cards for clarity in high-pressure logistic environments.

## User Review Required
> [!IMPORTANT]
> This is a pure visual overhaul. No business logic or database schemas will be touched.

- Do you have a preference for the "TV Mode" theme? (Currently dark by default).
- Should the "Assistência Técnica" maintain the Red/Warning color scheme throughout?
