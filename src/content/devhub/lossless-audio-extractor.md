---
title: "Lossless Audio Extractor & Splitter for Sound Turnover"
tagline: "FFmpeg pipeline that deconstructs multi-stream video containers into discrete 24-bit 48kHz Broadcast WAV files."
language: "bash"
tool_target: "FFmpeg"
difficulty: "Beginner"
author: "Editors Den Community"
github_link: "https://github.com/editors-den/dev-hub-scripts"
bottleneck: "Preparing audio rushes for Pro Tools or Reaper sound mixers requires demuxing multi-track camera containers without altering sample rate or introducing phase drift."
solution: "A targeted FFmpeg bash one-liner that loops over container tracks and exports uncompressed PCM 24-bit 48kHz WAV files with original stream tags intact."
tags:
  - "ffmpeg"
  - "audio"
  - "wav"
  - "bwav"
  - "sound-design"
  - "turnover"
---

## The Recipe

Use this snippet to rip all audio streams from `interview_multitrack.mkv` or `.mov` without altering original audio samples.

```bash
#!/usr/bin/env bash
# extract_audio.sh - Rip all audio channels to individual uncompressed WAVs

INPUT_FILE="$1"
BASE_NAME="${INPUT_FILE%.*}"

# Query the number of audio streams
STREAM_COUNT=$(ffprobe -v error -select_streams a \
  -show_entries stream=index -of csv=p=0 "$INPUT_FILE" | wc -l | tr -d ' ')

echo "Found $STREAM_COUNT audio stream(s) in $INPUT_FILE"

for ((i=0; i<STREAM_COUNT; i++)); do
  OUTPUT_WAV="${BASE_NAME}_Track_${i}.wav"
  echo "Extracting Stream #$i -> $OUTPUT_WAV"
  
  ffmpeg -hide_banner -loglevel error \
    -i "$INPUT_FILE" \
    -map 0:a:$i \
    -c:a pcm_s24le \
    -ar 48000 \
    "$OUTPUT_WAV"
done

echo "✓ Sound turnover prep complete!"
```

## Explanation

- `-map 0:a:$i`: Selects the $i$-th audio stream from the primary input file.
- `-c:a pcm_s24le`: Encodes to 24-bit linear Pulse Code Modulation (standard broadcast audio bit depth).
- `-ar 48000`: Enforces 48,000 Hz sample rate (film and broadcast video standard, eliminating 44.1kHz sample rate drift).
