#!/usr/bin/env python3
"""הופך את הרקע הלבן של איור-נושא לשקוף.

מציף מהשוליים פנימה כל מה שכמעט-לבן ומאפס לו את האלפא, ועוצר בקצה
האיור. שטחים לבנים *בתוך* האיור (דף של ספר, לוח שעון) מוקפים בקו
צבעוני ולכן המילוי לא מגיע אליהם — הם נשארים.

כך האיור יושב נכון על כל רקע, בלי תלות ב-mix-blend-mode (שנשבר
ברגע שיש transform על אלמנט האב — למשל בקרוסלה).

שימוש:  make-transparent-bg.py <קובץ.png>
"""
import sys
from collections import deque
from PIL import Image

WHITE = 238   # סף "כמעט לבן" — מעליו נחשב רקע
SOFT = 200    # מתחתיו כבר איור; בין לבין ממזגים אלפא חלקית


def main(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()

    if min(px[0, 0][:3]) < WHITE and min(px[w - 1, h - 1][:3]) < WHITE:
        print("הפינות אינן לבנות — לא שונה דבר")
        return 0

    seen = bytearray(w * h)
    q = deque()
    edge = []

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

    n = 0
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        n += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    # טבעת המעבר: אלפא חלקית לפי כמה שהפיקסל בהיר — קצה חלק בלי הילה
    for x, y, m in edge:
        r, g, b, a = px[x, y]
        t = (m - SOFT) / (WHITE - SOFT)  # 1 = כמעט לבן
        px[x, y] = (r, g, b, int(a * (1 - t)))

    im.save(path, "PNG")
    print(f"רקע שקוף: {n} פיקסלים + {len(edge)} בשוליים")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("שימוש: make-transparent-bg.py <קובץ.png>")
        sys.exit(1)
    sys.exit(main(sys.argv[1]))
