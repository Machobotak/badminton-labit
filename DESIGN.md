---
name: Badminton Split
description: Patungan badminton tanpa drama — split biaya adil sampai rupiah terakhir.
colors:
  court-deep: "#0c4a44"
  court-ink: "#08322e"
  court-mist: "#e0edea"
  shuttle-yellow: "#f2c230"
  shuttle-pale: "#fdeec0"
  shuttle-burnt: "#5b3f00"
  on-shuttle: "#0a2e2b"
  fault-coral: "#b23a22"
  lamp-green: "#166534"
  fault-red: "#b3261e"
  caution-amber: "#7a4d00"
  paper: "#f6f3ea"
  card: "#fffdf6"
  court-sand: "#efe9da"
  ink: "#0a2422"
  ink-muted: "#3f5d5a"
  ink-faint: "#4f6664"
  line: "#d9d0b8"
  night-base: "#071412"
  night-card: "#0c2421"
  night-ink: "#f2f4ec"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  lane: "14px"
  field: "8px"
  pill: "9999px"
spacing:
  lane-gap: "12px"
  lane-pad: "16px"
  panel-pad: "20px"
components:
  button-primary:
    backgroundColor: "{colors.shuttle-yellow}"
    textColor: "{colors.on-shuttle}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#ffd968"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.court-deep}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  scoreboard-panel:
    backgroundColor: "{colors.court-ink}"
    textColor: "#f6f3ea"
    rounded: "{rounded.lane}"
    padding: "{spacing.panel-pad}"
  lane-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lane}"
    padding: "{spacing.lane-pad}"
---

# Design System: Badminton Split

## Overview

**Creative North Star: "The Hall Scoreboard"**

Badminton Split looks like the world it serves: a GOR scoreboard bolted above court lines. Deep court-green shells hold the structure, shuttlecock-yellow is spent only on the one action that matters per screen, and every rupiah renders in fixed-width tabular figures that snap like a flipping scoreboard digit when totals change. Lanes — not cards — carry content: full-width rows divided by 1px court lines, each with its occupants and its lamp.

Density is compact but never cramped; the chairperson operates one-handed under mixed hall light, so touch targets stay 36–44px and status reads at a 3-second glance. One system sans throughout, Bahasa Indonesia copy, light paper by day and night-green by night via a single `.dark` class.

**Key Characteristics:**
- Scoreboard panels: near-black green, hairline borders, light tabular numerals.
- Lanes over cards: neutral rows, 1px dividers, no accent stripes, no glow.
- One loud color: shuttlecock-yellow only for the primary action.
- Lamps, not badges: paid/unpaid and session status read as glowing dots.

## Colors

A two-voice palette — court green for structure, shuttle yellow for action — on warm paper, with lamps for state.

### Primary
- **Deep Court Green** (#0c4a44): shells (navs, scoreboard panels), active pills/chips, focus rings. Dark-mode value #62d3c5 (light-on-dark).
- **Court Ink** (#08322e): scoreboard panel ground with hairline `white/20` border.
- **Court Mist** (#e0edea): tinted backgrounds for active-adjacent surfaces (auth icon wells).

### Secondary
- **Shuttlecock Yellow** (#f2c230): the single loud accent — primary buttons, wizard active segment, active nav pill. Text on it is always Court Ink (#0a2e2b).

### Neutral
- **Warm Paper** (#f6f3ea): app base, faint court-line texture (two sidelines framing the content column, no center line, no grid).
- **Card White** (#fffdf6): lane background.
- **Court Sand** (#efe9da): muted fills.
- **Ink** (#0a2422): body text. **Muted Ink** (#3f5d5a): secondary text. **Faint Ink** (#4f6664): hints.
- **Court Line** (#d9d0b8): 1px dividers and lane borders. Strong line #877a5f for dashed empty states.
- **Night Base** (#071412) / **Night Card** (#0c2421) / **Night Ink** (#f2f4ec): dark-mode surfaces and text.

### Named Rules
**The One Loud Color Rule.** Shuttlecock-yellow appears on at most one action per screen (the primary CTA, the active wizard segment, the active nav item). Its rarity is the point — if everything glows, nothing is the score.
**The Lamp Rule.** State is a dot, never a paragraph: lamp-green lit (#166534) vs. dim/outline for unpaid; session status by hue (active green, upcoming court-green, completed faint).

## Typography

**Display Font:** system sans (-apple-system, Segoe UI, Microsoft YaHei) — the only family in the app.
**Body Font:** same stack.
**Label/Mono Font:** same stack; numerals get `font-variant-numeric: tabular-nums` via `.tnum`.

**Character:** Plain, confident, tabular — lettering behaves like painted court signage, not editorial type.

### Hierarchy
- **Display** (600, max text-5xl, tight): landing thesis line only.
- **Headline** (600, text-2xl): page titles (Masuk, session names).
- **Title** (600, text-xl): section headers (dashboard greeting block, Profil).
- **Body** (400, text-sm, relaxed): descriptions, lane content, form labels are medium.
- **Label** (500, text-xs): eyebrows of data (Total biaya,Tagihanmu, Terkumpul/Sisa).

### Named Rules
**The Scoreboard Figures Rule.** Every rupiah amount renders tabular (`.tnum` or `tabular-nums`), hero totals at text-3xl/4xl, and re-renders trigger the 200ms `score-snap` via `key={total}` + `.animate-score-snap`. Motion dies under `prefers-reduced-motion`.

## Layout

Single centered column (`max-w-md` for focused flows, wider for landing), mobile-first. Dashboard opens with the scoreboard header (greeting + rolling total + Buat Sesi), then status pills, then full-width session lanes — whole-row links with the delete target stop-propped at the lane end. Detail pages use pill tabs over lane content; the wizard uses court-segment progress (filled green / active yellow / remaining neutral) plus a "Langkah x dari 6" label. Bottom nav (mobile) and top nav (desktop) share the dark-green shell; navs hide on landing/auth routes.

## Elevation & Depth

Flat by construction. Depth comes from tonal layering (paper → card → sand) and 1px borders, not shadows. Two quiet shadows exist (`--shadow-card`, `--shadow-raised`) for lane lift only — never colored, never offset-hard. Focus is a 3px court-green ring (`--shadow-focus`), not a glow.

### Named Rules
**The Flat-By-Default Rule.** Separation relies on 1px lines; shadows never carry meaning and never exceed a 2px blur.

## Shapes

Lanes: 14px radius, 1px border (`cardCls`, `scoreCls`). Fields: 8px radius with border-strong on hover and focus ring. Actions: full pills — primary (yellow solid), secondary (green outline), danger (deep coral, never the screen's main action), icon-only 36px round targets, 42px round quick-add. Chips and filter pills are round toggles: on = solid green/white text, off = outlined neutral. Scoreboard panels add a hairline `white/20` border on court ink — the court's white line, not a glow.

## Components

### Buttons
- **Shape:** full pill, `px-6 py-3`, semibold text-sm.
- **Primary:** shuttle-yellow bg, court-ink text; hover #ffd968; press scale 0.97.
- **Secondary:** transparent, court-green border + text; hover tints court-mist.
- **Danger:** deep coral solid, white text; reserved for destructive confirms.
- **Hover / Focus:** color-only transitions (150ms); focus ring 3px; no lift, no translate.

### Scoreboard Panel (`scoreCls`)
Dark-green slab (court ink, `tnum`, light text) with hairline border: hero totals, bill summaries, example ledger on landing. Inner dividers use `white/20`; sub-labels `white/70–80`.

### Lamps (`lampState`, inline dots)
2–2.5px round dots beside names and totals; paid = lamp-green lit, unpaid = amber/warning dim; session lanes map active/upcoming/completed to green/court-green/faint.

### Cards / Containers (`cardCls`)
Neutral lanes: 14px, 1px line border, card-white, quiet shadow. Ledger rows divide with 1px lines; expandable player rows reveal court/kok/lain breakdowns.

### Inputs / Fields (`inputCls`, `inputCompactCls`)
8px, input-bg fill, 1px border; hover strengthens border, focus rings court-green; errors sit in feedback-bg red text; QR upload lane is a dashed-border lane.

### Navigation
Dark-green shell both platforms: desktop top bar (brand + CourtIcon, yellow active pill), mobile bottom bar (icon + label, active yellow, inactive white/70). `aria-current` marks the active route; hidden on `/`, `/login`, `/register`.

### Signature Component: snapping bill figures
Hero numerals carry `key={total}` + `.animate-score-snap` (scale 1.07 → 1 over 200ms) so allocation changes visibly "flip" the board — dashboard total, wizard review total, overview Tagihanmu, join Tagihanmu.

## Do's and Don'ts

Concrete guardrails from the shipped build.

### Do:
- **Do** render every rupiah tabular and let hero totals snap on change (`key` + `animate-score-snap`).
- **Do** keep yellow to one action per screen; active states go green.
- **Do** divide lanes with 1px `border-border` lines; reach for `scoreCls` only for bill/summary panels.
- **Do** honor `prefers-reduced-motion` (snap and press go dead) and keep dark mode purely in `.dark` token redefinitions.

### Don't:
- **Don't** add kickers/eyebrows above headings, gradient text, glassmorphism, or emoji-as-icon.
- **Don't** use left accent borders thicker than 1px, hard offset shadows, or same-size icon-plus-text card grids.
- **Don't** exceed text-5xl display or tighten tracking past -0.04em.
- **Don't** invent new accent hues — the world has exactly two voices (court green, shuttle yellow) plus state lamps.
