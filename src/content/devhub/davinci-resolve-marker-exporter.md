---
title: "DaVinci Resolve Python Timeline Marker Exporter"
tagline: "Python API script connecting to DaVinci Resolve Studio to dump all timeline markers into structured JSON and CSV."
language: "python"
tool_target: "DaVinci Resolve"
difficulty: "Intermediate"
author: "Editors Den Community"
github_link: "https://github.com/editors-den/dev-hub-scripts"
bottleneck: "Exporting client notes, VFX flags, and color grade markers from DaVinci Resolve timelines requires navigating the Edit Index with clumsy copy-pasting."
solution: "A headless Python script using the DaVinci Resolve Scripting API to query the active project, parse timeline markers by color, and save structured reports for production tracking."
tags:
  - "python"
  - "davinci-resolve"
  - "api"
  - "markers"
  - "vfx-turnover"
  - "automation"
---

## The Recipe

Save this script as `export_markers.py` and run it from your terminal while DaVinci Resolve Studio is open with an active timeline.

```python
#!/usr/bin/env python3
"""
export_markers.py - Dump active timeline markers from DaVinci Resolve
Requires DaVinci Resolve Studio.
"""
import sys
import json
import csv

def get_resolve():
    try:
        import DaVinciResolveScript as bmd
        return bmd.scriptapp("Resolve")
    except ImportError:
        # Check standard installation paths
        sys.path.append("/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules")
        import DaVinciResolveScript as bmd
        return bmd.scriptapp("Resolve")

def export_timeline_markers():
    resolve = get_resolve()
    if not resolve:
        print("Error: Could not connect to DaVinci Resolve. Is it running?")
        return

    project_manager = resolve.GetProjectManager()
    project = project_manager.GetCurrentProject()
    if not project:
        print("No project currently open.")
        return

    timeline = project.GetCurrentTimeline()
    if not timeline:
        print("No active timeline selected.")
        return

    timeline_name = timeline.GetName()
    fps = float(timeline.GetSetting("timelineFrameRate"))
    markers = timeline.GetMarkers()

    report = []
    for frame_id, data in sorted(markers.items()):
        seconds = frame_id / fps
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        frames = int(frame_id % int(fps))
        tc = f"{hrs:02d}:{mins:02d}:{secs:02d}:{frames:02d}"

        report.append({
            "frame": frame_id,
            "timecode": tc,
            "color": data.get("color", "Cyan"),
            "name": data.get("name", ""),
            "note": data.get("note", ""),
            "duration": data.get("duration", 1)
        })

    # Save to JSON
    with open(f"{timeline_name}_markers.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Save to CSV
    with open(f"{timeline_name}_markers.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["timecode", "frame", "color", "name", "note", "duration"])
        writer.writeheader()
        writer.writerows(report)

    print(f"✓ Exported {len(report)} markers for timeline '{timeline_name}' to JSON and CSV!")

if __name__ == "__main__":
    export_timeline_markers()
```

## Setup & Prerequisites

In DaVinci Resolve:
1. Go to **Preferences > System > General**.
2. Set **External scripting using** to **Local** or **Network**.
3. Run `python3 export_markers.py` in your shell.
