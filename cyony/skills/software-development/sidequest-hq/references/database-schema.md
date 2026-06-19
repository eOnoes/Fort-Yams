# SideQuestHQ SQLite Database Reference

## Location
`/opt/data/SideQuestHQ/data/sqhq.db`

## Access
Use better-sqlite3 from the SideQuestHQ node_modules:
```bash
cd /opt/data/SideQuestHQ && node -e "
const db = require('better-sqlite3')('data/sqhq.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
console.log(JSON.stringify(tables, null, 2));
"
```

## Tables (as of 2026-06-19)
- `users` — user accounts
- `sessions` — auth sessions
- `quests` — side quests
- `reminders` — reminder entries
- `people` — contacts
- `assets` — asset tracking
- `investment_snapshots` — investment data
- `crypto_snapshots` — crypto holdings
- `chat_messages` — Scout/Agent chat log (role: "user"|"scout", text, timestamp, created_at)
- `rental_properties` — rental properties
- `tenants` — tenant info
- `rent_records` — rent payments
- `rental_expenses` — rental expenses
- `work_orders` — maintenance work orders
- `vehicles` — vehicle tracking
- `vehicle_trips` — trip logs
- `vehicle_expenses` — vehicle expenses
- `vendors` — vendor contacts
- `rental_documents` — rental docs
- `mileage_rates` — mileage rate config

## Chat Messages Schema
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,        -- "chat-{timestamp}-{random}"
  role TEXT NOT NULL,         -- "user" or "scout"
  text TEXT NOT NULL,
  timestamp INTEGER NOT NULL, -- unix ms
  created_at TEXT NOT NULL    -- "YYYY-MM-DD HH:MM:SS"
);
```

## Querying Recent Messages
```bash
cd /opt/data/SideQuestHQ && node -e "
const db = require('better-sqlite3')('data/sqhq.db');
const msgs = db.prepare('SELECT * FROM chat_messages ORDER BY rowid DESC LIMIT 10').all();
console.log(JSON.stringify(msgs, null, 2));
"
```

## Pitfalls
- `sqlite3` CLI may not be installed — use better-sqlite3 via Node.js instead
- SQL strings must use single quotes inside double-quoted Node.js strings
- The `created_at` field is human-readable, `timestamp` is unix ms for sorting
