---
title: "Autokroma Influx"
tagline: "Direct native importer plugin for MKV, ProRes RAW, AV1, and diverse codecs inside Premiere & Resolve."
type: "plugin"
hidden_gem: true
category: "Format Ingestion"
nle_compatibility:
  - "Premiere Pro"
  - "DaVinci Resolve"
  - "After Effects"
os:
  - "macOS"
  - "Windows"
pricing: "One-Time"
price_detail: "$99 per license (free 500-frame trial)"
developer_type: "Indie"
website_url: "https://www.autokroma.com/Influx"
github_url: ""
icon: "film"
featured: true
bottleneck: "Premiere Pro and DaVinci Resolve natively reject MKV files, 10-bit AV1, or modern web-optimized captures without lengthy proxy transcoding or remuxing steps in HandBrake."
solution: "A custom demuxer and decoding plugin that integrates directly into the native media import pipeline, enabling instant drag-and-drop timeline playback with GPU decoding."
tags:
  - "mkv"
  - "ingest"
  - "transcode"
  - "codec"
  - "av1"
  - "prores-raw"
  - "obs"
---

## Overview

Autokroma Influx replaces standard legacy importer plugins inside Adobe CC and DaVinci Resolve with an updated demuxer powered by custom FFmpeg libraries. It bypasses the dreaded *"File format not supported"* or *"Codec missing or unavailable"* error dialogs.

## Key Capabilities

- **Zero-Transcode Ingestion**: Drop `.mkv`, `.webm`, `.avi`, `.flv`, and `.opus` directly onto the editing timeline.
- **Color Accuracy**: Supports 10-bit & 12-bit 4:2:2 / 4:4:4 profiles without gamma shifting.
- **Audio Multi-track Support**: Automatically maps all discrete audio streams contained in MKV container files.

## Technical Specifications

| Spec | Details |
| :--- | :--- |
| **Plugin Architecture** | Adobe Importer SDK & OpenFX |
| **Supported OS** | macOS 10.14+ (Apple Silicon & Intel), Windows 10/11 (x64) |
| **Hardware Acceleration** | Apple VideoToolbox, NVIDIA NVDEC, Intel QuickSync |

## Recommended Workflow

```bash
# Verify stream codec information before timeline drop
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt input.mkv
```
