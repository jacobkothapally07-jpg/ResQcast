#!/usr/bin/env python3
"""
RakshaCast-Forge Live Disaster Telemetry & Judge Data Connector
Usage:
    python live_disaster_ingest.py "https://api.judges.com/disaster-stream"
    python live_disaster_ingest.py --file disaster_dataset.json
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error

RAKSHACAST_API = "http://localhost:8080/api/disaster/events"


def post_to_rakshacast(payload: dict, target_url: str) -> bool:
    """Posts normalized telemetry event to RakshaCast API."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        target_url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "RakshaCast-Ingest/1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                score = res_data.get("new_composite_threat_score", "N/A")
                unc = res_data.get("uncertainty_margin", "")
                level = res_data.get("threat_level", "")
                print(f"  [✓] FUSED {payload.get('zone_id', 'ZONE'):<22} | Score: {score}/100 ({unc}) | {level}")
                return True
    except Exception as e:
        print(f"  [✗] Ingestion error: {e}")
    return False


def stream_from_url(url: str, target_api: str, poll_interval: float = 2.0):
    print(f"\n=======================================================")
    print(f"  🛰️ RakshaCast Live Data Stream Bridge")
    print(f"  Source URL : {url}")
    print(f"  Target API : {target_api}")
    print(f"=======================================================\n")

    while True:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "RakshaCast-Streamer/1.0"})
            with urllib.request.urlopen(req, timeout=6) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if isinstance(item, dict):
                            post_to_rakshacast(item, target_api)
        except Exception as e:
            print(f"[!] Poll failed: {e}")
        time.sleep(poll_interval)


def replay_from_file(filepath: str, target_api: str, interval: float = 0.5):
    print(f"\n=======================================================")
    print(f"  📂 Replaying Disaster Dataset into RakshaCast")
    print(f"  File       : {filepath}")
    print(f"=======================================================\n")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read().strip()
        try:
            items = json.loads(content)
            if not isinstance(items, list):
                items = [items]
        except json.JSONDecodeError:
            items = [json.loads(line) for line in content.splitlines() if line.strip()]

    print(f"Loaded {len(items)} events. Streaming to RakshaCast...")
    for item in items:
        if isinstance(item, dict):
            post_to_rakshacast(item, target_api)
        time.sleep(interval)
    print("\n✅ Dataset replay complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RakshaCast Live Data Ingestion Bridge")
    parser.add_argument("url", nargs="?", help="Live stream API URL to poll")
    parser.add_argument("--file", "-f", help="Replay from a JSON/JSONL file")
    parser.add_argument("--target", "-t", default=RAKSHACAST_API, help="Target RakshaCast API endpoint")
    parser.add_argument("--interval", "-i", type=float, default=1.0, help="Interval in seconds")

    args = parser.parse_args()

    if args.file:
        replay_from_file(args.file, args.target, args.interval)
    elif args.url:
        stream_from_url(args.url, args.target, args.interval)
    else:
        print("Usage:")
        print("  python live_disaster_ingest.py https://api.judges.com/disaster-stream")
        print("  python live_disaster_ingest.py --file disaster_dataset.json")
