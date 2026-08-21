#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V2 additions:
  1. hand.png + body-nowave.png — the waving hand cut as its own layer
     (pivot at the wrist, hidden behind the static gold cuff).
  2. el-XX.png re-keyed HARD — solid shapes only, no baked blue smears.
     (a fresh clean halo is added in CSS at composite time)
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "../images/full-body/e447572e-b8cc-4de2-a925-b6f418685483.png"

src = np.array(Image.open(SRC).convert("RGBA")).astype(np.float64)
body = np.array(Image.open("assets/body.png").convert("RGBA")).astype(np.float64)
H, W = body.shape[:2]
r, g, b = src[..., 0], src[..., 1], src[..., 2]
minc = np.minimum(np.minimum(r, g), b)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# ---------- 1. cut the waving hand ----------
# skin detection inside the hand box (fingers+palm are warm; sleeve/hair are not)
BX0, BY0, BX1, BY1 = 270, 445, 440, 645
box = np.zeros((H, W), dtype=bool)
box[BY0:BY1, BX0:BX1] = True
skin = (r > 195) & (r - b > 18) & (g > 150) & (body[..., 3] > 100) & box
skin = ndimage.binary_closing(skin, structure=np.ones((5, 5)))
skin = ndimage.binary_opening(skin, structure=np.ones((3, 3)))
# largest component only
lab, n = ndimage.label(skin)
if n > 1:
    sizes = ndimage.sum(skin, lab, range(1, n + 1))
    skin = lab == (1 + int(np.argmax(sizes)))
skin_soft = ndimage.gaussian_filter(skin.astype(np.float64), 2.0)

ys_, xs_ = np.where(skin)
hy0, hy1, hx0, hx1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
print(f"hand bbox: x {hx0}-{hx1}, y {hy0}-{hy1}")

pad = 8
cy0, cy1 = max(0, hy0 - pad), min(H, hy1 + 1 + pad)
cx0, cx1 = max(0, hx0 - pad), min(W, hx1 + 1 + pad)
hand = body[cy0:cy1, cx0:cx1].copy()
hand[..., 3] = hand[..., 3] * np.clip(skin_soft[cy0:cy1, cx0:cx1] * 1.6, 0, 1)
Image.fromarray(hand.astype(np.uint8)).save("assets/hand.png")

body_nw = body.copy()
skin_wide = ndimage.gaussian_filter(ndimage.binary_dilation(skin, iterations=3).astype(np.float64), 2.0)
body_nw[..., 3] = body_nw[..., 3] * (1 - np.clip(skin_wide * 2.2, 0, 1))
Image.fromarray(body_nw.astype(np.uint8)).save("assets/body-nowave.png")
print(f"hand.png ({cx1-cx0}x{cy1-cy0} at {cx0},{cy0}) + body-nowave.png saved")

# ---------- 2. re-key elements: solid shapes, no smears ----------
mat_a = np.array(Image.open("assets/character-matted.png").convert("RGBA")).astype(np.float64)[..., 3]
char_zone = ndimage.binary_dilation(mat_a > 10, iterations=6)
meta = json.load(open("assets/elements.json"))
for e in meta["elements"]:
    x0, y0 = e["x"], e["y"]
    x1, y1 = x0 + e["w"], y0 + e["h"]
    crop = src[y0:y1, x0:x1].copy()
    cr, cg, cb = crop[..., 0], crop[..., 1], crop[..., 2]
    cmin = np.minimum(np.minimum(cr, cg), cb)
    a_lin = 1 - cmin / 255.0
    core = cmin < 205                       # solid body of the shape
    core = ndimage.binary_opening(core, structure=np.ones((2, 2)))
    keep = ndimage.binary_dilation(core, iterations=6)
    alpha = smoothstep(0.12, 0.45, a_lin) * keep   # pale smears (<0.12) vanish
    alpha = alpha * (~char_zone[y0:y1, x0:x1])     # never include character pixels
    with np.errstate(divide="ignore", invalid="ignore"):
        for ch in range(3):
            c = crop[..., ch]
            ct = np.where(alpha > 0.01, (c - (1 - alpha) * 255) / np.maximum(alpha, 0.01), 0)
            crop[..., ch] = np.clip(ct, 0, 255)
    crop[..., 3] = alpha * 255
    Image.fromarray(crop.astype(np.uint8)).save(f"assets/{e['name']}.png")
print(f"re-keyed {len(meta['elements'])} element sprites (hard key)")

meta["hand"] = {"x": int(cx0), "y": int(cy0), "w": int(cx1 - cx0), "h": int(cy1 - cy0),
                "pivotX": 388, "pivotY": 600}
with open("assets/elements.json", "w") as f:
    json.dump(meta, f, indent=1)
print("elements.json updated with hand box")
