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
# נמדד על האיורים עצמם: טבעת-המערבולת ברוויה 0.03–0.07, ואילו *כל* מה
# ששייך לראש נמצא ב-0.17 ומעלה (עור 0.17, זהב 0.22, שיער 0.22–0.72).
# לכן הרוויה — ולא הבהירות — היא מה שמפריד ביניהם.
SAT_MAX = 0.14     # מתחתיו = רקע
LIGHT_MIN = 0.80   # ומעליו = בהיר
INNER_R = 0.34     # קצה השיער/הכובע — עד לכאן לא נוגעים
OUTER_R = 0.38     # מכאן החוצה מוחקים במלוא העוצמה
MAX_SIDE = 460


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
            sat = 0 if mx == 0 else (mx - mn) / mx  # רוויה: כוכב צבעוני ~גבוה, טבעת ~0
            light = mx / 255
            # לבן-וחיוור בלבד נמחק; ככל שרחוק יותר — אגרסיבי יותר
            # מדרון חד בכוונה: מדרון מתון השאיר 40% מהטבעת כרפאים על המסך.
            # בפער שנמדד (רוויה 0.07 מול 0.17) אפשר להרשות לעצמנו סף כמעט-בינארי.
            pale = max(0.0, min(1.0, (light - LIGHT_MIN) / 0.08)) * max(
                0.0, min(1.0, (SAT_MAX - sat) / 0.04)
            )
            reach = min(1.0, (d - INNER_R) / (OUTER_R - INNER_R))
            drop = pale * reach
            if drop > 0.01:
                px[x, y] = (r, g, b, int(a * (1 - drop)))
                n += 1
    return n


def keep_head_only(im):
    """משאיר את הראש ואת סמלי-ההבעה, ומעיף את קישוטי-הרקע.

    הכוכבים והנקודות המרחפים הם רכיבי-קשירות נפרדים מהראש — וכך גם
    סימן-השאלה של "חושב" והנורה של "רעיון", שאסור לאבד: בלעדיהם ההבעה
    לא אומרת כלום. נמדד על האיורים עצמם:

        הראש           100%
        סימן-שאלה/נורה 1.1% – 8.8%   ← נשמרים
        כוכבים/נקודות  0.4% ומטה     ← מוסרים

    לכן הסף על 0.6% מהגוש הגדול — עם מרווח לשני הכיוונים.
    """
    KEEP_RATIO = 0.006
    w, h = im.size
    a = im.split()[3].load()
    px = im.load()
    ALPHA = 40  # מתחת לזה נחשב ריק
    label = [0] * (w * h)
    sizes = {}
    cur = 0

    for sy in range(h):
        for sx in range(w):
            if label[sy * w + sx] or a[sx, sy] < ALPHA:
                continue
            cur += 1
            size = 0
            stack = [(sx, sy)]
            label[sy * w + sx] = cur
            while stack:
                x, y = stack.pop()
                size += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not label[ny * w + nx] and a[nx, ny] >= ALPHA:
                        label[ny * w + nx] = cur
                        stack.append((nx, ny))
            sizes[cur] = size

    if not sizes:
        return 0, 0
    biggest = max(sizes.values())
    keep = {cid for cid, s in sizes.items() if s >= biggest * KEEP_RATIO}

    dropped = 0
    for y in range(h):
        row = y * w
        for x in range(w):
            if label[row + x] not in keep:
                r, g, b, al = px[x, y]
                if al:
                    px[x, y] = (r, g, b, 0)
                    dropped += 1
    return cur - len(keep), dropped


def main(src, dst):
    im = Image.open(src).convert("RGBA")
    flood_transparent(im)
    n = strip_halo(im)
    parts, dropped = keep_head_only(im)
    bb = im.split()[3].getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    im.save(dst, "PNG", optimize=True)
    print(f"{dst.split('/')[-1]:<16} {str(im.size):<12} הילה {n:>6}  |  {parts} גושי-רקע הוסרו ({dropped} פיקסלים)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("שימוש: prep-face.py <מקור.png> <יעד.png>")
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2]))
