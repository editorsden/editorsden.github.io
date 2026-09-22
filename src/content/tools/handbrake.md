---
title: "HandBrake"
tagline: "The industry standard open-source video transcoder for batch compression and web distribution."
type: "utility"
rank: 54
category: "Export & Compression"
nle_compatibility:
  - "Universal"
os:
  - "macOS"
  - "Windows"
  - "Linux"
pricing: "Open-Source"
price_detail: "100% Free (GPL v2 licensed)"
developer_type: "Open-Source"
website_url: "https://handbrake.fr"
github_url: "https://github.com/HandBrake/HandBrake"
icon: "disc"
featured: false
hidden_gem: true
bottleneck: "NLE native exporters (Adobe Media Encoder, Resolve Delivery) often generate bloated file sizes with limited fine-grained rate-control options for Constant Rate Factor (CRF) and modern codecs like AV1."
solution: "A battle-tested open-source multi-threaded batch transcoder utilizing x264, x265, SVT-AV1, and hardware encoders for optimal visual quality-to-bitrate compression ratios."
tags:
  - "transcoder"
  - "compression"
  - "crf"
  - "av1"
  - "h264"
  - "hevc"
  - "batch"
---

## Overview

HandBrake has been the staple companion tool for video editors for over two decades. It converts nearly any source video into web-ready MP4, MKV, or WebM files with pristine perceptual quality.

## Key Capabilities

- **Constant Rate Factor (CRF) Encoding**: Targets visual consistency across varying complexity scenes rather than wasting bits on static frames.
- **Hardware Acceleration**: Full support for Apple VideoToolbox, Intel QSV, NVIDIA NVENC, and AMD VCN.
- **Batch Processing Queue**: Queue dozens of exported masters for overnight proxy creation or client review screener compression.
- **Audio Downmixing & Passthrough**: Preserve multi-channel 5.1/7.1 surround sound or downmix to stereo EBU R128 loudness.
