# Contributing

## Setup

```sh
pnpm install   # installs deps and activates git hooks
```

The `prepare` script runs automatically and points git at `.githooks/`, so hooks are active from the first install.

## Development

Press **F5** in VS Code to launch a new Extension Host window with the extension loaded. The `watch` task compiles TypeScript in the background and reloads on save.

For a full guide on adding languages, extending commands, and modifying the template, see the **Developer Guide** in `README.md`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm compile` | Watch-mode TypeScript compile |
| `pnpm build` | One-shot production compile |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run unit tests (Jest) |
| `pnpm test:watch` | Run tests in watch mode |

## Git hooks

| Hook | Runs |
|---|---|
| `pre-commit` | `pnpm test` |
| `pre-push` | `pnpm typecheck && pnpm test` |

To skip a hook in an emergency: `git commit --no-verify`.

## Pull requests

- Keep PRs focused: one language addition, one bug fix, etc.
- All CI checks must pass (typecheck + tests).
- No new dependencies without discussion. The extension intentionally has zero runtime deps.
