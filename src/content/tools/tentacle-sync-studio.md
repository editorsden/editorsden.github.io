---
title: "Tentacle Sync Studio"
tagline: "Lightning-fast multi-camera audio timecode and waveform synchronizer for documentary and film shoots."
type: "utility"
rank: 58
hidden_gem: true
category: "Workflow & Organization"
nle_compatibility:
  - "Premiere Pro"
  - "DaVinci Resolve"
  - "Final Cut Pro"
  - "Avid Media Composer"
os:
  - "macOS"
pricing: "Free"
price_detail: "Included free with Tentacle hardware or standalone license"
developer_type: "Studio"
website_url: "https://tentaclesync.com/sync-studio"
github_url: ""
icon: "layers"
featured: false
bottleneck: "Multi-camera documentary setups shot without genlock or with audio recorded on an AUX channel require grueling manual slip-editing or buggy NLE multicam waveform sync passes."
solution: "A dedicated macOS ingestion app that reads audio LTC timecode recorded on any standard scratch track, converts it into native SMPTE metadata, and exports synced XML/EDL timelines in seconds."
tags:
  - "timecode"
  - "sync"
  - "multicam"
  - "audio-tc"
  - "ltc"
  - "xml"
---

## Overview

Tentacle Sync Studio is the gold-standard syncing assistant for documentary filmmakers and reality television teams. When shooting on Mirrorless cameras (Sony FX3, Canon R5, Panasonic GH6) without BNC timecode ports, Tentacle audio boxes record audio LTC onto the left channel. Sync Studio reads this audio signal and converts it into accurate file-level timecode metadata.

## Key Capabilities

- **Audio LTC Detection**: Automatically decodes timecode pulses hidden inside standard stereo audio scratch tracks.
- **Instant XML & FCPXML Generation**: Exports synchronized multicam bins or sequence timelines for Premiere Pro, DaVinci Resolve, and Final Cut Pro.
- **Automated Clip Renaming**: Matches take numbers and sound roll IDs to camera takes.
