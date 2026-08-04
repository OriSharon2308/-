#!/usr/bin/env python3
"""מכין הבעת-פנים של המורה לשימוש כאווטאר צף.

האיורים המקוריים מצוירים על רקע לבן ומוקפים בטבעת-זוהר לבנבנה. הפיכת
הרקע לשקוף לבדה משאירה את הטבעת — והיא בולטת כעיגול לבן על כל רקע שאינו לבן.

שלושה שלבים:
  1. הצפה מהשוליים → הרקע הלבן נעשה שקוף (כמו make-transparent-bg.py)
  2. ניקוי-הילה: *רק מחוץ לרדיוס הפנים* מורידים אלפא לפי כמה שהפיקסל
     לבן-וחסר-צבע. כוכבים ונקודות צבעוניים שורדים כי יש להם רוויה.
  3. חיתוך לגבולות בפועל + הקטנה ל-360px

שימוש:  prep-face.py <מקור.png> <יעד.png>
"""
import sys
from collections import deque
from PIL import Image

WHITE = 238        # מעליו = רקע לבן ודאי
SOFT = 200         # מתחתיו = כבר איור
INNER_R = 0.40     # עד כאן הפנים/הכובע — לא נוגעים
OUTER_R = 0.50     # מכאן החוצה הטבעת נמחקת לגמרי
MAX_SIDE = 360


def flood_transparent(im):
    """הרקע הלבן המחובר לשוליים → אלפא 0, עם טבעת-מעבר רכה."""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q, edge = deque(), []

    def push(x, y):
        if seen[y * w + x]:
            return
        m = min(px[x, y][:3])
        if m >= WHITE:
            seen[y * w + x] = 1
            q.append((x, y))
        elif m >= SOFT:
            seen[y * w + x] = 1
            edge.append((x, y, m))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    for x, y, m in edge:
        r, g, b, a = px[x, y]
        t = (m - SOFT) / (WHITE - SOFT)
        px[x, y] = (r, g, b, int(a * (1 - t)))


def strip_halo(im):
    """מוחק את טבעת-הזוהר הלבנבנה שמחוץ לפנים, ומשאיר צבע."""
    w, h = im.size
    px = im.load()
    cx, cy = w / 2, h / 2
    ref = min(w, h)
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            # מרחק מהמרכז, מנורמל לצלע הקצרה
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / ref
            if d < INNER_R:
                continue  # אזור הפנים — לא נוגעים
            mx, mn = max(r, g, b), min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / mx  # רוויה: כוכב צבעוני ~גבוה, הילה ~0
            light = mx / 255
            # לבן-וחיוור בלבד נמחק; ככל שרחוק יותר — אגרסיבי יותר
            pale = max(0.0, min(1.0, (light - 0.72) / 0.28)) * max(0.0, min(1.0, (0.22 - sat) / 0.22))
            reach = min(1.0, (d - INNER_R) / (OUTER_R - INNER_R))
            drop = pale * reach
            if drop > 0.01:
                px[x, y] = (r, g, b, int(a * (1 - drop)))
                n += 1
    return n


def main(src, dst):
    im = Image.open(src).convert("RGBA")
    flood_transparent(im)
    n = strip_halo(im)
    bb = im.split()[3].getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    im.save(dst, "PNG", optimize=True)
    print(f"{dst.split('/')[-1]:<16} {im.size}  הילה: {n} פיקסלים")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("שימוש: prep-face.py <מקור.png> <יעד.png>")
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2]))
