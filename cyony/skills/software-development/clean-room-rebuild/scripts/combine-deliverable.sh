#!/usr/bin/env bash
# combine-deliverable.sh
#
# Combines multiple phase/doctrine files into a single text deliverable with
# numbered section dividers for human or multi-agent review. Designed for
# delivery as a single MEDIA: attachment in chat contexts.
#
# Usage:
#   bash combine-deliverable.sh <output_file> <file1> [<file2> ...]
#
# Example (Tripp.Reason Step 0 handoff):
#   bash combine-deliverable.sh STEP_0_ALL_FILES.txt \
#     docs/DOCTRINE.md docs/ARCHITECTURE.md docs/ROADMAP.md \
#     reports/STEP_0_DOCTRINE_REPORT.md
#
# Produces:
#   ======================================================================
#    FILE 1/4: docs/DOCTRINE.md
#   ======================================================================
#
#   [full content of DOCTRINE.md]
#
#   ======================================================================
#    FILE 2/4: docs/ARCHITECTURE.md
#   ======================================================================
#   ...

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <output_file> <file1> [<file2> ...]" >&2
  exit 1
fi

OUTPUT="$1"
shift

TOTAL=$#
N=0

{
  for FILE in "$@"; do
    N=$((N + 1))
    if [ ! -f "$FILE" ]; then
      echo "# FILE $N/$TOTAL: $FILE" >&2
      echo "# WARNING: file does not exist: $FILE"
      echo
      continue
    fi
    printf '%.0s=' {1..70}
    printf '\n FILE %d/%d: %s\n' "$N" "$TOTAL" "$FILE"
    printf '%.0s=' {1..70}
    printf '\n\n'
    cat "$FILE"
    printf '\n\n'
  done
} > "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
CHARS=$(wc -c < "$OUTPUT" | tr -d ' ')
echo "Combined $TOTAL files → $OUTPUT ($LINES lines, $CHARS chars)"
