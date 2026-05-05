# UI Spec

## Visual baseline
- Dark theme, clean medical-tech style.
- Mobile-first, base breakpoint `768px`.
- Smooth motion only via Framer Motion (short, meaningful transitions).

## UI stack
- Components: Radix UI primitives in shadcn-style wrappers.
- Styling: Tailwind CSS utility-first with semantic tokens.
- Icons: Lucide React only.
- Animation: Framer Motion.

## Token usage
- Все цвета/радиусы/тени/типографика приходят из токенов в Tailwind theme.
- Никаких хардкодов цветов в компонентах без крайней причины.

## Key blocks
- Header: logo left, active status right with pulse dot and current time.
- Intercept form card: centered, max width around 520px.
- Manager notification card: appears with subtle motion.
- Chat closed state: fixed pill in right-bottom corner.
- Chat open state: `380x520`, rounded card, typing indicator.
- Protocol section: two columns (description + interactive upload/PDF area).

## App structure hint (Next)

```tsx
// features/intercept/*
// zod schema + react-hook-form + submit flow + manager card

// features/protocol/*
// upload + whisper + protocol summary + pdf preview/send

// features/chat/*
// widget open/close + messages + streaming response
```
