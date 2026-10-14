# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Right now: the owner's own friend group. One person creates a room and shares
the code, and everyone joins from their own browser. Later the product may be
open to anyone, but no public audience exists yet.

## Product Purpose

Backroom Games is a place for friends to play board games in the browser.
Getting a game started should take seconds: create a room, share the code, play.
It succeeds when a group gets from "let's play" to the first move with no
sign-up, no install and no explanations needed.

## Positioning

A small, private, free set of board games for people who already know each
other. It isn't a competitive platform or a public matchmaking site. A room code
is the only way in.

## Operating Context

- The host creates a room for a game, picks the settings (player count, turn
  timer, game options such as hints) and shares the code. Others join by
  entering the code and a name.
- Lobby → game → results → rematch, all in one room.
- Players may be in the same room or apart. Each player uses their own device.
- Desktop and phone are both first-class. Boards and controls must work at phone
  size, not just shrink to it.

## Capabilities and Constraints

- Corners is the first game: a 2–4 player territory game where you place
  polyomino pieces corner to corner. More games are planned, so the room flow,
  lobby, settings and results must stay game-agnostic.
- The server is authoritative. Clients send intents and get the full state back,
  so the UI reflects server state and never predicts outcomes.
- Room settings come from a shared registry. Labels are lowercase so they read in
  a sentence ("Turn timer: 1 minute").
- Identity today is just a name per room. Accounts are planned, but their scope
  isn't decided yet, so nothing should assume them or design them out.
- Stack is already set: TypeScript, lit-html views, SVG boards, plain CSS, no UI
  framework.

## Brand Commitments

- The name is "Backroom Games". There is no tagline.
- Game names are original. Never use trademarked titles of the games they
  resemble.
- Free, with no ads, payments or growth mechanics.

## Evidence on Hand

No users, testimonials, stats or press exist. Don't make any up.

## Product Principles

1. **Seconds to the first move.** Every step between "let's play" and playing
   has to justify itself.
2. **The table is shared.** Everyone should see whose turn it is, what just
   happened and what's left, at the same moment.
3. **Games plug in, the room stays the same.** Patterns that work for one game
   shouldn't need rewriting for the next one.
4. **Among friends.** Casual and low-stakes, never competitive-platform pressure.
   Free, with no ads and no engagement tricks.
