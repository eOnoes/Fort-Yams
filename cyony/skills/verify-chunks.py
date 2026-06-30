#!/usr/bin/env python3
"""Verify all JS/CSS chunks referenced in a Next.js app HTML actually serve 200.

Usage:
    python3 verify-chunks.py [url] [port]

Defaults to http://localhost:3000 if no arguments given.
"""

import sys
import re
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else f"http://localhost:{sys.argv[2] if len(sys.argv) > 2 else '3000'}"

try:
    html = urllib.request.urlopen(f"{BASE}/app", timeout=10).read().decode()
except Exception as e:
    print(f"❌ Cannot fetch {BASE}/app: {e}")
    sys.exit(1)

chunks = set(re.findall(r'chunks/([^\"]+\.(?:js|css))', html))
if not chunks:
    print("⚠ No chunks found in HTML — page might not use dynamic imports?")
    sys.exit(0)

bad = 0
for c in sorted(chunks):
    try:
        r = urllib.request.urlopen(f"{BASE}/_next/static/chunks/{c}", timeout=5)
        status = f"✅ {r.status}"
    except urllib.error.HTTPError as e:
        status = f"❌ {e.code}"
        bad += 1
    except Exception as e:
        status = f"❌ {e}"
        bad += 1
    print(f"{status}  {c}")

total = len(chunks)
print(f"\n{total} assets, {bad} bad ({total - bad} good)")
sys.exit(1 if bad else 0)
