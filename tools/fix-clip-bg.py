#!/usr/bin/env python3
"""מתקן תמונה שהועתקה מלוח-ההעתקה: שקיפות שנשרפה על שחור → רקע לבן.

macOS מרכיב תמונות שקופות על שחור כשהן עוברות בלוח-ההעתקה, ולכן
פינות מעוגלות יוצאות שחורות. כאן ממלאים מהשוליים פנימה (flood fill)
רק את האזור הכהה שמחובר לקצה — האיור עצמו לא נגע.

שימוש:  fix-clip-bg.py <קובץ.png>
"""
import sys
from collections import deque
from PIL import Image

DARK = 110      # סף "כהה" למילוי
SOFT = 200      # סף למיזוג שוליים מרוככים (anti-alias)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]




def main(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not any(lum(c) < DARK for c in corners):
        # אין רקע שחור — אין מה לתקן. הצל והרקע של האיור נשארים כפי שהם.
        print("אין רקע שחור — לא שונה דבר")
        return 0

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if lum(px[x, y]) < DARK and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if lum(px[x, y]) < DARK and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))

    filled = 0
    edge = []
    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255)
        filled += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                l = lum(px[nx, ny])
                if l < DARK:
                    seen[ny * w + nx] = 1
                    q.append((nx, ny))
                elif l < SOFT:
                    seen[ny * w + nx] = 1
                    edge.append((nx, ny, l))

    # טבעת ה-anti-alias: ממזגים ללבן לפי כמה שהיא כהה — בלי קו אפור מסביב
    for x, y, l in edge:
        t = (SOFT - l) / (SOFT - DARK)  # 1 = כהה מאוד, 0 = בהיר
        r, g, b = px[x, y]
        px[x, y] = (
            int(r + (255 - r) * t),
            int(g + (255 - g) * t),
            int(b + (255 - b) * t),
        )

    im.save(path, "PNG")
    print(f"תוקן: {filled} פיקסלים ברקע + {len(edge)} בשוליים → לבן")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("שימוש: fix-clip-bg.py <קובץ.png>")
        sys.exit(1)
    sys.exit(main(sys.argv[1]))
