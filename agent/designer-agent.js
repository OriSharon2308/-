/* eslint-disable no-console */

// המעצב: מייצר איורי SVG פשוטים לתרגילים שצריכים תרשים (גאומטריה, פונקציות).

function rectSvg(w, h) {
  // קנה מידה לפיקסלים
  const scale = Math.min(30, Math.floor(220 / Math.max(w, h)));
  const pw = w * scale;
  const ph = h * scale;
  const pad = 30;
  const width = pw + pad * 2;
  const height = ph + pad * 2;
  return {
    svg: `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect x="${pad}" y="${pad}" width="${pw}" height="${ph}" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <text x="${pad + pw / 2}" y="${pad - 8}" text-anchor="middle" font-size="14" fill="#1e3a8a">רוחב ${w}</text>
  <text x="${pad - 8}" y="${pad + ph / 2}" text-anchor="middle" font-size="14" fill="#1e3a8a" transform="rotate(-90 ${pad - 8} ${pad + ph / 2})">גובה ${h}</text>
</svg>`,
    alt: `מלבן ברוחב ${w} ובגובה ${h}`,
  };
}

function linearSvg(m, b) {
  const W = 260;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2;
  const unit = 14; // פיקסלים ליחידה
  const fx = (x) => cx + x * unit;
  const fy = (y) => cy - y * unit;
  const x1 = -7;
  const x2 = 7;
  const y1 = m * x1 + b;
  const y2 = m * x2 + b;
  return {
    svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
  <line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="#94a3b8" stroke-width="1"/>
  <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="#94a3b8" stroke-width="1"/>
  <line x1="${fx(x1)}" y1="${fy(y1)}" x2="${fx(x2)}" y2="${fy(y2)}" stroke="#2563eb" stroke-width="2.5"/>
  <text x="${W - 12}" y="${cy - 6}" font-size="12" fill="#64748b">x</text>
  <text x="${cx + 6}" y="14" font-size="12" fill="#64748b">y</text>
</svg>`,
    alt: `גרף הקו f(x) = ${m}x + ${b}`,
  };
}

/* ---------- שעון ---------- */
function clockSvg(hour, minute = 0, showNumbers = false) {
  const cx = 100;
  const cy = 100;
  const r = 85;
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = cx + Math.cos(a) * (r - 10);
    const y1 = cy + Math.sin(a) * (r - 10);
    const x2 = cx + Math.cos(a) * r;
    const y2 = cy + Math.sin(a) * r;
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#94a3b8" stroke-width="2"/>`
    );
  }
  // מספרי השעון (1–12) — מוצגים בשאלות עם דקות
  const numbers = [];
  if (showNumbers) {
    for (let i = 1; i <= 12; i++) {
      const a = ((i * 30 - 90) * Math.PI) / 180;
      const nx = cx + Math.cos(a) * (r - 22);
      const ny = cy + Math.sin(a) * (r - 22);
      numbers.push(
        `<text x="${nx.toFixed(1)}" y="${(ny + 6).toFixed(1)}" text-anchor="middle" font-size="18" font-weight="700" fill="#334155">${i}</text>`
      );
    }
  }
  const ha = (((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI) / 180;
  const ma = ((minute * 6 - 90) * Math.PI) / 180;
  const hx = cx + Math.cos(ha) * (r * 0.5);
  const hy = cy + Math.sin(ha) * (r * 0.5);
  const mx = cx + Math.cos(ma) * (r * 0.78);
  const my = cy + Math.sin(ma) * (r * 0.78);
  return {
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#334155" stroke-width="3"/>
  ${ticks.join("\n  ")}
  ${numbers.join("\n  ")}
  <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="#0f172a"/>
</svg>`,
    alt: `שעון שמראה ${hour}:${String(minute).padStart(2, "0")}`,
  };
}

/* ---------- צורה גאומטרית (מצולע לא-סדיר לפי נקודות שמורות) ---------- */
const SHAPE_R = { s: 52, m: 64, l: 78 };
function shapeSvg(d) {
  const sides = d.sides;
  let pts;
  if (Array.isArray(d.points) && d.points.length >= 3) {
    pts = d.points;
  } else {
    // נפילה אחורה לנתונים ישנים — מצולע משוכלל
    const cx = 110;
    const cy = 88;
    const r = SHAPE_R[d.size] || SHAPE_R.m;
    pts = [];
    for (let i = 0; i < sides; i++) {
      const a = ((i * (360 / sides) - 90) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  const points = pts.map((pp) => `${Number(pp[0]).toFixed(1)},${Number(pp[1]).toFixed(1)}`).join(" ");
  return {
    svg: `<svg viewBox="0 0 220 175" xmlns="http://www.w3.org/2000/svg" role="img">
  <polygon points="${points}" fill="#ccfbf1" stroke="#0d9488" stroke-width="3" stroke-linejoin="round"/>
</svg>`,
    alt: `צורה עם ${sides} צלעות`,
  };
}

/* ---------- מטבעות (כסף) ---------- */
function coinsSvg(coins) {
  const colors = { 1: "#cbd5e1", 2: "#fcd34d", 5: "#fbbf24", 10: "#eab308" };
  const cols = Math.min(coins.length, 5);
  const rows = Math.ceil(coins.length / cols);
  const cell = 66;
  const W = cols * cell + 16;
  const H = rows * cell + 16;
  const circles = coins.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 8 + col * cell + cell / 2;
    const cy = 8 + row * cell + cell / 2;
    return `<g><circle cx="${cx}" cy="${cy}" r="27" fill="${colors[c] || "#fbbf24"}" stroke="#92400e" stroke-width="2"/><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="19" font-weight="700" fill="#78350f">${c}</text></g>`;
  });
  return {
    svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
  ${circles.join("\n  ")}
</svg>`,
    alt: `מטבעות: ${coins.join(", ")} שקלים`,
  };
}

/** מקבל תרגיל ומחזיר { svg, alt } או null. */
async function designerDiagram(problem) {
  const d = problem?.diagramData;
  if (!d) return null;
  if (d.type === "rect") return rectSvg(d.w, d.h);
  if (d.type === "linear") return linearSvg(d.m, d.b);
  if (d.type === "clock") return clockSvg(d.hour, d.minute || 0, !!d.showNumbers);
  if (d.type === "clock-set") return null; // אינטראקטיבי — נבנה בצד הלקוח
  if (d.type === "shape") return shapeSvg(d);
  if (d.type === "coins") return coinsSvg(d.coins || []);
  return null;
}

module.exports = { designerDiagram };
