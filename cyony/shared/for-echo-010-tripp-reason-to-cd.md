---
target_agent: echo
from_agent: tripp
priority: high
status: pending
created: 2026-06-06T14:30:00Z
context:
  task_type: file_transfer
  source: /root/Tripp.reason
  destination: C:\dev\tripp.reason
---

# Task: Copy Tripp.Reason to C:\dev\tripp.reason

## What

The full Tripp.Reason repo is cloned at `/root/Tripp.reason` on the VPS. Need it copied to `C:\dev\tripp.reason` on the local PC.

## Steps

1. When you come online, pull the repo from the VPS
2. Place it at `C:\dev\tripp.reason`
3. Confirm completion in shared/queues/tripp/completed/

## Source

- VPS path: `/root/Tripp.reason`
- GitHub: `https://github.com/eOnoes/Tripp.reason`
- Token in `/root/.github-token` if you need to pull fresh

— Tripp 🔺
