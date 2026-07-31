#!/usr/bin/env python3
"""חותך את השוליים הריקים של איור-נושא — כדי שלא תיראה מסגרת/צל סביבו.

מוצא את התיבה החוסמת של התוכן הצבעוני (מתעלם מאפור-בהיר וצל),
משאיר שוליים קטנים, וחותך. האיור עצמו לא נגע — רק הרווח סביבו.

שימוש:  trim-topic-image.py <קובץ.png> [שוליים%]
"""
import sys
from PIL import Image

MARGIN_PCT = 1.5  # שוליים שנשארים סביב התוכן


def main(path, margin_pct=MARGIN_PCT):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            sat = max(r, g, b) - min(r, g, b)
            if sat > 18 or min(r, g, b) < 150:  # צבע ממשי או כהה — לא צל אפור
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y

    if maxx <= minx or maxy <= miny:
        print("לא נמצא תוכן — לא שונה דבר")
        return 0

    m = int(min(w, h) * margin_pct / 100)
    left = max(0, minx - m)
    top = max(0, miny - m)
    right = min(w, maxx + m)
    bottom = min(h, maxy + m)

    if (left, top, right, bottom) == (0, 0, w, h):
        print("אין שוליים לחתוך — לא שונה דבר")
        return 0

    im.crop((left, top, right, bottom)).save(path, "PNG")
    print(
        f"נחתך: {w}x{h} → {right-left}x{bottom-top}  "
        f"(שמאל {left}px · עליון {top}px · ימין {w-right}px · תחתון {h-bottom}px)"
    )
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("שימוש: trim-topic-image.py <קובץ.png> [שוליים%]")
        sys.exit(1)
    pct = float(sys.argv[2]) if len(sys.argv) > 2 else MARGIN_PCT
    sys.exit(main(sys.argv[1], pct))
