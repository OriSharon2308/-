/* בונה HTML נקי וידידותי-Word מתוך ה-HTML של האתר (עמודה אחת, בלי סיידבר),
   ואז ממירים ל-.rtf עם textutil (docx משטח טבלאות עבריות — באג ב-textutil; RTF שומר הכל ונפתח ב-Word). שימוש:
     node docs/md2doc.js docs/נוהל-שיעור.html /tmp/word.html
     textutil -convert docx /tmp/word.html -output "docs/נוהל-שיעור.docx" */
const fs = require("fs");
const SRC = process.argv[2], OUT = process.argv[3];
const web = fs.readFileSync(SRC, "utf8");

// שולפים את גוף התוכן (בין <main class="content"> ל-</main>)
const m = web.match(/<main class="content">([\s\S]*?)<\/main>/);
let body = m ? m[1] : web;
// מכינים טבלאות ל-textutil: מסירים עוטף, מוסיפים border-attr (בלעדיו textutil משטח לטקסט), ומורידים thead/tbody
body = body
  .replace(/<div class="tw">/g, "")
  .replace(/<\/table><\/div>/g, "</table>")
  .replace(/<table>/g, '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">')
  .replace(/<\/?thead>/g, "")
  .replace(/<\/?tbody>/g, "");

const title = "נוהל השיעור של Vela";
const doc = `<!doctype html>
<html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{direction:rtl;text-align:right;font-family:"Assistant","Arial",sans-serif;font-size:12pt;color:#243b38;line-height:1.5}
  h1{font-size:20pt;color:#0f3b36;font-weight:bold;margin:20pt 0 6pt;border-bottom:2pt solid #0d9488;padding-bottom:3pt}
  h2{font-size:15pt;color:#0f3b36;font-weight:bold;margin:16pt 0 4pt}
  h3{font-size:13pt;color:#0b7d72;font-weight:bold;margin:12pt 0 3pt}
  h4{font-size:12pt;color:#243b38;font-weight:bold;margin:10pt 0 2pt}
  p{margin:6pt 0} strong{color:#0f3b36}
  ul,ol{margin:6pt 0} li{margin:3pt 0}
  blockquote{background:#f0faf8;border-right:3pt solid #0d9488;padding:6pt 12pt;margin:10pt 0}
  code{font-family:"Courier New",monospace;background:#eef5f3;color:#0a5b53;font-size:10.5pt}
  pre{font-family:"Courier New",monospace;background:#0f3b36;color:#d7f0ec;padding:8pt;font-size:10pt;direction:ltr;text-align:left}
  table{border-collapse:collapse;width:100%;font-size:11pt;margin:10pt 0}
  th,td{border:1pt solid #ccd9d6;padding:5pt 8pt;text-align:right;vertical-align:top}
  th{background:#e6f4f1;color:#0f3b36;font-weight:bold}
  hr{border:none;border-top:1pt solid #dce9e6}
</style></head>
<body>
<h1 style="border:none;font-size:24pt;color:#0d9488">${title}</h1>
<p style="color:#5c7570"><em>מסמך תכנון-אב · אזור הלמידה. מפת דרכים מלאה: זרימת השיעור, הוראת לוח-הכפל, זיכרון אנושי, חוויית הילד, ומפת בנייה — הכל מבוסס על הקוד האמיתי.</em></p>
<hr>
${body}
</body></html>`;
fs.writeFileSync(OUT, doc);
console.log("wrote " + OUT + " (" + Math.round(doc.length / 1024) + "KB)");
