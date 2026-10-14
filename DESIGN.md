---
name: Backroom Games
description: Board games for the backroom. Quiz night: the chalkboard and the answer sheet.
colors:
  answer-sheet: "#ffffff"
  print-ink: "#14191b"
  chalkboard-slate: "#1e292d"
  chalk: "#f1f0ea"
  ok-print: "#2f9a50"
  ok-chalk: "#43b267"
  waiting-print: "#d99a00"
  waiting-chalk: "#f2c230"
  danger-print: "#b8322b"
  danger-chalk: "#ff8a80"
  corners-blue: "#2f6fdb"
  corners-yellow: "#e8b923"
  corners-red: "#d6453d"
  corners-green: "#2f9a50"
  corners-marker-blue: "#4a86f2"
  corners-marker-yellow: "#f2c230"
  corners-marker-red: "#ec5a50"
  corners-marker-green: "#43b267"
  sheet-wash: "#efefef"
  sheet-grid: "#cfd0d1"
  chalk-soft: "#a7aba8"
  chalk-rule: "#465052"
  slate-wash: "#293337"
  slate-grid: "#394346"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.25rem, 12vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.75rem, 9vw, 4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  score:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.06em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  none: "0"
spacing:
  xxs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.print-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "2.75rem"
  button-hover:
    backgroundColor: "{colors.sheet-wash}"
  button-primary:
    backgroundColor: "{colors.print-ink}"
    textColor: "{colors.answer-sheet}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "2.75rem"
  input:
    backgroundColor: "{colors.answer-sheet}"
    textColor: "{colors.print-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
    height: "3rem"
  sheet:
    backgroundColor: "{colors.answer-sheet}"
    rounded: "{rounded.none}"
    padding: "1.5rem"
  your-move-mark:
    textColor: "{colors.print-ink}"
    typography: "{typography.label}"
  gain-chip:
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.3rem"
---

# Design System: Backroom Games

## Overview

**Creative North Star: "Quiz Night in the Back Room"**

Every room is a pub quiz: the scoreboard on the wall, the answer sheet on the table. The system follows the device's light/dark setting, and each mode is a different object rather than an inverted palette. Light mode is the answer sheet: white paper and print ink, with everything printed in full ink, rules and secondary text included. Dark mode is the chalkboard: flat slate and chalk, where the in-between tones are chalk thinned into slate.

Two values carry every screen. The site itself adds only three status colours (ok, waiting, danger). Every other hue belongs to a game: each game brings its own seat colours, and they appear only on that game's screens and in its seat swatches. Corners uses blue, yellow, red and green; a chess game would bring its own, or none. Headings, codes and numbers are set in bold condensed capitals like a pub board; running text is a plain sans. Controls are ruled boxes like the boxes on an answer sheet. Corners are square.

The screen is dense and tabular, never decorated. The game's signature is the live scoreboard: ranked best first, large numerals in each player's colour, re-ranking with a slide when scores change.

**Key Characteristics:**
- Two shell values per mode, plus three status colours; seat colours come from each game.
- Condensed uppercase display type for headings, codes, labels and numerals; plain sans for sentences.
- 2px ink boxes and 2px ink rules carry structure; no fills, no shadows, no radius.
- One reserved YOUR MOVE mark, underlined in your colour.
- A change stays marked until the next move.

## Colors

Paper and ink, or slate and chalk, plus a few status colours. Seat colours belong to the game being played.

### Primary
- **Print Ink** (print-ink): every line, word, box and numeral on the answer sheet; the fill of primary buttons; the focus ring.
- **Chalk** (chalk): the same role on the chalkboard, a warm off-white rather than pure white.

### Status (the site's own)
- **Ok** (ok-print, ok-chalk): the connected server dot and the online presence dot.
- **Waiting** (waiting-print, waiting-chalk): the connecting server dot and the border of the "Updating" notice.
- **Danger** (danger-print, danger-chalk): form errors, the urgent countdown and the disconnected server dot; red text that stays readable on its ground.
- Text selection is inverted: ground on ink.

### Seat colours (per game)
Each game defines a `--color-<name>` token for every colour name its state uses, with a brighter set for the chalkboard. The shared room UI (lobby seat swatches) and that game's own screens draw players with them; nothing else does. A game with no player colours defines none, and its seats show no swatch.
- **Corners** (corners-blue, corners-yellow, corners-red, corners-green on the sheet; corners-marker-* on the chalkboard): seat swatches, board and tray pieces, score numerals, the YOUR MOVE underline, the gain chip, and the Corners mark in the landing list.

### Neutral
- **Answer Sheet** (answer-sheet): the light-mode ground, and the fill of inputs and the sticky notice.
- **Chalkboard Slate** (chalkboard-slate): the dark-mode ground.
- **Sheet Wash / Slate Wash** (sheet-wash, slate-wash): ink mixed 6% into the ground (`color-mix(in oklab, var(--ink) 6%, var(--ground))`). Hover and selected states on both sheet and board; in dark mode, also the fill of empty board cells.
- **Sheet Grid / Slate Grid** (sheet-grid, slate-grid): the board grid only (ink 18% on the sheet, 15% on the slate).
- **Chalk Soft** (chalk-soft): secondary text on the chalkboard (chalk 68% into slate). On the sheet the same role prints in full ink.
- **Chalk Rule** (chalk-rule): thin 1px row dividers on the chalkboard (chalk 22%). On the sheet these rules print in full ink.

### Named Rules
**The Two Values Rule.** The shell is drawn in ground and ink only. On the answer sheet, secondary text and thin rules are full ink; the only faint ink is the board grid, the wash under hover and selection, and played or illegal pieces. On the chalkboard, in-between tones are always chalk mixed into slate in oklab, never an unrelated grey.

**The Games Own Their Colours Rule.** The shell never uses a game's seat colours, and a game's colours never leak onto another game's screens or the site chrome. A hue on screen means either a status (ok, waiting, danger) or a player in the current game. Never introduce a brand accent.

**The Readable Seat Rule.** A seat colour too light to read as text on the answer sheet prints its numerals in ink and keeps the colour in swatches and pieces. In Corners that is yellow.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, sans-serif), weights 600 and 800
**Body Font:** Barlow (with system-ui, sans-serif), weights 400 and 600

**Character:** A pub board over a printed sheet. Tight, heavy condensed capitals for anything you read across a table (codes, scores, names of games, headings); a plain, friendly sans for sentences and controls.

### Hierarchy
- **Display** (800, clamp(3.25rem, 12vw, 6rem), 1): the landing wordmark only.
- **Headline** (800, clamp(2.75rem, 9vw, 4rem), 1, 0.04em): the room code on the room page.
- **Score** (800, 2.75rem, 1, tabular figures; 1.75rem under 30rem): scoreboard points in the seat colour. Game names in the landing list (2.5rem) and the winner line (2.5rem) share this weight.
- **Title** (800, 1.5–2.25rem, 1, 0.02–0.06em, uppercase): section and page headings (h1, h2, sheet headings).
- **Label** (600, about 1–1.25rem, 0.06–0.14em, uppercase): form labels, the turn line, the room code label, tags, the waiting line, tray sizes and key caps. Small marks (YOUR MOVE, to move) use 0.9375rem with 0.12em.
- **Body** (400, 1rem, 1.5): sentences, status text, names in the scoreboard.
- **Body Strong** (600, 1rem, 1.2): button text, form errors, the current player's name.

### Named Rules
**The Pub Board Rule.** Numbers and codes are always condensed 800 with tabular figures. Sentences are never set in the condensed face.

**The Lowercase Settings Rule.** Labels are uppercased by CSS, never by the source text, so settings strings stay lowercase and read in a sentence.

## Layout

Single column, max 72rem, centred, with 1rem side padding (2rem from 48rem up). Every page opens with a heading block closed by a full-width 2px ink rule. Spacing steps are 0.25, 0.5, 0.75, 1, 1.5, 2 and 3rem.

- **Landing:** wordmark, the rule, then the join sheet with the game list below it at every width (gap 3rem). The join row puts name, code and Join on one line, stacking under 36rem.
- **Forms:** create form and name prompt cap at 28rem; the lobby at 40rem.
- **Game:** from 56rem, a left column of 18–22rem holds the scoreboard, turn line, controls and tray; the board sits alone to the right, sized to the viewport height (`calc(100svh - 12rem)`), with a 3rem gap. Below 56rem everything stacks: room head, scoreboard, board, controls, tray. Results use the same two columns.
- **Lists as ruled tables:** scoreboard, seats and game list open with a 2px ink rule on top; rows are divided by rules, not boxed.
- **Touch:** controls are at least 2.75rem tall, inputs 3rem; key caps hide on touch-only devices; inputs stay at 16px or larger.

## Elevation & Depth

Flat. There are no drop shadows anywhere. Depth comes from ink weight and tonal wash: a 2px ink box encloses a control or sheet, a 6% wash marks hover or selection, and a wash in a seat's own colour marks whose pieces are showing. The only shadow in the build is an inset 2px ink ring on the selected tray piece, which reads as a thicker box rather than a lift.

### Named Rules
**The Flat Sheet Rule.** Nothing floats. To raise attention, thicken the ink or wash the ground; never add a shadow.

## Shapes

Square corners everywhere (0 radius), including buttons, inputs, sheets, tray slots, the gain chip and SVG icon line caps (`stroke-linecap: square`). Borders come in three weights: 2px ink for boxes, structural rules and controls; 1.5px for small chips (host tag, tray slots, key caps); 1px for row dividers and the footer. A dashed border means "already used" (played tray pieces) or "not allowed here" (illegal placement ghost). The single round form is the small status dot (server connection, player presence), kept as a dot so it can't be mistaken for a seat swatch.

## Components

### Buttons
Ruled boxes, like the boxes on an answer sheet.
- **Shape:** square (0), 2px ink border, min height 2.75rem, padding 0 1rem; icon and text gap 0.5rem.
- **Default:** transparent fill, ink text, Barlow 600 at 1rem.
- **Primary:** ink fill with ground-coloured text, for the one forward action on a screen (Join, Create, Start, Rematch). Larger primaries go to 3.25rem tall.
- **Hover / Active / Focus:** default buttons take the 6% wash; primaries lighten to 86% ink; pressing nudges down 1px; focus is a 3px ink outline 2px out. Background transitions run 120ms ease-out.
- **Disabled:** 40% opacity.

### Chips
- **Tag** (host): 1.5px ink box, condensed 600 uppercase at 0.875rem, 0.1em spacing.
- **Gain chip:** points the last move earned (+4), boxed 2px in the seat colour on a 28% seat-colour wash, condensed 600 tabular. It stays until the next move.
- **Key cap:** the control's hotkey, a 1.5px rule box with a 3px bottom edge, condensed 600 at 0.8125rem; hidden on touch-only devices.

### Cards / Containers
- **Sheet:** the join and create panels. 2px ink box, 0 radius, 1.5rem padding, 1rem internal gap, no fill beyond the ground.
- **Notice:** a sticky 2px box in the waiting colour on the ground, centred 600 text, for transient states ("Updating, back in a moment").

### Inputs / Fields
- **Style:** 2px ink box, 0 radius, ground fill, 3rem tall, Barlow 400 at 1rem. Labels sit above in condensed uppercase.
- **Select:** native appearance removed, a 2px-stroke chevron in ink at the right.
- **Code input:** the room code types in condensed 800 at 1.375rem with 0.2em spacing; its placeholder drops to 400 so a sample never reads as filled in.
- **Focus:** 3px ink outline, 2px offset. **Error:** a 600 line in danger red below the field.

### Navigation
A site bar holds only the wordmark: condensed 800 at 1.125rem, 0.1em spacing, uppercase, with a 2px underline on hover. Back links are 600 with a drawn arrow. Landing game rows are full-width ruled rows (game mark, name, player range, arrow) that wash on hover while the arrow slides 4px right.

### Scoreboard (signature)
The live pub-quiz leaderboard. A ruled list opens with a 2px ink rule; rows are divided by 1px rules and are buttons that switch whose pieces are shown.
- Each row: rank (condensed 800, soft), seat swatch(es), name, then the score right-aligned in the seat colour (Score type).
- The pressed row washes 14% in that seat's colour.
- **Re-ranking:** when scores change, rows reorder best first and each slides from its old position, 420ms on `cubic-bezier(0.16, 1, 0.3, 1)`; skipped under reduced motion.
- **YOUR MOVE mark:** the one reserved mark that it's your move, condensed 800 uppercase at 0.9375rem with a 4px underline in your colour. Other rows whose turn it is say "to move" in soft text, no underline.
- **Last move:** the gain chip on the scorer's row, and a 3px ink outline around the last-placed piece on the board, both until the next move.

### Board and Tray
- **Board:** square SVG grid, 1px grid-coloured lines, empty cells in the ground (sheet) or the wash (slate). Placement ghosts carry a 2px ink outline at 90% fill; illegal ones go dashed in soft ink.
- **Tray:** pieces in rows by square count, each in a 2.5rem square slot with a 1.5px rule border, at one fixed cell size wherever pieces appear. Selected slot: ink border plus inset ring and wash. Played pieces keep their slot, dashed and greyed, so the tray never shifts.
- **Icons:** drawn inline SVG strokes in the text colour, square caps, 1.75–2px, at 1–1.125rem.

## Do's and Don'ts

### Do:
- **Do** draw every shell element in ground and ink only; on the answer sheet, print secondary text and rules in full ink.
- **Do** let each game define its own seat colours, with a brighter set for the chalkboard, and use them only to mean a player in that game.
- **Do** print a seat colour's numerals in ink on the answer sheet when the colour can't be read as text there (Corners' yellow).
- **Do** box controls and sheets in 2px ink with square corners, and rule lists with a 2px ink top rule and thinner row dividers.
- **Do** set codes, scores and headings in Barlow Condensed 800 uppercase with tabular figures; set sentences in Barlow.
- **Do** keep a change marked (gain chip, last-move outline) until the next move.
- **Do** keep controls at least 2.75rem tall and respect reduced motion for the re-rank slide.

### Don't:
- **Don't** add a brand accent, or use a game's seat colours for site chrome, status or another game.
- **Don't** introduce unrelated greys; in-between tones are ink mixed into the ground in oklab.
- **Don't** round corners or add drop shadows.
- **Don't** use a second YOUR MOVE-style mark; the underline in your colour is reserved for that one meaning.
- **Don't** use text glyphs for icons; draw them as inline SVG strokes.
