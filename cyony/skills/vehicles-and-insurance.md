# Eddie's Vehicle Fleet & Insurance Tracking

## Full Fleet (5 vehicles)

| # | Vehicle | Year | Type | Status | Insurance | Policy # | Expires |
|---|---------|------|------|--------|-----------|----------|---------|
| 1 | Porsche Cayman | 2008 | Car (black, SQHQ-911) | Daily fun, paid off $58K | State Farm | 1133173-SFP-42 | Dec 2, 2026 |
| 2 | Mitsubishi Outlander | 2018 | SUV | Family vehicle | State Farm | 0769427-SFP-42 | Oct 7, 2026 |
| 3 | CFMOTO 700XCL | 2022 | Bike (license 3B2-B51 TN) | Daily motorcycle | State Farm | 5489269-A05-42 | Jan 5, 2027 |
| 4 | Nissan Frontier | 2000 | Truck (dad's) | Eddie pays all — tags, insurance, paid off. Dad just puts gas in it. | State Farm | 1293723-SFP-42 | Dec 27, 2026 |
| 5 | VW Baja Bug | 1960 | Project (K20 swap) | In progress, NOT insured | TBD | TBD | TBD |

**⚠️ F-150 NEVER EXISTED** — Eddie invented it, Cyony never corrected. Discovered during insurance audit June 2026. #RIPPhantomF150

## Key Details

### Porsche Cayman (2008)
- Color: black, yellow calipers
- License: SQHQ-911
- VIN: WP0AA29838U760191
- Named insured: MITCHEL, THOMAS
- Agent: KATIE LAMB, State Farm — (901) 567-8000

### Nissan Frontier (2000) — Dad's Truck
- Eddie's dad bought Eddie's first vehicles and paid insurance until 22
- Dad's AC went out, Eddie bought him this truck (used, newer, everything works)
- Eddie pays: tags, insurance. Truck is paid off. Dad just puts gas in it.
- **"Send to Dad" feature:** Eddie texts updated insurance cards to dad when they renew. Dad is NOT tech savvy — barely understands texting, gets Facebook viruses. Pre-composed message + PDF attachment is the workflow.

### CFMOTO 700XCL (2022)
- Eddie rides this to work — "grab a helmet" = this vehicle
- Coverages: BI/PD Liability, Comprehensive $50 ded, Collision $50 ded, Uninsured Motor
- NAIC: 25178

## Insurance Policies (all State Farm, agent Katie Lamb)

| Policy | Vehicle/Property | Premium | Expires | Status |
|--------|-----------------|---------|---------|--------|
| 5489269-A05-42 | CFMOTO 700XCL | $240.62 | Jan 5, 2027 | ✅ Good |
| 1293723-SFP-42 | Nissan Frontier (dad's) | $388.84 (6-mo) | Dec 27, 2026 | ✅ Good |
| 1133173-SFP-42 | Porsche Cayman | — | Dec 2, 2026 | ✅ Good |
| 0769427-SFP-42 | Mitsubishi Outlander | — | Oct 7, 2026 | ✅ Good |
| 94-TB-278-9 | 512 W Lee Ave, Osceola AR | $2,101/yr | May 19, 2027 | ✅ Good |
| 94-CM-Y971-7 | 601 Davidson St, Manila AR | $1,646/yr | Jul 28, 2026 | ⚠️ Expires soon |
| 42-NF-G904-2 | 7197 Grape Tree Tr, Cordova TN | $2,530/yr | Apr 7, 2027 | ✅ Good |

**Total insurance spend:** ~$7,000+/yr
**Named insured:** MITCHEL, THOMAS (Eddie's full name: Thomas E. Mitchell)
**Agent:** Katie Lamb, State Farm, (901) 567-8000, 13690 Highway 51 Ste 103, Atoka TN

## "Send to Dad" Workflow
1. Eddie says: "Send the [vehicle] card to Dad"
2. Cyony pulls the PDF, copies to clean filename
3. Delivers via MEDIA: + pre-composed forwarding message
4. Message is DEAD SIMPLE: "Hey Dad, here's your current insurance cards."
5. Eddie copies text, attaches PDF, sends. Two taps.

**Dad is not tech savvy** — no apps, no email, just SMS. Pre-composed text + PDF attachment is the only viable approach.

## Rental Properties

| Property | Address | Location |
|----------|---------|----------|
| Home | 7197 Grape Tree Tr | Cordova TN 38018 |
| Rental 1 | 512 W Lee Ave | Osceola AR 72370 |
| Rental 2 | 601 Davidson St | Manila AR 72442 |

## Pitfalls
- Eddie calls the CFMOTO his "bike" — don't confuse with side-by-side or UTV
- F-150 was NEVER REAL — if it appears in old data, it's phantom. Correct immediately.
- Cayman is 2008, NOT 2019. CFMOTO is 2022, NOT 2025.
- Davidson St is in MANILA ARKANSAS, not Tennessee
- pymupdf installs to SideQuestHQ venv (`/opt/data/SideQuestHQ/.venv/bin/python3`)
- State Farm PDF URLs have square brackets — use `curl -g`
- Eddie's dad is NOT tech savvy — keep all communications to him dead simple
- Eddie's full name is Thomas E. Mitchell (discovered via insurance documents)
- Eddie's home address: 7197 Grape Tree Tr, Cordova TN 38018 (mortgage Wells Fargo #0582109021)
