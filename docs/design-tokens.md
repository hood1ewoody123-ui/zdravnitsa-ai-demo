# Design Tokens Standard (Material-inspired)

## Principles
- Один источник истины: все значения UI через токены в `:root`.
- Семантические имена (`--danger`, `--space-4`), не привязанные к конкретному компоненту.
- Состояния компонентов (default/focus/error/disabled) также описываются токенами.

## Material role mapping
- Colors follow semantic roles: `--md-sys-color-primary`, `--md-sys-color-on-primary`, `--md-sys-color-surface`, `--md-sys-color-surface-container`, `--md-sys-color-outline`, `--md-sys-color-error`.
- Typography uses one family (`Inter`) and explicit scales for title/body/label.
- Shape uses tokenized radii (`sm/md/lg/pill`) for predictable component form.
- Elevation uses `--shadow-1`, `--shadow-2`, `--shadow-3`.
- Motion uses standard durations and a single easing curve.

## Tailwind implementation rule
- Токены описываются в `tailwind.config.ts` (`theme.extend.colors`, `borderRadius`, `boxShadow`, `spacing`, `fontSize`).
- В компонентах использовать utility classes + `cn()` для вариативности.
- Варианты компонентов (button/input/card) задавать через `class-variance-authority`.

## Form UX standard
- Валидировать через `react-hook-form` + `zodResolver`.
- Ошибки полей показывать inline с понятным текстом.
- Phone: автоформат в `+7 (999) 123-45-67`.
- Submit: блокировка кнопки + loading state.
- Состояния form flow хранить в feature-local state; cross-feature state только через Zustand.

## External UI libraries
- `Inter` from Google Fonts (typography baseline).
- `lucide-react` for all UI icons.
- `@radix-ui/react-*` as primitive accessibility layer.
- `framer-motion` for micro-interactions and transitions.
