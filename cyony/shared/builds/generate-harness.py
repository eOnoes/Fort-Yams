#!/usr/bin/env python3
"""
TripCore Harness v1.1 Generator
Reads current-state.md → generates tripcore-harness-v1.1.html + optional snapshot.json

Usage: python3 generate-harness.py [--json] [--input current-state.md]
  --json     also output snapshot.json for audit
  --input    path to Markdown file (default: current-state.md)
"""

import re, json, sys, os, html
from datetime import datetime, timezone

# ── Markdown Parser ──────────────────────────────────────────

def parse_md(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    
    sections = {}
    current_section = None
    current_lines = []
    
    for line in text.split('\n'):
        if line.startswith('## '):
            if current_section:
                sections[current_section] = '\n'.join(current_lines).strip()
            current_section = line[3:].strip()
            current_lines = []
        elif current_section:
            current_lines.append(line)
    if current_section:
        sections[current_section] = '\n'.join(current_lines).strip()
    
    # Parse metadata from top
    meta = {}
    for line in text.split('\n'):
        if line.startswith('Generated:'):
            meta['generated'] = line.split(':',1)[1].strip()
        if line.startswith('Mode:'):
            meta['mode'] = line.split(':',1)[1].strip()
    
    return meta, sections

def parse_agents(text):
    agents = []
    for line in text.strip().split('\n'):
        line = line.strip()
        if line.startswith('- ') and '|' in line:
            parts = [p.strip() for p in line[2:].split('|')]
            if len(parts) >= 4:
                agents.append({
                    'name': parts[0],
                    'status': parts[1].upper(),
                    'task': parts[2],
                    'freshness': parts[3],
                    'notes': parts[4] if len(parts) > 4 else ''
                })
    return agents

def parse_lane(text):
    lane = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if line.startswith('- ') and ':' in line:
            line = line[2:]
        if ':' in line:
            k, v = line.split(':', 1)
            lane[k.strip().lower().replace(' ','_')] = v.strip()
    return lane

def parse_priority(text):
    items = []
    for line in text.strip().split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() and '. ' in line[:4]):
            rest = line.split('. ',1)[1]
            parts = [p.strip() for p in rest.split('|')]
            if len(parts) >= 3:
                items.append({
                    'task': parts[0],
                    'agent': parts[1],
                    'state': parts[2],
                    'notes': parts[3] if len(parts) > 3 else ''
                })
    return items

def parse_evidence(text):
    items = []
    for line in text.strip().split('\n'):
        line = line.strip()
        if line.startswith('- ') and '|' in line:
            parts = [p.strip() for p in line[2:].split('|')]
            if len(parts) >= 4:
                items.append({
                    'name': parts[0],
                    'source': parts[1],
                    'location': parts[2],
                    'validation': parts[3],
                    'state': parts[4] if len(parts) > 4 else 'unknown'
                })
    return items

def parse_stop_conditions(text):
    return [line.strip()[2:] for line in text.strip().split('\n') if line.strip().startswith('- ')]

def parse_notes(text):
    return text.strip()

# ── HTML Generator ───────────────────────────────────────────

STATUS_COLORS = {
    'WORKING': ('badge-green', '🟢'),
    'ACTIVE': ('badge-green', '🟢'),
    'REVIEW': ('badge-purple', '🟣'),
    'ON_DEMAND': ('badge-purple', '🟣'),
    'OFFLINE': ('badge-red', '🔴'),
    'UNKNOWN': ('badge-gray', '⚪'),
    'STALE': ('badge-yellow', '🟡'),
}

TRUST_COLORS = {
    'confirmed': ('badge-green', 'CONFIRMED'),
    'accepted': ('badge-green', 'ACCEPTED'),
    'reviewed': ('badge-yellow', 'REVIEWED'),
    'operator_reported': ('badge-purple', 'OPERATOR_REPORTED'),
    'reported': ('badge-purple', 'REPORT_BACKED'),
    'patch-required': ('badge-red', 'PATCH REQUIRED'),
    'pending-review': ('badge-yellow', 'PENDING REVIEW'),
}

PRIORITY_COLORS = {
    'active': 'badge-green',
    'pending': 'badge-yellow',
    'blocked': 'badge-red',
    'done': 'badge-purple',
}

CSS = """<style>
  :root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#c9d1d9;--dim:#8b949e;--accent:#58a6ff;--green:#3fb950;--yellow:#d2991d;--red:#f85149;--purple:#a371f7;--orange:#db6d28}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;max-width:800px;margin:0 auto;padding:20px 16px 40px}
  h1{font-size:22px;margin-bottom:2px}
  h2{font-size:17px;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
  h3{font-size:15px;margin:12px 0 6px}
  .card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:10px}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600}
  .badge-green{background:#1b3826;color:var(--green)}
  .badge-yellow{background:#3d2e0a;color:var(--yellow)}
  .badge-red{background:#3d1414;color:var(--red)}
  .badge-purple{background:#291d3d;color:var(--purple)}
  .badge-gray{background:#21262d;color:var(--dim)}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  .col{flex:1;min-width:200px}
  .key{color:var(--dim);font-size:13px}
  .val{font-weight:500}
  .dim{color:var(--dim);font-size:13px}
  .snap{background:#1b1f2d;border:1px solid var(--accent);border-radius:8px;padding:12px 16px;margin-bottom:16px}
  .snap .badge{float:right}
  pre{background:#0d1117;border:1px solid var(--border);border-radius:6px;padding:12px;font-family:'SF Mono','Fira Code',monospace;font-size:13px;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
  .copy-btn{background:#21262d;color:var(--accent);border:1px solid var(--border);padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;float:right;margin-bottom:6px}
  .copy-btn:hover{background:#30363d}
  .copy-btn:active{background:#1f6feb;color:#fff}
  .warning{background:#3d2e0a;border:1px solid var(--yellow);border-radius:6px;padding:8px 14px;color:var(--yellow);font-size:13px;margin-bottom:16px;text-align:center}
  hr{border:none;border-top:1px solid var(--border);margin:20px 0}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{color:var(--dim);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
  td{padding:6px 8px;border-bottom:1px solid var(--border)}
  .decision-strip{background:#1b1f2d;border-left:3px solid var(--accent);border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0}
  .stop-cond{color:var(--red);font-size:13px;margin:2px 0}
</style>"""

def generate_html(meta, sections, agents, lane, priority, evidence, stops, notes):
    E = html.escape  # all Markdown-derived values must be escaped
    now = E(meta.get('generated', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')))
    mode = E(meta.get('mode', 'STATIC SNAPSHOT'))
    
    # Title is parsed from first H1 line if present, else default
    title_line = ""
    for line in sections.get('Active Lane', '').split('\n'):
        if 'Lane:' in line:
            title_line = line.split(':',1)[1].strip()
            break
    
    # Agent cards
    agent_cards = ""
    for i, a in enumerate(agents):
        if i % 2 == 0:
            agent_cards += '<div class="row">\n'
        color_class, emoji = STATUS_COLORS.get(a['status'], ('badge-gray', '⚪'))
        freshness_label = '🟢 Fresh' if a['freshness'] == 'fresh' else '🟡 Stale' if a['freshness'] == 'stale' else '⚪ ' + a['freshness']
        agent_cards += f"""  <div class="col">
    <div class="card">
      <h3>{emoji} {E(a['name'])}</h3>
      <div><span class="key">Status:</span> <span class="badge {color_class}">{E(a['status'])}</span></div>
      <div><span class="key">Task:</span> {E(a['task'])}</div>
      <div><span class="key">Heartbeat:</span> {freshness_label}</div>
      <div class="dim">{E(a['notes'])}</div>
    </div>
  </div>
"""
        if i % 2 == 1 or i == len(agents)-1:
            agent_cards += '</div>\n'
    
    # Lane card
    lane_html = ""
    row_parts = []
    for k, v in lane.items():
        display_key = k.replace('_', ' ').title()
        if k == 'current_marker':
            row_parts.append(f'<div class="col"><span class="key">{display_key}:</span> <span class="val">{E(v)}</span> <span class="badge badge-green">DONE</span></div>')
        elif k == 'next_marker':
            row_parts.append(f'<div class="col"><span class="key">{display_key}:</span> <span class="val">{E(v)}</span> <span class="badge badge-yellow">NEXT</span></div>')
        else:
            row_parts.append(f'<div class="col"><span class="key">{display_key}:</span> <span class="val">{E(v)}</span></div>')
    
    # Build lane rows in pairs
    lane_rows = ""
    for i in range(0, len(row_parts), 2):
        pair = row_parts[i:i+2]
        lane_rows += '<div class="row">\n' + '\n'.join(pair) + '\n</div>\n'
    
    # Priority table
    priority_rows = ""
    for idx, p in enumerate(priority):
        state_class = PRIORITY_COLORS.get(p['state'], 'badge-gray')
        priority_rows += f"""    <tr>
      <td>{idx+1}</td>
      <td>{E(p['task'])}</td>
      <td>{E(p['agent'])}</td>
      <td><span class="badge {state_class}">{E(p['state'].upper())}</span></td>
      <td class="dim">{E(p['notes'])}</td>
    </tr>
"""
    
    # Evidence table
    evidence_rows = ""
    for e in evidence:
        tc = TRUST_COLORS.get(e['validation'], ('badge-gray', e['validation'].upper()))
        evidence_rows += f"""    <tr>
      <td>{E(e['name'])}</td>
      <td>{E(e['source'])}</td>
      <td class="dim">{E(e['location'])}</td>
      <td><span class="badge {tc[0]}">{E(tc[1])}</span></td>
    </tr>
"""
    
    # Stop conditions
    stop_html = '\n'.join(f'<div class="stop-cond">🚫 {E(s)}</div>' for s in stops)
    
    # Decision from lane
    decision = E(lane.get('decision', 'No decision recorded'))
    
    # Prompt blocks
    prompt_agents = [
        ('Cyony', 'Builder', 'Build tasks, experiments, creative harness work. Sandboxed on Hermes VPS.'),
        ('Tripp', 'Warden / Codex', 'Code review, safety audits, schema validation. OpenClaw on VPS.'),
        ('Echo', 'Relay / Auditor', 'Win PC testing, cross-project state, manifest audits.'),
        ('Kimi', 'Deep Reasoning', 'On-demand deep reasoning via Ollama Cloud (kimi-k2.6).'),
    ]
    
    prompts_html = ""
    for name, role, desc in prompt_agents:
        prompts_html += f"""<div class="card">
  <button class="copy-btn" onclick="copyBlock('{name.lower()}-prompt')">📋 Copy</button>
  <h3>{name} — {role}</h3>
  <pre id="{name.lower()}-prompt">Assigned to: {name}

Task: [INSERT TASK]

Context:
- {desc}
- Current lane: {E(lane.get('lane', 'TBD'))}
- Next marker: {E(lane.get('next_marker', 'TBD'))}
- Shared state: /opt/data/shared/

[INSERT SPECIFIC INSTRUCTIONS]

Assigned to: {name}</pre>
</div>
"""
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TripCore Harness v1.1 — Static Operator Dashboard</title>
{CSS}
</head>
<body>

<h1>🔧 TripCore Harness v1.1</h1>
<div class="dim">Static Operator Dashboard</div>

<div class="warning">
  ⚠️ {mode} — Generated {now} — Not live runtime state
</div>

<!-- Snapshot Source Card -->
<div class="snap">
  <span class="badge badge-purple">SOURCE</span>
  <div><span class="key">Markdown input:</span> current-state.md</div>
  <div><span class="key">Generated:</span> {now}</div>
  <div><span class="key">Confidence:</span> As-reported by operator — snapshot only</div>
  <div><span class="key">Mode:</span> {mode} — no live data, no polling</div>
</div>

<!-- ═══════ ACTIVE LANE ═══════ -->
<h2>📍 Active Lane</h2>
<div class="card">
{lane_rows}</div>

<!-- ═══════ DECISION STRIP ═══════ -->
<div class="decision-strip">
  <strong>🎯 Current Decision:</strong> {decision}<br>
  <span class="dim">Recommended next action: Review with Tripp/Codex before advancing marker</span>
</div>

<!-- ═══════ AGENT STATUS ═══════ -->
<h2>🤖 Agent Status</h2>
{agent_cards}

<!-- ═══════ PRIORITY QUEUE ═══════ -->
<h2>📋 Priority Queue</h2>
<div class="card">
<table>
  <tr><th>#</th><th>Item</th><th>Agent</th><th>State</th><th>Notes</th></tr>
{priority_rows}</table>
</div>

<!-- ═══════ EVIDENCE PACKAGES ═══════ -->
<h2>📦 Evidence Packages</h2>
<div class="card">
<table>
  <tr><th>Package</th><th>Source</th><th>Location</th><th>Trust Level</th></tr>
{evidence_rows}</table>
<div class="dim" style="margin-top:8px">
  Trust Levels: <span class="badge badge-green">CONFIRMED</span> = verified by multiple sources |
  <span class="badge badge-purple">REPORT_BACKED</span> = single agent report |
  <span class="badge badge-purple">OPERATOR_REPORTED</span> = human operator report |
  <span class="badge badge-yellow">REVIEWED</span> = seen but not validated |
  <span class="badge badge-gray">UNKNOWN</span> = unverified
</div>
</div>

<!-- ═══════ STOP CONDITIONS ═══════ -->
<h2>⛔ Stop Conditions</h2>
<div class="card">
{stop_html}
</div>

<!-- ═══════ NOTES ═══════ -->
<h2>📝 Notes</h2>
<div class="card">
<pre>{E(notes)}</pre>
</div>

<!-- ═══════ PROMPT BLOCKS ═══════ -->
<h2>📋 Copy-Ready Prompt Blocks</h2>
{prompts_html}

<!-- ═══════ BOUNDARIES ═══════ -->
<hr>
<div class="card" style="border-color: var(--red)">
  <h3 style="color: var(--red)">🚫 Hard Boundaries — This Harness Does NOT:</h3>
  <ul style="margin-left: 20px; color: var(--dim); font-size: 13px">
    <li>Poll or watch files (no setInterval for data)</li>
    <li>Fetch live data (no fetch(), no WebSocket, no XHR)</li>
    <li>Write to disk or mutate shared state</li>
    <li>Auto-dispatch tasks to agents</li>
    <li>Execute shell commands or trigger builds</li>
    <li>Route agent-to-agent messages</li>
    <li>Reference shared-agent-bus (except this boundary text)</li>
    <li>Infer live runtime state from stale data</li>
    <li>Auto-refresh or background-poll</li>
  </ul>
  <div style="margin-top: 8px; font-size: 12px; color: var(--dim);">
    ✅ No polling or watcher timers. Copy-button UI reset only (1500ms setTimeout).
  </div>
</div>

<script>
function copyBlock(id) {{
  const el = document.getElementById(id);
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {{
    const btn = el.previousElementSibling;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {{ btn.textContent = '📋 Copy'; }}, 1500);
  }});
}}
</script>

</body>
</html>"""

# ── Main ─────────────────────────────────────────────────────

def main():
    input_path = 'current-state.md'
    output_json = False
    
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--json':
            output_json = True
        elif args[i] == '--input' and i+1 < len(args):
            input_path = args[i+1]
            i += 1
        i += 1
    
    if not os.path.exists(input_path):
        print(f"ERROR: {input_path} not found. Create it first (see current-state.example.md)")
        sys.exit(1)
    
    meta, sections = parse_md(input_path)
    agents = parse_agents(sections.get('Agents', ''))
    lane = parse_lane(sections.get('Active Lane', ''))
    priority = parse_priority(sections.get('Priority Queue', ''))
    evidence = parse_evidence(sections.get('Evidence Packages', ''))
    stops = parse_stop_conditions(sections.get('Stop Conditions', ''))
    notes = parse_notes(sections.get('Notes', ''))
    
    html = generate_html(meta, sections, agents, lane, priority, evidence, stops, notes)
    
    out_dir = os.path.dirname(os.path.abspath(input_path))
    html_path = os.path.join(out_dir, 'tripcore-harness-v1.1.html')
    html_tmp = html_path + '.tmp'
    
    # Atomic write: write to .tmp, replace only on success
    with open(html_tmp, 'w', encoding='utf-8') as f:
        f.write(html)
    os.replace(html_tmp, html_path)
    print(f"OK Generated: {html_path}")
    
    if output_json:
        snapshot = {
            'meta': meta,
            'lane': lane,
            'agents': agents,
            'priority': priority,
            'evidence': evidence,
            'stop_conditions': stops,
            'notes': notes
        }
        json_path = os.path.join(out_dir, 'snapshot.json')
        json_tmp = json_path + '.tmp'
        with open(json_tmp, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        os.replace(json_tmp, json_path)
        print(f"OK Generated: {json_path} (audit only)")
    
    print(f"   Agents: {len(agents)}")
    print(f"   Priority items: {len(priority)}")
    print(f"   Evidence packages: {len(evidence)}")
    print("   Eddie never touched JSON. OK")

if __name__ == '__main__':
    main()
