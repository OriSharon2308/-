#!/bin/bash
# שומר את התמונה שנמצאת בלוח-ההעתקה כתמונת-נושא.
#   ./tools/save-clipboard-image.sh money
# מנסה שלושה פורמטים לפי הסדר: PNG → TIFF → JPEG, כי אפליקציות שונות
# שמות בלוח פורמט שונה. אחר-כך מתקן פינות שחורות (שקיפות שנשרפה).
#
# השמות: numbers addition subtraction add-sub word-problems shapes money clock
#         multiplication division fractions percent decimals measure equations ratio
set -u
SLUG="${1:-}"
if [ -z "$SLUG" ]; then echo "שימוש: $0 <slug>"; exit 1; fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/images/topics"
mkdir -p "$DIR"
OUT="$DIR/$SLUG.png"
TMP="$(mktemp -t velaclip)"

grab() { # $1 = מחלקת-לוח, $2 = קובץ יעד
  osascript <<EOF 2>/dev/null
try
  set d to (the clipboard as «class $1»)
  set f to open for access POSIX file "$2" with write permission
  set eof f to 0
  write d to f
  close access f
  return "ok"
on error
  return "err"
end try
EOF
}

ok=0
# 1) PNG ישירות
if [ "$(grab PNGf "$TMP.png")" = "ok" ] && [ -s "$TMP.png" ] && file "$TMP.png" | grep -q "PNG image"; then
  mv "$TMP.png" "$OUT"; ok=1
fi
# 2) TIFF → PNG (רוב האפליקציות שמות TIFF בלוח)
if [ $ok -eq 0 ] && [ "$(grab TIFF "$TMP.tiff")" = "ok" ] && [ -s "$TMP.tiff" ]; then
  if sips -s format png "$TMP.tiff" --out "$OUT" >/dev/null 2>&1; then ok=1; fi
fi
# 3) JPEG → PNG
if [ $ok -eq 0 ] && [ "$(grab JPEG "$TMP.jpg")" = "ok" ] && [ -s "$TMP.jpg" ]; then
  if sips -s format png "$TMP.jpg" --out "$OUT" >/dev/null 2>&1; then ok=1; fi
fi
rm -f "$TMP" "$TMP.png" "$TMP.tiff" "$TMP.jpg"

if [ $ok -eq 1 ] && [ -s "$OUT" ] && file "$OUT" | grep -q "PNG image"; then
  # לוח-ההעתקה של macOS מרכיב שקיפות על שחור → פינות מעוגלות יוצאות שחורות
  python3 "$(dirname "$0")/fix-clip-bg.py" "$OUT" 2>/dev/null || true
  SIZE=$(file "$OUT" | sed 's/.*PNG image data, //; s/,.*//')
  BYTES=$(wc -c < "$OUT" | tr -d ' ')
  echo "✓ נשמר: images/topics/$SLUG.png  ($SIZE, $BYTES בייטים)"
else
  rm -f "$OUT"
  echo "✗ אין תמונה בלוח-ההעתקה. לחיצה ימנית על התמונה → \"העתק תמונה\", ואז שוב."
  exit 1
fi
