---
title: "LosslessCut"
tagline: "The Swiss army knife of zero-re-encoding, lossless video and audio trimming and stream extraction."
type: "utility"
rank: 55
hidden_gem: false
category: "Format Ingestion"
nle_compatibility:
  - "Universal"
  - "Premiere Pro"
  - "DaVinci Resolve"
  - "Final Cut Pro"
os:
  - "macOS"
  - "Windows"
  - "Linux"
pricing: "Open-Source"
price_detail: "100% Free & Open Source (optional store donations)"
developer_type: "Open-Source"
website_url: "https://mifi.no/losslesscut/"
github_url: "https://github.com/mifi/losslesscut"
icon: "scissors"
featured: false
bottleneck: "Trimming multi-hour raw camera takes or live stream recordings in Premiere or Resolve requires importing heavy media, creating projects, and exporting through render pipelines that recompress video and waste gigabytes of disk space."
solution: "A lightweight FFmpeg GUI that performs keyframe-accurate cuts, split operations, and track remuxing in seconds without decoding or re-encoding a single frame of video."
tags:
  - "lossless"
  - "trim"
  - "cut"
  - "ffmpeg"
  - "remux"
  - "rush-logging"
  - "open-source"
---

## Overview

LosslessCut operates directly on video container packets using FFmpeg under the hood. When you cut a 50GB ProRes or MP4 file, it saves the extracted segment in less than 3 seconds with zero quality loss.

## Key Capabilities

- **Keyframe-Accurate Stream Copy**: Cut unwanted footage before ingesting into your NLE without waiting for exports.
- **Track Separation**: Extract specific audio channels, subtitle streams, or timecode tracks from complex containers.
- **Smart Cut (Experimental)**: Re-encodes only the exact few frames around the non-keyframe cut point while passing through the rest of the stream untouched.
- **CSV & Chapter Markers Export**: Export cut timestamps for downstream batch automation.
