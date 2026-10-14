---
version: 1
slug: "apps-client"
primary_target: "apps/client"
related_targets: []
---

# Client app (whole surface)

Scope: every screen of the browser client — landing, create form, name prompt, lobby, the Corners game and results. Visitor mode: Operate.

Audience and job: friends starting and playing a game together, each on their own phone or laptop, in the same room or apart. The task is to get from "let's play" to the first move fast, then always see whose turn it is, the scores and what's left.

Constraints: Corners keeps its classic blue/yellow/red/green piece colours (those are Corners' own; other games bring their own seat colours), and follow the system light/dark setting. The user asked for simple and straightforward, no fuss: no generic SaaS, casino or gamer glow, cartoon look, or decoration that slows play. Layout and interactions may change.

## Direction contract

THESIS: Every room is a game night in the back room: the scoreboard on the wall, the sheet on the table. Refuses the neutral card-and-sidebar game-site layout.

OWN-WORLD: Two values carry the shell: flat slate and chalk white in dark mode, answer-sheet white and print ink in light mode, with no greys in between. The site adds only status colours (ok, waiting, danger); every other hue is a game's seat colour, shown only on that game's screens and seat swatches. Corners' four piece colours are saturated like chalk markers. Headings and numbers are set in bold condensed capitals like a pub board; body text is a plain sans. Rules are drawn as chalk lines; corners are square.

STORY: A player sees the room code first, sees where they stand, and knows immediately whether it's their move.

FIRST VIEWPORT: In the game, the room code is set large at top left with the game name beside it and a copy-invite button at the right, above a full-width rule. The left column holds the ranked scoreboard (large coloured numerals; your row carries the YOUR MOVE mark), the timer, the tray and its controls. The board sits on its own to the right. On phones everything stacks: code, scoreboard, board, tray.

FORM: Quiz Night (pub quiz chalkboard and answer sheet); candidate 7 of my re-rolled list; seed key 4e4121da. Signature move: the scoreboard as a live pub-quiz leaderboard, re-ranking as scores change. Raises: two shell values only; one reserved your-move mark in your colour; pieces at one fixed cell size everywhere; a change stays marked until the next turn.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
