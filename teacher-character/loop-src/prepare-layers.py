#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layer preparation for the teacher idle-loop animation.
Splits the source illustration into:
  assets/body.png     — character upper body (opaque down to the skirt, feathered out)
  assets/tail.png     — genie aura tail (feathered top, hides behind body)
  assets/el-*.png     — each floating element (stars, orbs, pyramid, cube, atom) as its own sprite
  assets/elements.json — positions/sizes of every extracted element (px, in 1254-space)
The elliptical ring + ground shadow are dropped (recreated in CSS).
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "../images/full-body/e447572e-b8cc-4de2-a925-b6f418685483.png"
MAT = "assets/character-matted.png"

src = np.array(Image.open(SRC).convert("RGBA")).astype(np.float64)
mat = np.array(Image.open(MAT).convert("RGBA")).astype(np.float64)
H, W = mat.shape[:2]

# ---------- 1. body / tail split ----------
alpha = mat[..., 3]
ys = np.arange(H, dtype=np.float64)[:, None]

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# body: fully opaque above y=900, fades out 900->965
body_keep = 1 - smoothstep(900, 965, ys)
body = mat.copy()
body[..., 3] = alpha * body_keep

# tail: crop of the character from y=820 down, feathered in 820->870 (hidden under body)
tail_keep = smoothstep(820, 870, ys)
tail = mat.copy()
tail[..., 3] = alpha * tail_keep
# tail crop box (content only)
ta = tail[..., 3]
tys, txs = np.where(ta > 8)
ty0, ty1, tx0, tx1 = tys.min(), tys.max(), txs.min(), txs.max()
tail_crop = tail[ty0:ty1 + 1, tx0:tx1 + 1]

Image.fromarray(body.astype(np.uint8)).save("assets/body.png")
Image.fromarray(tail_crop.astype(np.uint8)).save("assets/tail.png")

# ---------- 2. floating elements ----------
r, g, b = src[..., 0], src[..., 1], src[..., 2]
minc = np.minimum(np.minimum(r, g), b)
char_zone = ndimage.binary_dilation(alpha > 10, iterations=12)  # character + halo margin

regions = []  # (ys, xs) index arrays of final accepted components

def collect(sub_mask, thresh):
    """Label sub_mask; keep small components, re-split big ones at a stricter threshold."""
    lab, n = ndimage.label(sub_mask, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        region = lab == i
        area = int(region.sum())
        if area < 40:
            continue
        rys, rxs = np.where(region)
        y0, y1, x0, x1 = rys.min(), rys.max(), rxs.min(), rxs.max()
        w_, h_ = int(x1 - x0 + 1), int(y1 - y0 + 1)
        if (w_ > 200 or h_ > 200) and thresh > 150:
            collect(region & (minc < thresh - 30), thresh - 30)  # ring glue: re-split stricter
        else:
            regions.append((rys, rxs))

collect((minc < 245) & (~char_zone), 245)

# --- cluster components whose bboxes are within GAP px (atom arcs, pyramid halves…) ---
GAP = 25
boxes = []
for rys, rxs in regions:
    boxes.append([rys.min(), rys.max(), rxs.min(), rxs.max()])
parent = list(range(len(regions)))
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
def near(b1, b2):
    return not (b1[3] + GAP < b2[2] or b2[3] + GAP < b1[2] or
                b1[1] + GAP < b2[0] or b2[1] + GAP < b1[0])
for i in range(len(regions)):
    for j in range(i + 1, len(regions)):
        if near(boxes[i], boxes[j]):
            parent[find(i)] = find(j)
clusters = {}
for i in range(len(regions)):
    clusters.setdefault(find(i), []).append(i)

elements = []
idx = 0
for members in clusters.values():
    rmask = np.zeros((H, W), dtype=bool)
    for m in members:
        rys, rxs = regions[m]
        rmask[rys, rxs] = True
    area = int(rmask.sum())
    strongest = float(minc[rmask].min())
    rys, rxs = np.where(rmask)
    y0, y1, x0, x1 = rys.min(), rys.max(), rxs.min(), rxs.max()
    w_ = int(x1 - x0 + 1)
    cy = int((y0 + y1) / 2)
    # drop: pale ring leftovers / ground-shadow bits / anything huge
    if strongest > 190 or cy > 1150 or w_ > 0.5 * W:
        continue
    pad = 6
    yy0, yy1 = max(0, y0 - pad), min(H, y1 + 1 + pad)
    xx0, xx1 = max(0, x0 - pad), min(W, x1 + 1 + pad)
    crop = src[yy0:yy1, xx0:xx1].copy()
    cr, cg, cb = crop[..., 0], crop[..., 1], crop[..., 2]
    cmin = np.minimum(np.minimum(cr, cg), cb)
    a = np.clip((1 - cmin / 255.0) * 1.15, 0, 1)          # white-key alpha
    a = a ** 0.9                                           # slight lift for glows
    # loose in-box mask: any non-white, non-character pixel (pale glass faces included)
    loose = (cmin < 247) & (~char_zone[yy0:yy1, xx0:xx1])
    a = a * ndimage.binary_dilation(loose, iterations=3)
    # un-premultiply over white: c_true = (c_obs - (1-a)*255) / a
    with np.errstate(divide="ignore", invalid="ignore"):
        for ch in range(3):
            c = crop[..., ch]
            ct = np.where(a > 0.003, (c - (1 - a) * 255) / np.maximum(a, 0.003), 0)
            crop[..., ch] = np.clip(ct, 0, 255)
    crop[..., 3] = a * 255
    idx += 1
    name = f"el-{idx:02d}"
    Image.fromarray(crop.astype(np.uint8)).save(f"assets/{name}.png")
    elements.append({
        "name": name, "x": int(xx0), "y": int(yy0),
        "w": int(xx1 - xx0), "h": int(yy1 - yy0),
        "area": area, "strongest": strongest,
        "cx": int((xx0 + xx1) / 2), "cy": int((yy0 + yy1) / 2),
    })

meta = {
    "frame": {"w": W, "h": H},
    "tail": {"x": int(tx0), "y": int(ty0), "w": int(tx1 - tx0 + 1), "h": int(ty1 - ty0 + 1)},
    "elements": elements,
}
with open("assets/elements.json", "w") as f:
    json.dump(meta, f, indent=1)

print(f"body ok, tail box=({tx0},{ty0},{tx1-tx0+1}x{ty1-ty0+1}), elements={len(elements)}")
for e in elements:
    print(f"  {e['name']}: c=({e['cx']},{e['cy']}) {e['w']}x{e['h']} area={e['area']} strong={e['strongest']:.0f}")
