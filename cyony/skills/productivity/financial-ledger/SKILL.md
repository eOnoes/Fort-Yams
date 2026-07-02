---
name: financial-ledger
description: Build, format, and maintain financial ledgers for Eddie — property spending, contractor payments, multi-project tracking with debit/credit format.
version: 1.0.0
triggers:
  - "track my spending"
  - "how much have I paid"
  - "what do I still owe"
  - "build me a ledger"
  - "parse this SMS for expenses"
  - "property spending"
  - "contractor payments"
  - "show me the breakdown"
  - "analyze this CSV of texts"
---

# Financial Ledger

Build clean, debits-and-credits financial ledgers from unstructured data (SMS exports, CSV backups, chat threads). Used primarily for Eddie's property renovation spending across multiple properties and contractors.

## Trigger Conditions

User asks to track spending, build a ledger, analyze payment history, parse SMS backups for financial data, or show a running balance on any project. Also triggered by requests for "breakdown" or "what do I still owe."

## Format Rules (Eddie's Preferences)

1. **Dollar format**: Always use `$000,000.00` format — comma-separated thousands, two decimal places. Never raw numbers like `$4500` or `$4.5k`.
2. **Ledger style**: Use debit/credit columns with running balance. Like a checkbook or accounting ledger. Debit = charges (what's owed), Credit = payments (what's paid), Balance = running total owed.
3. **Bottom line**: End every ledger with a clear summary line: "You've spent X, you still owe Y."
4. **Property separation**: Each property gets its own section with its own running balance.
5. **Gap awareness**: Always flag what you CAN'T see — phone payments, cash, Zelle outside the thread, purchases made at checkout where the amount isn't in the text.

## Workflow

### Step 1: Ingest the Data
- SMS exports come as CSV files from apps like SMS Backup & Restore (SyncTech) — free on Android.
- Columns typically: `Type` (Sent/Received), `Date`, `Name/Number`, `Sender`, `Content`.
- Read the full file in chunks if large. Don't trust the first 50 lines.

### Step 2: Extract Every Dollar
- Search for `$`, `owe`, `paid`, `pay`, `cash`, `bank`, `Zelle`, `credit card`, `receipt`, `refund`, `balance`, `help me out with`.
- Pull EVERY number adjacent to a dollar sign or payment context.
- Watch for: quoted amounts, payment plan numbers ("2k to start, 1500 halfway, 1450 finished"), running balances the user states ("I still owe you X"), and individual bill line items.

### Step 3: Categorize by Property/Project
- Identify the property or project from context in the thread.
- For Eddie: properties are Memphis (Grapetree Trail), Osceola (W Lee Ave), Manila (Davidson St).
- Separate confirmed payments from estimates and quotes.

### Step 4: Build Phase Groups
- Group by work phases (e.g., Phase 1: bathroom/ceiling/demo, Phase 2: new room addition).
- Match payments to the phase they're for.
- Track payment plans separately from one-off charges.

### Step 5: Identify Gaps
- Flag every Lowe's/Home Depot phone checkout where Sergio said "call me when you're ready to pay" but no amount is in the thread.
- Flag cash payments where the user said "I'll leave it with my roommate" but the exact amount isn't confirmed.
- Flag any "help me out" requests that might be separate from tracked bills.

### Step 6: Build the Ledger
- Use the format from `references/ledger-template.md` as the starting template.
- Each property gets its own ledger section.
- Debits = work quoted or materials charged. Credits = payments made.
- Running balance tracks what's still owed.
- End with a consolidated summary across all properties.

## Pitfalls

1. **Consolidated bills vs running totals**: Contractors often send a single consolidated bill that overlaps with previous partial charges. Watch for double-counting. The Mar 10 bill of $3,285 included the $800 remaining plumbing from a $1,700 quote where $900 was already paid — bill total was $4,185 not $3,285 when including the pre-payment.
2. **Phone checkout payments**: When Sergio is at Lowe's and Eddie pays over the phone, the amount is NEVER in the text thread. These can easily total $500-2,000+. Always flag these as gaps.
3. **"Help me out" requests**: Sergio sometimes asks for money without tying it to a specific bill ("Could you help me out with $2000?"). These may be advances, general help, or material costs. Track them but note the ambiguity.
4. **Payment plans**: When a contractor says "2k to start, 1500 halfway, 1450 finished," treat these as the payment schedule. Track each installment separately.
5. **User overestimation**: The user tends to round up when stating what they owe ("I owe you 1300$" when the actual is $1,285). Use the contractor's number when available.
6. **Refunds and returns**: Sergio returns materials to Lowe's and Eddie gets refunded. These don't show up as payments but reduce what's owed. The May 14 $78 refund is an example.

## SQHQ Integration

Financial data can be pushed directly into SQHQ (SideQuest HQ) via API for persistent tracking:
- **Paper Trail** (`/api/documents`) — receipts, invoices, policy docs. Use `category` field to group (e.g., `"manila-house"`, `"insurance"`). Badge colors: receipt=#FF9800, insurance varies by type.
- **Ledger** (`/api/ledger`) — expense entries with `type: "expense"` and `section` field for grouping.
- **Auth:** Login via `/api/auth/login` with password, use returned session cookie for subsequent calls.
- **Insurance data** can be extracted from State Farm PDF declarations pages using pymupdf (`uv pip install pymupdf`). Each policy's dec page has: policy number, vehicle, coverage amounts, premium, deductibles, renewal dates.

## Insurance PDF Parsing

State Farm declaration pages (PDFs) can be parsed with `pymupdf` for insurance data extraction:
```bash
uv pip install pymupdf  # PEP 668 system — use uv, not pip
uv run python3 -c "
import pymupdf
doc = pymupdf.open('policy.pdf')
for page in doc:
    print(page.get_text())
"
```
Each dec page contains: policy number, vehicle/property, coverage amounts, premium, deductibles, renewal dates, agent info. Parse into CSV with columns: Type, Vehicle/Property, Year, Policy Number, Premium, Period, Deductible, Liability, Agent.

## Monthly Recurring Expenses

Eddie has multiple properties and loans with recurring monthly costs. Track these in the SQHQ Ledger as monthly expense entries.

### Expense Categories (as of July 2026)

**Mortgages & Property:**
- Grapetree (Cordova home): $842/mo
- Manila property: $221/mo
- Manila AC unit (loan): $255/mo
- Osceola property: $320/mo

**Utilities:**
- AT&T Fiber internet: $100/mo
- T-Mobile WiFi (hotspot): $50/mo

**Loans:**
- $10K personal loan (Manila renovation): $179.10/mo, 2.9% APR, 60 months, ~$5,400 remaining balance. Auto-pay discount applied.

### Insurance Frequency Pitfall

**Eddie pays ALL insurance in 6-month blocks**, not monthly. For monthly cash flow tracking, divide the 6-month premium by 12.

| Policy | 6mo Premium | Monthly Equivalent |
|--------|-------------|-------------------|
| Cordova Homeowners | $530.20/yr | $44.18 |
| Porsche Cayman | $559.84 | $93.31 |
| Mitsubishi Outlander | $497.24 | $82.87 |
| CFMOTO 700XCL | $240.62 | $40.10 |
| Nissan Frontier | TBD | TBD |
| **Total** | | **~$260/mo** |

**Key rule:** When user says insurance is "every 6 months," the ÷12 approach is correct for monthly cash flow display. The actual cash hit is lumpy (twice a year per policy), but ÷12 gives a smooth monthly equivalent.

### Income
- Salary: $13,750/mo gross ($165K annual)
- Room rental (Grapetree): $400/mo
- **Total income: $14,150/mo**

### Cash Flow Summary Pattern
After entering all expenses, always produce a summary table:
1. Total income
2. Fixed costs (mortgages + insurance + utilities + loans)
3. Remaining (income - fixed costs)
4. Note: remaining is NOT free cash — power bills, yard care, gas, food, etc. still come out

## SQHQ Bulk Data Loading (SSH-Safe)

When pushing financial data to SQHQ via API on a remote VPS, **SSH strips `$` from values**. Use this pattern:
1. Write Python script locally with `json.dumps()` for payloads
2. `scp script.py root@VPS:/tmp/script.py`
3. `ssh root@VPS 'python3 /tmp/script.py'`

The script should use `urllib.request` to POST to `http://localhost:3456/api/ledger` and `http://localhost:3456/api/documents` with the session cookie from `/api/auth/login`.

## Deliverables

Always save two files:
1. `SPENDING_LEDGER.md` — the clean ledger with debit/credit format, organized by property
2. `PAYMENT_BREAKDOWN.md` — the gap analysis showing what's tracked vs untracked, with a realistic remaining balance range

Save to a project-specific directory (e.g., `/opt/data/manila-house/`).

## References

- `references/ledger-template.md` — Canonical ledger format to use as a starting template for all spending trackers. Copy and populate.
- `references/sms-parsing-guide.md` — Patterns for extracting financial data from SMS/CSV exports, including common contractor phrasing and gap detection.
- `references/google-drive-sms-parsing.md` — Google Drive OAuth setup + XML parsing workflow for SMS Backup & Restore files. Covers Drive search, download, XML extraction, and financial data extraction patterns.

---

*Session source: July 1, 2026 — Sergio contractor SMS analysis*
*Eddie's format preference: $0,000.00 ledger style*
