---
name: web-design-guidelines
description: Review UI code for Vercel Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Vercel's Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below (falls back to the cached local copy if offline).
2. Read the specified files (or prompt the user for files/pattern).
3. Check against all rules in the fetched guidelines.
4. Output findings in the terse `file:line` format.

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

If the fetch fails, fall back to the cached local copy: `./guidelines.md` (relative to this SKILL.md).

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above.
2. Read the specified files.
3. Apply all rules from the fetched guidelines.
4. Output findings using the format specified in the guidelines.

If no files are specified, ask the user which files to review.
