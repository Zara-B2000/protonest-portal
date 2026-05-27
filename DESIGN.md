# Protonest Portal — Design System

## Principles
- Mobile-first: design for 390px viewport, enhance for desktop
- Clean, minimal: no decoration for its own sake
- Trust signals: clear order IDs, status labels, support contacts
- Accessibility: sufficient contrast, labelled inputs, descriptive errors

---

## Colours

| Token         | Hex       | Usage                              |
|---------------|-----------|------------------------------------|
| brand-700     | #1A3C5E   | Primary nav, headings, CTA buttons |
| brand-500     | #2E75B6   | Links, accents, active states      |
| brand-50/100  | #EFF6FF   | Backgrounds, hover fills           |
| slate-900     | #0F172A   | Body text                          |
| slate-500     | #64748B   | Secondary text, labels             |
| slate-200     | #E2E8F0   | Borders, dividers                  |
| slate-50      | #F8FAFC   | Page backgrounds                   |
| white         | #FFFFFF   | Card backgrounds                   |
| emerald-700   | #047857   | Success, paid status               |
| amber-600     | #D97706   | Warnings, near-deadline            |
| red-600       | #DC2626   | Errors, destructive actions        |

---

## Status Badge Colours

| Status                | Background  | Text        |
|-----------------------|-------------|-------------|
| quote_pending         | amber-100   | amber-800   |
| quote_ready           | blue-100    | blue-800    |
| payment_completed     | emerald-100 | emerald-800 |
| components_received   | purple-100  | purple-800  |
| in_assembly           | indigo-100  | indigo-800  |
| inspection            | sky-100     | sky-800     |
| ready_for_delivery    | teal-100    | teal-800    |
| delivered             | green-100   | green-800   |

---

## Typography

| Element        | Class                              |
|----------------|------------------------------------|
| Page heading   | `text-2xl font-bold text-slate-900` |
| Section heading| `text-lg font-semibold text-slate-900` |
| Label          | `text-sm font-medium text-slate-700` |
| Body           | `text-sm text-slate-600`           |
| Caption        | `text-xs text-slate-400`           |
| Order number   | `font-mono font-bold text-brand-700 text-2xl+` |

---

## Spacing & Layout

- Max content width: `max-w-6xl mx-auto px-4` (landing, dashboard)
- Max form width: `max-w-2xl mx-auto`
- Section padding: `py-8` on pages, `p-5` or `p-6` on cards
- Component gap: `space-y-6` between sections

---

## Components

### Buttons
```tsx
// Primary
<button className="bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-md hover:bg-brand-900 transition-colors disabled:opacity-50">

// Secondary
<button className="border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-md hover:bg-slate-50 transition-colors">

// Danger
<button className="bg-red-600 text-white font-semibold px-5 py-2.5 rounded-md hover:bg-red-700 transition-colors">
```

### Form Inputs
```tsx
<input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
```

### Cards
```tsx
<div className="bg-white border border-slate-200 rounded-xl p-5">
```

### Error Messages
```tsx
<p className="text-xs text-red-600 mt-1">{error}</p>
// Server error banner:
<div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
```

### Info callout
```tsx
<div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">{msg}</div>
```

### Admin-only callout (amber)
```tsx
<div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">{msg}</div>
```

---

## Form Rules

- Every field has a visible `<label>` — never rely on placeholder alone
- Required fields marked with `*`
- Inline error appears below the field in `text-xs text-red-600`
- File inputs use native `<input type="file">` — NO custom drag-and-drop as primary mechanism
- Textarea rows: 2–3 for short notes, 4+ for longer content
- Number inputs: always set `min` and `max`

---

## Status Timeline

- Desktop: horizontal with connecting line (`hidden md:block`)
- Mobile: vertical stacked (`md:hidden`)
- Completed step: filled brand-500 circle + CheckCircle icon
- Current step: white circle + brand-500 border + ring + Clock icon
- Upcoming step: grey circle + Circle icon
- Each step shows timestamp when reached

---

## Empty States

```tsx
<div className="text-center py-16">
  <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-slate-700 mb-2">No items yet</h3>
  <p className="text-sm text-slate-500 mb-6">Description of what to do next.</p>
  <Link href="/..." className="bg-brand-700 text-white ...">CTA</Link>
</div>
```

---

## Admin vs Customer Visual Distinction

- Admin nav: `bg-brand-900` (darker)
- Admin badge: amber `ADMIN` label in nav
- Internal-only fields: `bg-amber-50` background with red warning text
- Admin notes section: amber border + background

---

## Mobile Checklist

Before any release:
- [ ] All forms usable at 390px
- [ ] File upload tested on Chrome for Android
- [ ] Tables have horizontal scroll (`overflow-x-auto`)
- [ ] Nav has mobile-friendly strip below header
- [ ] Order ID displayed in large font on confirmation screen
- [ ] Tap targets minimum 44px height
