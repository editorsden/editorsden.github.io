# Editors Den — The Post-Production Tool & Workflow Archive

A lightning-fast, dark-mode web archive and automation hub designed specifically for video editors, colorists, sound designers, and post-production technical directors. Built with **Astro v5 (Static SSG)**, **Tailwind CSS**, and zero-overhead pre-rendered HTML/CSS, perfectly optimized for Netlify deployment.

---

## Features

- **Dark NLE Aesthetic**: Tailored for editing environments (`#0D1117` true dark slate background with high-contrast electric cyan `#00F0FF` and neon purple `#A855F7` accents).
- **Instant Multi-Criteria Filtering**: Filter software by NLE (Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid, Universal), Operating System (macOS, Windows, Linux), Pricing Model, and Category with zero latency.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Instant fuzzy search powered by Fuse.js indexing software titles, categories, tags, and production bottlenecks (e.g. typing "MKV", "silence", or "proxy" jumps straight to the solution).
- **Problem / Solution Comparative View**: Dedicated tool pages feature high-contrast callouts highlighting the **Production Bottleneck** alongside the **Timeline Solution**.
- **The Dev Hub**: A dedicated section for bespoke pipeline automation, FFmpeg transcode recipes, DaVinci Resolve Python scripting, and Adobe CEP starter kits.
- **Community Submission Loop**: Integrated header modal with an interactive Markdown frontmatter builder and direct links to standardized GitHub Issue templates (`.github/ISSUE_TEMPLATE/tool_submission.yml`).

---

## Tech Stack

- **Framework**: [Astro v5](https://astro.build) (Static Site Generation, zero client JS overhead by default)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) with custom dark NLE theme tokens
- **Typography**: Inter (UI / prose) & JetBrains Mono (code snippets / CLI commands)
- **Search**: [Fuse.js](https://fusejs.io) client-side fuzzy search
- **Icons**: [@lucide/astro](https://lucide.dev)
- **Deployment**: [Netlify](https://www.netlify.com) (`netlify.toml` pre-configured with immutable asset caching headers)

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server in background mode (per AGENTS.md)
npx astro dev --background

# Check server status and logs
npx astro dev status
npx astro dev logs

# Stop dev server
npx astro dev stop
```

Visit [http://localhost:4321](http://localhost:4321) in your browser.

---

## Building & Deploying to Netlify

To build the static distribution:

```bash
npm run build
```

This compiles all routes and Markdown collections into pure static HTML/CSS inside the `./dist` folder.

### Deployment Options:
1. **Netlify Git Integration (Recommended)**: Connect your GitHub repository to Netlify. The included `netlify.toml` automatically configures the build command (`npm run build`) and publish directory (`dist`).
2. **Netlify Drag & Drop**: Run `npm run build` and drop the `./dist` folder directly into the Netlify Web App dashboard.

Because pages are pre-rendered into lightweight static HTML, bandwidth usage is negligible, keeping you safely under Netlify's free bandwidth tiers.

---

## Adding a New Tool Entry

Create a new Markdown file inside `src/content/tools/<tool-slug>.md` with the following frontmatter:

```markdown
---
title: "Autokroma Influx"
tagline: "Direct native importer plugin for MKV, ProRes RAW, AV1, and diverse codecs inside Premiere & Resolve."
category: "Format Ingestion"
nle_compatibility:
  - "Premiere Pro"
  - "DaVinci Resolve"
os:
  - "macOS"
  - "Windows"
pricing: "One-Time"
price_detail: "$99 per license (free trial available)"
developer_type: "Indie"
website_url: "https://www.autokroma.com/Influx"
github_url: ""
icon: "film"
featured: true
bottleneck: "Premiere Pro and DaVinci Resolve reject MKV files or 10-bit AV1 without prior transcoding."
solution: "A custom demuxer and decoding plugin allowing instant drag-and-drop timeline playback with GPU decoding."
tags:
  - "mkv"
  - "ingest"
  - "codec"
  - "transcode"
---

## Overview

Detailed technical breakdown, key capabilities, and specs...
```

---

## Adding a Dev Hub Script

Create a new Markdown file inside `src/content/devhub/<script-slug>.md`:

```markdown
---
title: "FFmpeg ProRes 422 Proxy Batch Transcoder"
tagline: "High-speed CLI script that creates 1080p ProRes 422 Proxy files preserving timecode."
language: "bash"
tool_target: "FFmpeg"
difficulty: "Intermediate"
author: "Community"
github_link: "https://github.com/..."
bottleneck: "NLE background proxy generators alter audio track configurations or strip camera timecode."
solution: "A standalone terminal script that batches an entire rush folder into compliant ProRes 422 Proxy media."
tags:
  - "ffmpeg"
  - "prores"
  - "proxies"
---

## The Recipe

```bash
# Paste script here...
```
```

---

## License

MIT © Editors Den Community.
# editorsden
