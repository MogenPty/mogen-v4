# Mogen interface direction

Source: extracted from the existing application UI.

## Character

Mogen is precise, editorial and quietly industrial: high-contrast typography,
compact uppercase labels, sturdy card surfaces and one decisive accent. Admin
surfaces should feel like the operational side of the public brand, not a
generic dashboard template.

## Build mandate

Use the semantic theme and Mogen brand tokens in `app/globals.css`; that file is
the sole source of colour, radius, font and focus values. Compose admin screens
as complete working surfaces with a persistent left navigation rail, clear page
context, useful empty and error states, and compact data-dense controls. Green
and orange accents plus light, dark and system appearance must work everywhere.

## Composition

- Public surfaces may use broad editorial spacing and the blueprint treatment.
- Admin surfaces use a left application sidebar, a restrained sticky utility
  header and responsive content regions built from shared `AdminCard` surfaces.
- Use `font-display` for page identity and `small-caps` for navigation labels,
  statuses and supporting metadata.
- Prefer grouped cards and real tables on wide screens; preserve readable
  stacked records on narrow screens.

## Component and usage rules

- Use semantic `background`, `card`, `foreground`, `muted`, `border` and
  `sidebar` tokens together. Never mix a fixed light surface with theme-aware
  text.
- Use `catalyst` for the selected state and primary action, not decoration on
  every element.
- Reuse `components/mogen/admin-card.tsx` and `components/ui/*` primitives.
- Icons come from Lucide, are decorative beside visible labels, and never
  replace an accessible name.
- Every screen supports keyboard focus, narrow viewports, light/dark themes and
  both accent choices.

## Responsive behavior

The admin sidebar collapses to icons on desktop and becomes an off-canvas sheet
on mobile. Screen content remains single-column first, adding table or card
columns only when the available width supports them. Controls retain practical
touch targets and no horizontal page scrolling.
