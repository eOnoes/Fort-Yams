# Pre-Composed Message Delivery

## When Eddie Says "Send X to Y"
This means: prepare a text message + file attachment that Eddie can manually forward. NOT automated sending.

## The Pattern
1. Eddie: "Send the Outlander insurance card to my dad"
2. Agent: Composes clean text message
3. Agent: Attaches the relevant PDF
4. Agent: Delivers both to Eddie via Telegram
5. Eddie: Copies text, attaches file, sends manually

## Key Rules
- **No fluff, no pet names** — the message is going to someone else
- **Dead simple language** — recipient may not be tech savvy
- **Include key facts** — policy number, expiration date, contact info
- **One sentence + attachment** — that's all that's needed

## Example — Insurance Card to Dad
**Text message:**
> Hey Dad, here's your current insurance cards.

**Attachment:** The actual PDF file (not a file path — the real file delivered via MEDIA: tag)

**What Eddie sees:** The text message + the PDF file, ready to copy/paste and forward.

## Why This Matters
Eddie's dad is not tech savvy. He barely understands texting. Gets viruses on Facebook. Eddie manually texts him updated insurance cards twice a year (6-month policy blocks). This workflow automates the PREPARATION, not the SENDING — Eddie still hits send, ensuring it comes from his number.

## Contact Info Pattern
When preparing messages for specific people, pull contact info from the Connects workspace:
- Name, role, phone, email
- Relevant policy/vehicle info
- Next touch date

## File Delivery
Use `MEDIA:/absolute/path/to/file` to deliver the actual PDF. NOT a file path text string. Eddie needs the real file he can attach to a text message.

## Recipient Awareness
- **Dad:** Simple language, no tech jargon, just "here are your cards"
- **Contractors:** Professional, includes job details
- **Family:** Warm but clear
- **Insurance agent (Katie Lamb):** Business-like, includes policy numbers
