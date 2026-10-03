# Backroom Games

Browser board games for a group of friends. Someone creates a room, shares the
room code, and everyone plays from their own browser. No accounts, no installs.

The first game is **Corners**, a polyomino territory game: claim the board one
piece at a time, touching your own pieces only at the corners.

> Early days: the project skeleton is in place and Corners is being built.

## Quickstart A: just play it

You need [Docker](https://docs.docker.com/get-docker/), nothing else.

```sh
docker compose up --build
```

Open http://localhost:3000.

## Quickstart B: develop it

You need Node 24 (see [`.nvmrc`](.nvmrc)) and pnpm.

```sh
corepack enable   # provides pnpm; on Node 25+ run `npm install -g corepack` first
pnpm install
pnpm dev
```

Open http://localhost:5173. The server and client reload when you save.

If port 3000 is taken on your machine, copy `.env.example` to `.env` and change
`PORT`. Run `pnpm check` to lint, typecheck and test everything.

## Testing multiplayer locally

Each browser profile is a separate player, so open the game in a normal window
and a private window side by side. To try it on a phone, run `pnpm dev:host`
and open `http://<your-computer's-IP>:5173` on the same Wi-Fi or tailnet.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, scripts, tests and how changes
get merged.

## License

[MIT](LICENSE)
