# Insurance Card Workflow & Contacts

## Insurance Card Delivery to Dad (2026-06-27)
Eddie manually texts updated insurance cards to his dad (not tech savvy, barely understands texting, gets viruses on Facebook). 6-month policy blocks = 2x per year.

### Workflow
1. Eddie: "Send [vehicle] insurance card to Dad"
2. Agent: Pulls PDF from `/opt/data/cache/documents/`
3. Agent: Composes clean text message (no fluff, no pet names)
4. Agent: Delivers text + PDF via MEDIA: tag
5. Eddie: Copies text, attaches file, sends from HIS phone (shows as his number)

### Example Text
> Hey Dad, here's your current insurance cards.

### Dad's Vehicle
- 2000 Nissan Frontier — Policy 1293173-SFP-42, $388.84/6mo, expires Dec 27, 2026
- Under Eddie's State Farm policy
- Insurance agent: Katie Lamb

### Why Manual
Pre-composed text shows from Eddie's phone number. Twilio/automated SMS would show a random number. Dad is not tech savvy — needs to see his son's name on the text.

## Katie Lamb — Insurance Contact (2026-06-27)
Added to Connects workspace as contact.

| Field | Value |
|---|---|
| Name | Katie Lamb |
| Role | Insurance Agent — State Farm |
| Phone | (901) 567-8000 |
| Email | katie.lamb.ervc@statefarm.com |
| Location | 13690 Highway 51 Ste 103, Atoka TN |
| Manages | All 7 insurance policies |
| Next Touch | Oct 2026 (Outlander renewal) |

### All Policies Under Katie
- CFMOTO 700XCL: 5489269-A05-42, $240.62, expires Jan 5, 2027
- Nissan Frontier: 1293173-SFP-42, $388.84, expires Dec 27, 2026
- Porsche Cayman: 1133173-SFP-42, expires Dec 2, 2026
- Mitsubishi Outlander: 0769427-SFP-42, expires Oct 7, 2026
- W Lee Ave (rental): 94-TB-278-9, $2,101/yr, expires May 19, 2027
- Davidson St (rental): 94-CM-Y971-7, $1,644/yr, expires Jul 28, 2026
- Grapetree Trl (home): 42-NF-G904-2, $2,530/yr, expires Apr 7, 2027
