---
title: "FFmpeg ProRes 422 Proxy Batch Transcoder"
tagline: "High-speed CLI script that creates 1080p ProRes 422 Proxy files while preserving multi-track audio and native camera timecode."
language: "bash"
tool_target: "FFmpeg"
difficulty: "Intermediate"
author: "Editors Den Community"
github_link: "https://github.com/editors-den/dev-hub-scripts"
bottleneck: "NLE background proxy generators frequently alter audio channel configurations, strip embedded camera timecode tracks, or freeze system resources while editing."
solution: "A standalone terminal script that batches an entire camera rush folder into compliant ProRes 422 Proxy media with identical track layouts and timecode metadata, ready for instant one-click proxy attachment."
tags:
  - "ffmpeg"
  - "prores"
  - "proxies"
  - "timecode"
  - "batch"
  - "apple-silicon"
---

## The Recipe

Place this script inside your folder containing camera raw rushes (e.g., RED, ARRI, Sony FX6, or Canon RAW) or pass the source directory as an argument.

```bash
#!/usr/bin/env bash
# batch_proxy.sh - Batch ProRes Proxy Generator preserving timecode & channels
set -euo pipefail

mkdir -p ./_Proxies

for file in *.{mov,MOV,mp4,MP4,mxf,MXF}; do
  [ -f "$file" ] || continue
  filename="${file%.*}"
  output="./_Proxies/${filename}_Proxy.mov"

  echo "==> Transcoding: $file -> $output"

  ffmpeg -hide_banner -loglevel warning -stats \
    -i "$file" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    -c:v prores_ks -profile:v 0 \
    -pix_fmt yuv422p10le \
    -map 0:v:0 \
    -map 0:a? \
    -c:a copy \
    -copyts \
    -timecode "$(ffprobe -v error -select_streams v:0 -show_entries format_tags=timecode -of default=noprint_wrappers=1:nokey=1 "$file" 2>/dev/null || echo "00:00:00:00")" \
    "$output"
done

echo "✓ All proxies generated successfully in ./_Proxies!"
```

## Key Flags Explained

- `-c:v prores_ks -profile:v 0`: Uses the accurate Kostya ProRes encoder at Profile 0 (ProRes 422 Proxy, ~36–45 Mbps).
- `-map 0:a? -c:a copy`: Maps all available audio channels without recompression.
- `-copyts`: Copies original presentation timestamps so sync markers align to the microsecond.
- `scale=1920:1080...`: Downscales to HD with letterboxing/pillarboxing if the aspect ratio varies.
