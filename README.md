# 42 Next Header

A VS Code extension that inserts and maintains the standard [42 school](https://42.fr/) file header. The `Updated` timestamp and filename are kept in sync automatically on every save.

```
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   vscode-42next-header                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: marvin <marvin@student.42madrid.com>       +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2019/09/26 10:10:10 by marvin            #+#    #+#             */
/*   Updated: 2026/05/17 21:42:42 by marvin           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
```

## About

**42 Next Header** is a modern rewrite and continuation of the original [`vscode-42header`](https://github.com/kube/vscode-42header) extension. It preserves the same concept but is rebuilt with TypeScript strict mode, zero runtime dependencies and tests.

## Features

- **One shortcut** inserts or updates the header in any supported language.
- **Auto-sync on save**: the `Updated` field and filename refresh automatically when you save a file that already has a header.
- **Formatter-safe**: works with `rustfmt`, `black`, `ruff`, `clang-format`, and other formatters that might rewrite comment syntax.
- **Custom delimiters**: override the default comment style for any language via settings.
- **Zero runtime dependencies**: lightweight, fast, and offline.
- **flake8-compatible**: Python headers use line comments (`# `) without trailing `#`, so `flake8` and `ruff` won't flag them.
- **Shebang-aware**: when a file starts with `#!/usr/bin/env python3` (or any `#!` line), the header is placed right after it. Updates on save preserve the shebang position.

## Installation

### From the VS Code Marketplace

Open VS Code, go to **Extensions** (Cmd+Shift+X / Ctrl+Shift+X), search for **"42 Next Header"**, and click **Install**.

### From a .vsix file

If you have a `.vsix` file:

1. Open VS Code
2. Go to **Extensions** → **···** (top-right menu) → **Install from VSIX…**
3. Select the `.vsix` file

To uninstall, find "42 Next Header" in the Extensions panel and click **Uninstall**.

## Usage

| Action                  | macOS       | Linux / Windows |
| ----------------------- | ----------- | --------------- |
| Insert or update header | `Cmd+Alt+H` | `Ctrl+Alt+H`    |

The header is inserted at the top of the active file. If a header already exists, it is replaced in-place so the `Updated` field and filename stay current.

The `Updated` field and filename are refreshed automatically every time you save a file that already has a header. You do not need to press the shortcut again after the first insertion.

## Configuration

All settings live under the `42header` namespace. You can set them globally in your VS Code **User Settings** or per-project in `.vscode/settings.json`.

### Basic settings

```json
{
  "42header.username": "pruiz-ca",
  "42header.email": "pruiz-ca@student.42.fr"
}
```

| Setting                       | Type     | Default                    | Description                              |
| ----------------------------- | -------- | -------------------------- | ---------------------------------------- |
| `42header.username`           | `string` | `$USER` env variable       | Username shown in the header             |
| `42header.email`              | `string` | `<username>@student.42.fr` | Email shown in the header                |
| `42header.languageDelimiters` | `object` | `{}`                       | Override comment delimiters per language |

### Custom delimiters

You can override the comment delimiters for any language. Each value is a `["left", "right"]` pair of equal-length strings. The extension warns you at startup if a value is malformed.

```json
{
  "42header.languageDelimiters": {
    "zig": ["// ", " //"],
    "ada": ["-- ", " --"]
  }
}
```

**Important:** The extension validates delimiter overrides on activation and whenever the setting changes. Invalid entries (non-arrays, wrong length, non-string elements, or empty left delimiters) are ignored and a warning is shown.

## Supported languages

Built-in support for 37 languages:

C, C++, CoffeeScript, CSS, Dockerfile, F#, Go, Groovy, Haskell, INI, Jade, Java, JavaScript, JSX, LaTeX, Less, Lua, Makefile, Objective-C, OCaml, Perl, PHP, Plaintext, PowerShell, Python, R, Ruby, Rust, SCSS, Shell, SQL, Swift, TypeScript, TSX, XSL, YAML

**Special handling:**
- **Rust** uses `// ` line comments to stay compatible with `rustfmt`.
- **Python** uses `# ` line comments (no trailing `#`) to stay compatible with `black`, `ruff`, and `flake8`.
- **Shebangs**: headers are placed after `#!` lines when present. The extension detects and updates them in-place on save.
- **Other languages** use block comments (`/* ... */`, `(* ... *)`, etc.) where available.

## Troubleshooting

**"No comment delimiter for language 'xyz'"**

The language you are using does not have a built-in delimiter. Add one via `42header.languageDelimiters` in your settings.

**Header is not updated on save**

Make sure the file already has a 42 header. The auto-update only triggers for files that contain a valid header at the top. If the header was inserted with a different extension or manually, it may not be recognized.

**Formatter removes the header**

Some aggressive formatters may rewrite comment syntax. The extension handles this automatically by re-applying the correct delimiter after the formatter runs. If you still see issues, try using line-comment delimiters for that language (e.g. `//` instead of `/* */`).

## Developer Guide

Want to add a language, fix a bug, or extend functionality? This section is for you.

### Project structure

```
src/
├── delimiters.ts    # Language ID → [left, right] delimiter mappings
├── extension.ts     # VS Code activation, commands, save watchers
├── header.ts        # Header template, field extraction, rendering
├── template.ts      # ASCII template, field locate/set/get helpers
└── test/
    ├── delimiters.test.ts   # Delimiter validation tests
    └── header.test.ts      # Header render/extract/round-trip tests
```

### Adding a language

1. Open `src/delimiters.ts`.
2. Add a new entry to `defaultDelimiters`:
   ```ts
   zig: ['// ', ' //'],
   ```
   The key must be the VS Code `languageId` shown in the status bar when you open a file of that type.
3. The left and right strings must be the same length so the 80-character line width is preserved.
4. Add a round-trip test in `src/test/header.test.ts` (the `'all delimiters produce 80-char lines'` test covers it automatically once the entry exists).
5. Run `pnpm typecheck && pnpm test` to verify.

### Extending functionality

**Adding a new command**

Register it in `src/extension.ts` inside `activate()`:

```ts
vscode.commands.registerCommand('42header.myCommand', myCommandHandler)
```

**Adding a new setting**

1. Add the property to `contributes.configuration.properties` in `package.json`.
2. Read it in `src/extension.ts` via `vscode.workspace.getConfiguration('42header').get('mySetting')`.
3. Add tests in `src/test/delimiters.test.ts` or `src/test/header.test.ts`.

**Changing the header template**

The template lives in `src/template.ts` as the `TEMPLATE` constant. It uses `$PLACEHOLDER____` markers where the underscores act as padding to ensure exact 80-character line widths. If you modify the template:

1. Update `HEADER_LINE_COUNT` (it is derived automatically from `TEMPLATE`).
2. Ensure all non-blank lines are exactly 80 characters after delimiters are applied.
3. Run tests: the `'every non-blank line is exactly 80 characters'` test will catch any width violations.

### Building and testing

```sh
# Install dependencies and activate git hooks
pnpm install

# Watch-mode TypeScript compile
pnpm compile

# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Full TypeScript type check
pnpm typecheck

# Launch in VS Code Extension Development Host
# Press F5 or open Run panel → Launch Extension
```

### Packaging locally

```sh
pnpm add -g @vscode/vsce
vsce package --allow-missing-repository
```

This produces `42next-header-<version>.vsix` in the project root.

### Contributing

See `CONTRIBUTING.md` in the repository root for pull request guidelines, CI requirements, and hook setup.

## License

MIT License

Copyright (c) 2016 Christophe Feijoo
Copyright (c) 2026 pruiz-ca
