# Google Drive SMS Backup Parsing

## Setup
1. Ensure Google Workspace OAuth is set up: `python setup.py --check` → should print `AUTHENTICATED`
2. If not: `python setup.py --auth-url` → share URL with user → user approves → `python setup.py --auth-code "REDIRECT_URL"`

## Workflow

### Step 1: Find SMS Files on Drive
```bash
GAPI="python /path/to/google_api.py"
$GAPI drive search "SMS" --max 20
```
Look for:
- Folders named "sms back up" or similar
- XML files named like `sms-YYYYMMDDHHMMSS.xml`
- These come from the "SMS Backup & Restore" app by SyncTech (free on Android)

### Step 2: Download the XML File
```bash
$GAPI drive download FILE_ID --output /path/to/save/sms-backup.xml
```

### Step 3: Parse the XML
The XML format from SMS Backup & Restore:
```xml
<smses count="5933" type="full">
  <sms protocol="0" address="+1XXXXXXXXXX" date="1688286712184" 
        type="2" body="message text" 
        contact_name="Contact Name" 
        readable_date="Jul 2, 2023 3:31:52 AM" />
</smses>
```
- `type="1"` = received, `type="2"` = sent
- `date` = Unix timestamp in milliseconds
- `contact_name` = saved contact name

### Step 4: Extract Contact Conversations
```python
import xml.etree.ElementTree as ET
tree = ET.parse('sms-backup.xml')
root = tree.getroot()

# Get message counts by contact
contacts = {}
for sms in root.findall('sms'):
    name = sms.get('contact_name', 'Unknown')
    contacts[name] = contacts.get(name, 0) + 1

# Filter by contact
for sms in root.findall('sms'):
    if 'Sergio' in sms.get('contact_name', ''):
        # Process message
```

### Step 5: Financial Extraction
Apply the financial-ledger extraction workflow:
1. Search for `$`, `owe`, `paid`, `cash`, `bank`, `balance`
2. Pull ALL dollar amounts with context
3. Build ledger with debit/credit format
4. Flag gaps (phone payments, cash, untracked amounts)

## Pitfalls
1. **File size**: SMS backups can be huge (5,000+ messages). Read in chunks.
2. **Blank messages**: Many entries have empty `body` — these are MMS or media messages. Skip them.
3. **Date sorting**: Messages are NOT always in chronological order in the XML. Sort by `date` attribute.
4. **Contact name variations**: Same person may appear as different names if contact was renamed. Check `address` field too.
5. **Google Drive OAuth expires**: Token refreshes automatically but may need re-auth after ~30 days.
