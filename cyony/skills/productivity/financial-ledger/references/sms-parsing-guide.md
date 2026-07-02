# SMS Parsing Guide — Extracting Financial Data

## SMS Backup Format (SyncTech app)

CSV columns from SMS Backup & Restore:
```
Type, Date, Name / Number, Sender, Content
```

- `Type`: "Sent" or "Received"
- `Date`: "Jul 1, 2026 9:46:12 AM" format
- `Name / Number`: Contact name + masked number (+190****3514)
- `Sender`: Contact name (for received) or empty (for sent)
- `Content`: The message body — may contain line breaks (encoded as \n in the CSV)

## Search Patterns for Financial Data

### Dollar amounts
```
grep '\$' for dollar signs
grep 'owe|paid|pay|cash|bank|Zelle|credit|receipt|refund|balance' for payment context
```

### Quote patterns (what the contractor says)
- "I would charge you $XXXX" → labor quote
- "Could you help me out with $XXXX" → payment request
- "the average cost is $XXXX" → materials estimate
- "it was a total of $XXXX" → confirmed receipt amount
- "$XXX for the window, $XXX plus $XXX" → itemized bill breakdown

### Payment patterns (what Eddie says)
- "Yes sir. I can do that $XXXX tonight" → confirmed payment
- "Let's make it $Xk tomorrow" → negotiated payment
- "I still owe you $XXXX" → running balance
- "I will leave $XXX with my roommate" → cash payment via roommate
- "I think my bank will only let me pull $XX from the ATM" → withdrawal limit/amount
- "Give me a call when you are ready for me to pay" → phone checkout (amount invisible)

### Payment plan patterns
- "2k to start" → first installment
- "1500 halfway" → second installment
- "1450 finished" → final payment
- "30% to start, 70% when done" → percentage-based plan

## Common Contractor Phrasing (Sergio-specific)

- "Could you help me out with..." = payment request (may be separate from formal bill)
- "I'm at Lowe's... I'll call you so you can pay" = phone checkout, amount unknown
- "My friend sold me those for $XXX each" = materials cost from third party
- "I paid for them, I put your phone number on it" = Sergio paid upfront, Eddie reimbursing
- "Good morning friend" / "Ok thanks you friend" / "Ok thanks you" = filler, no financial info

## Gap Detection

Watch for these phrases — they indicate payments NOT tracked in the thread:
- "call me when you are ready for me to pay" → Eddie pays by phone at Lowe's/Home Depot
- "Have the cashier call me" → phone checkout
- "I'm ready to pay here at Home Depot" → store checkout happening now
- "that money will be at my house, my roommate can give it to you" → cash payment, amount may be in earlier/later message
- "I believe they refunded me $XX dollars" → return/refund at store, reduces balance

## Dollar Extraction Regex

```
\$[0-9,]+\.?[0-9]*     → matches $1,400, $80, $157.72
\d+k                    → matches 2k, 13k (multiply by 1000)
\d+ hundred             → matches "two hundred" (rare, manual check)
\d+ thousand            → matches "a few thousand" (rare, manual check)
```

## Pitfall: Consolidated Bills

When a contractor sends a consolidated bill like:
```
"$157 for the window, $1328 plus $800 for the plumbing plus $1000 for the two extra ceiling panels, totaling $3285"
```

The total ($3,285) may NOT include pre-payments ($900 already paid toward the $1,700 plumbing). The real Phase 1 cost is $3,285 (bill) + $900 (pre-paid) = $4,185. Always check whether the bill total accounts for previous partial payments.
