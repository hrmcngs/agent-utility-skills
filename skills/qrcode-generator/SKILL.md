---
name: qrcode-generator
description: Generate a QR code image from a URL or text and save it as PNG or SVG. Use when the user wants a QR image as an output, rather than adding QR functionality to an application.
---

# QR code generator

Generate the image locally using `scripts/generate.mjs` alongside this skill. Do not use an image-generation model or send the payload to an external QR service.

- Take the URL or text from the invocation or conversation, preserving it exactly. If missing, ask what to encode. Never guess a URL or resolve a short link.
- Defaults: PNG, 512 pixels, four-module margin, black on white, medium error correction. Honor requested format, size, margin, colors, and destination.
- Resolve this skill's directory from the loaded SKILL.md location. Its dependencies live here, not in the user's application. If missing, run `npm ci --omit=dev --prefix <skill-directory>` using the environment's normal permissions. Do not edit the application's package.json or install global dependencies.
- Run `node <skill-directory>/scripts/generate.mjs --output <destination> -- <text>`. Quote arguments correctly. For multiline text or text that is hard to quote, write the exact content to a temporary UTF-8 file and pipe it to `node …/generate.mjs --stdin --output <destination>`. Do not add a trailing newline to the payload.
- Optional flags: `--format png|svg`, `--size 512`, `--margin 4`, `--dark '#000000'`, `--light '#ffffff'`. `--help` shows all options.
- Default destination is `qrcode.png` in the user's working directory. If it exists, choose a new filename; never replace it. Relative output paths are relative to the working directory, not this skill's directory.
- On success, link to the output file and preview it if the environment supports image display. Without preview support, report the saved file. Do not claim a real phone scan was tested unless it was.
- For customized colors or reduced margins, mention that the user should check scanning on their intended device. On errors, explain the actual error; don't report success.

Claude Code invokes this skill as `/qrcode-generator https://example.com`.
Codex can invoke it as `$qrcode-generator https://example.com`. This file uses no product-specific tool names, hooks, or argument substitutions.
