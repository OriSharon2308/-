#!/bin/bash
# שומר את התמונה שנמצאת בלוח-ההעתקה כתמונת-נושא.
#   ./tools/save-clipboard-image.sh money
# השמות: numbers addition subtraction add-sub word-problems shapes money clock
#         multiplication division fractions percent decimals measure equations ratio
set -u
SLUG="${1:-}"
if [ -z "$SLUG" ]; then echo "שימוש: $0 <slug>"; exit 1; fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/images/topics"
mkdir -p "$DIR"
OUT="$DIR/$SLUG.png"

osascript <<EOF
try
  set d to (the clipboard as «class PNGf»)
  set f to open for access POSIX file "$OUT" with write permission
  set eof f to 0
  write d to f
  close access f
  return "ok"
on error e
  return "ERR " & e
end try
EOF

if [ -s "$OUT" ] && file "$OUT" | grep -q "PNG image"; then
  # לוח-ההעתקה של macOS מרכיב שקיפות על שחור → פינות מעוגלות יוצאות שחורות
  python3 "$(dirname "$0")/fix-clip-bg.py" "$OUT" 2>/dev/null || true
  SIZE=$(file "$OUT" | sed 's/.*PNG image data, //; s/,.*//')
  BYTES=$(wc -c < "$OUT" | tr -d ' ')
  echo "✓ נשמר: images/topics/$SLUG.png  ($SIZE, $BYTES בייטים)"
else
  rm -f "$OUT"
  echo "✗ אין תמונה בלוח-ההעתקה (או שהיא לא PNG). העתק את התמונה ונסה שוב."
  exit 1
fi
