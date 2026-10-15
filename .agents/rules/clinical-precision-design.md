# DESIGN SYSTEM: Clinical Precision

## CRITICAL RULE: NEVER USE EMOJIS IN THIS SYSTEM
Do NOT use emojis anywhere in this project: not in the UI, components, code, comments, documentation, console logs, test scripts, or commit messages. Use clean, professional Lucide icons or concise clinical text instead. Failure to follow this rule is unacceptable.

---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#7f4025'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c573a'
  on-tertiary-container: '#ffe5db'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb598'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#72361b'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an authoritative, clinical, and reassuring environment tailored for enterprise pharmacy operations, medication dispensing, and inventory management. The visual tone balances sterile precision with human-centric clarity, ensuring pharmacists and healthcare administrators can process critical information rapidly without cognitive fatigue or error.

The style is grounded in **Corporate / Modern** principles with clinical discipline:
- **Atmosphere:** Clean, reliable, and calm, minimizing visual distraction to facilitate accuracy in dosage, patient verification, and stock validation.
- **Visual Weight:** Deliberate balance between slate neutrals and focused teal accents, creating a structured hierarchy that guides workflow states smoothly.
- **Target Audience:** Pharmacists, pharmacy technicians, inventory specialists, and clinical operations managers requiring dense, legible, and actionable data displays.

## Colors

The palette employs a restrained, medical-grade color hierarchy designed to convey trust, focus attention, and instantly communicate operational status.

### Functional Roles
- **Primary (`#0F766E`):** Represents purposeful clinical action. Applied to primary calls-to-action, active navigation states, interactive links, and accessibility focus indicators.
- **Secondary / Headings (`#0F172A`):** Deep navy slate providing decisive contrast for page titles, high-level metrics, and structural emphasis.
- **Neutrals:**
  - Base Background: `#F8FAFC` (cool slate tint, reducing screen glare in clinical lighting).
  - Surface Card Background: `#FFFFFF`.
  - Border/Divider: `#E2E8F0` (demarcates structural boundaries without visual heaviness).
  - Body Text: `#475569` (optimal legibility for prolonged documentation review).
  - Muted Text / Placeholders: `#94A3B8`.

### Status Architecture
Color coding strictly conveys clinical and inventory conditions using paired foregrounds and tinted fills:
- **Success (`#16A34A` / Background `#DCFCE7`):** Dispensed orders, valid prescriptions, in-stock inventory.
- **Warning (`#F59E0B` / Background `#FEF3C7`):** Low stock thresholds, pending verifications, expiring batches.
- **Danger (`#DC2626` / Background `#FEE2E2`):** Contraindications, critical interactions, out-of-stock, recall alerts.
- **Info (`#2563EB` / Background `#DBEAFE`):** Patient insurance updates, automated audit notes, system status.

## Typography

The typographic hierarchy utilizes **Inter** across all roles, capitalizing on its tall x-height, neutral tone, and clear distinctions between tabular numerals, uppercase characters, and punctuation.

- **Headlines:** Set in `Inter` semi-bold and bold with negative tracking at larger sizes to create clean, anchored titles for dashboards and patient charts.
- **Body:** Standardized on 14px base (`body-md`) with 20px line-height to ensure high-density information layouts remain readable.
- **Labels & Captions:** 12px and 11px weights for metadata, pill status badges, field labels, and metric annotations.
- **Tabular Figures:** Numbers in tables, stock quantities, NDC codes, and dosages must enable tabular lining (`font-feature-settings: "tnum"`) to guarantee vertical visual alignment across dense data grids.

## Elevation & Depth

- **Canvas Base:** `#F8FAFC` flat surface.
- **Level 1 (Cards, Metric Tiles, Table Containers):** `#FFFFFF` surface bounded by a continuous 1px solid `#E2E8F0` border, paired with an ambient shadow: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Dropdowns, Popovers, Active Hover States):** `#FFFFFF` surface with `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` and `#E2E8F0` border.
- **Level 3 (Modals, Clinical Alerts, Dialogs):** `#FFFFFF` surface with `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a dim backdrop overlay (`rgba(15, 23, 42, 0.4)`).

## Components Specification
- **Buttons (Primary):** Background `#0F766E`, text `#FFFFFF`, border none, 8px radius. Height 40px (padding 0 16px). Hover: `#115E59`.
- **Buttons (Secondary):** Background `#FFFFFF`, text `#0F172A`, 1px border `#E2E8F0`. Hover: `#F8FAFC`.
- **Buttons (Destructive):** Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.
- **Inputs:** Height 40px, 8px radius, border 1px solid `#CBD5E1`, background `#FFFFFF`, text `#0F172A`. Focus: Border `#0F766E`, shadow `0 0 0 3px rgba(15, 118, 110, 0.15)`.
- **Badges:** Padding: 2px 8px, 12px font size, 500 weight, 9999px pill radius.
- **Tables:** Header height 36px, background `#F8FAFC`, uppercase 11px label font `#475569`, border bottom 1px `#E2E8F0`. Quantitative fields right-aligned with monospace/tabular digits.
