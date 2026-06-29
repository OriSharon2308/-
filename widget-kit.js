/* widget-kit.js — גנרטורים של ווידג'טים אינטראקטיביים. כל פונקציה(params) מחזירה HTML עצמאי
   שמרונדר ב-iframe מבודד (sandbox+CSP). משוב הצלחה: parent.postMessage({type:'vela:correct'},'*'). */
(function (g) {
  g.VelaWidgets = {
  "fraction": function (p) {
  p = p || {};
  function ci(v, lo, hi, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return v < lo ? lo : v > hi ? hi : v; }
  var parts = ci(p.parts, 2, 12, 4), shaded0 = ci(p.shaded, 0, parts, 0), target = ci(p.target, 0, parts, 0);
  var shape = String(p.shape || "bar").toLowerCase(); if (["bar", "circle", "grid"].indexOf(shape) < 0) shape = "bar";
  var INK = "#0f3b36", topY = 42, pieces = "";
  if (shape === "bar") {
    var bx = 26, bw = 308, by = topY + 6, bh = 84, cw = bw / parts;
    for (var i = 0; i < parts; i++) pieces += '<rect class="c" data-i="' + i + '" x="' + (bx + i * cw).toFixed(1) + '" y="' + by + '" width="' + cw.toFixed(1) + '" height="' + bh + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
  } else if (shape === "circle") {
    var cx = 180, cy = topY + 56, r = 54;
    if (parts === 1) pieces += '<circle class="c" data-i="0" cx="180" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
    else for (var k = 0; k < parts; k++) {
      var a0 = (-90 + 360 / parts * k) * Math.PI / 180, a1 = (-90 + 360 / parts * (k + 1)) * Math.PI / 180, lg = (360 / parts > 180) ? 1 : 0;
      var d = "M180," + cy + " L" + (cx + r * Math.cos(a0)).toFixed(1) + "," + (cy + r * Math.sin(a0)).toFixed(1) + " A" + r + "," + r + " 0 " + lg + " 1 " + (cx + r * Math.cos(a1)).toFixed(1) + "," + (cy + r * Math.sin(a1)).toFixed(1) + " Z";
      pieces += '<path class="c" data-i="' + k + '" d="' + d + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
    }
  } else {
    var cols = Math.ceil(Math.sqrt(parts)), rows = Math.ceil(parts / cols), cs = Math.min(300 / cols, 104 / rows, 46);
    var gx = (360 - cs * cols) / 2, gy = topY + (110 - cs * rows) / 2, n = 0;
    for (var ry = 0; ry < rows && n < parts; ry++) for (var rx = 0; rx < cols && n < parts; rx++, n++)
      pieces += '<rect class="c" data-i="' + n + '" x="' + (gx + rx * cs).toFixed(1) + '" y="' + (gy + ry * cs).toFixed(1) + '" width="' + (cs - 4).toFixed(1) + '" height="' + (cs - 4).toFixed(1) + '" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="2"/>';
  }
  var lbl = p.label ? String(p.label).slice(0, 40).replace(/[<>&]/g, "") : "";
  return '<svg viewBox="0 0 360 220" width="100%" height="100%" style="display:block;touch-action:none">'
    + (lbl ? '<text x="180" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="' + INK + '">' + lbl + '</text>' : '')
    + '<g>' + pieces + '</g>'
    + '<text id="f" x="180" y="204" text-anchor="middle" font-size="26" font-weight="800" fill="' + INK + '"></text></svg>'
    + '<script>(function(){var P=' + parts + ',T=' + target + ',st=[],s=document.querySelector("svg"),ft=document.getElementById("f"),cs=[].slice.call(s.querySelectorAll(".c"));'
    + 'for(var i=0;i<P;i++)st[i]=i<' + shaded0 + ';'
    + 'function rn(){var n=0;for(var i=0;i<P;i++){cs[i].setAttribute("fill",st[i]?"#0d9488":"#fff");if(st[i])n++;}ft.textContent=n+" / "+P;'
    + 'if(T>0&&n===T){ft.setAttribute("fill","#22c55e");parent.postMessage({type:"vela:correct"},"*");}else{ft.setAttribute("fill","#0f3b36");}}'
    + 's.addEventListener("pointerdown",function(e){var t=e.target,i=t.getAttribute&&t.getAttribute("data-i");if(i==null)return;i=+i;st[i]=!st[i];rn();});rn();})();<\/script>';
},
  "count_objects": function(p){
  var clampInt = function(v, lo, hi, dflt){
    v = parseInt(v, 10);
    if (isNaN(v)) v = dflt;
    return Math.max(lo, Math.min(hi, v));
  };
  var left  = clampInt(p && p.left,  0, 10, 3);
  var right = clampInt(p && p.right, 0, 10, 2);
  var op = ((p && p.op === '-') || (p && p.op === '−')) ? '−' : '+';
  var allowed = { apple:1, star:1, balloon:1 };
  var item = (p && allowed[p.item]) ? p.item : 'apple';

  var W = 360, H = 220;

  function shapeApple(cx, cy, r){
    var s = r/14;
    return ''+
      '<g transform="translate('+cx+','+cy+') scale('+s+')">'+
        '<path d="M0,-9 C2,-13 7,-13 7,-8" fill="none" stroke="#7a4a1f" stroke-width="2.4" stroke-linecap="round"/>'+
        '<path d="M0,-10 C5,-15 12,-12 9,-6" fill="#3aa14a"/>'+
        '<path d="M-2,-7 C-9,-12 -14,-3 -11,6 C-9,13 -3,14 0,11 C3,14 9,13 11,6 C14,-3 9,-12 2,-7 C1,-7 -1,-7 -2,-7 Z" fill="#e23b3b"/>'+
        '<path d="M-6,-3 C-8,-1 -8,3 -6,6" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round"/>'+
      '</g>';
  }
  function shapeStar(cx, cy, r){
    var pts = [];
    for (var i=0;i<10;i++){
      var ang = -Math.PI/2 + i*Math.PI/5;
      var rad = (i%2===0) ? r : r*0.45;
      pts.push((cx+Math.cos(ang)*rad).toFixed(2)+','+(cy+Math.sin(ang)*rad).toFixed(2));
    }
    return '<polygon points="'+pts.join(' ')+'" fill="#f5b417" stroke="#d99400" stroke-width="1.5" stroke-linejoin="round"/>';
  }
  function shapeBalloon(cx, cy, r){
    return ''+
      '<g>'+
        '<path d="M'+cx+','+(cy+r*0.95)+' q '+(r*0.25)+','+(r*0.35)+' 0,'+(r*0.7)+'" fill="none" stroke="#0f3b36" stroke-width="1.2"/>'+
        '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(r*0.82)+'" ry="'+r+'" fill="#2bb3c0"/>'+
        '<polygon points="'+cx+','+(cy+r*0.95)+' '+(cx-3)+','+(cy+r*1.15)+' '+(cx+3)+','+(cy+r*1.15)+'" fill="#2bb3c0"/>'+
        '<ellipse cx="'+(cx-r*0.28)+'" cy="'+(cy-r*0.35)+'" rx="'+(r*0.18)+'" ry="'+(r*0.3)+'" fill="#ffffff" fill-opacity="0.55"/>'+
      '</g>';
  }
  var shapeFns = { apple: shapeApple, star: shapeStar, balloon: shapeBalloon };
  var drawShape = shapeFns[item];

  var total = left + right;
  var gap = 18;
  var signW = 30;
  var groupAreaW = (W - signW - gap*2 - 16) / 2;
  var pad = 8;

  function layoutGroup(count, ox, oy, gw, gh, idxBase){
    if (count <= 0) return { svg:'' };
    var cols = Math.ceil(Math.sqrt(count));
    var rows = Math.ceil(count / cols);
    var cellW = gw / cols, cellH = gh / rows;
    var r = Math.min(cellW, cellH) * 0.34;
    r = Math.max(7, Math.min(16, r));
    var out = '';
    for (var i=0;i<count;i++){
      var c = i % cols, rr = Math.floor(i / cols);
      var inRow = Math.min(cols, count - rr*cols);
      var rowOffset = (cols - inRow) * cellW / 2;
      var cx = ox + rowOffset + c*cellW + cellW/2;
      var cy = oy + rr*cellH + cellH/2;
      out += '<g class="obj" data-i="'+(idxBase+i)+'" tabindex="0" role="button" style="cursor:pointer">'+
               '<circle class="halo" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(r+5).toFixed(1)+'" fill="#22c55e" fill-opacity="0" />'+
               drawShape(cx, cy, r)+
               '<circle class="hit" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(r+6).toFixed(1)+'" fill="#000" fill-opacity="0" style="touch-action:none"/>'+
             '</g>';
    }
    return { svg: out };
  }

  var topY = 40;
  var groupH = 118;
  var leftOX = pad;
  var rightOX = pad + groupAreaW + gap + signW + gap;

  var gL = layoutGroup(left,  leftOX,  topY, groupAreaW, groupH, 0);
  var gR = layoutGroup(right, rightOX, topY, groupAreaW, groupH, left);

  var signX = pad + groupAreaW + gap + signW/2;
  var signY = topY + groupH/2;
  var signMarkup;
  if (op === '+'){
    signMarkup = '<g stroke="#0d9488" stroke-width="6" stroke-linecap="round">'+
      '<line x1="'+(signX-11)+'" y1="'+signY+'" x2="'+(signX+11)+'" y2="'+signY+'"/>'+
      '<line x1="'+signX+'" y1="'+(signY-11)+'" x2="'+signX+'" y2="'+(signY+11)+'"/></g>';
  } else {
    signMarkup = '<line x1="'+(signX-11)+'" y1="'+signY+'" x2="'+(signX+11)+'" y2="'+signY+'" stroke="#0d9488" stroke-width="6" stroke-linecap="round"/>';
  }

  var answer = (op === '+') ? (left + right) : (left - right);

  var html = ''+
'<style>'+
'*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}'+
'html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden;}'+
'.wrap{width:100%;height:100%;display:block;}'+
'.obj .halo{transition:fill-opacity .18s ease;}'+
'.obj.on .halo{fill-opacity:.85;}'+
'.obj:focus{outline:none;}'+
'.obj:focus .halo{fill:#0d9488;fill-opacity:.25;}'+
'.tap{font-size:11px;fill:#0f3b36;fill-opacity:.55;}'+
'.cnt{font-weight:700;}'+
'</style>'+
'<svg class="wrap" viewBox="0 0 '+W+' '+H+'" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block" xmlns="http://www.w3.org/2000/svg">'+
  '<rect x="0" y="0" width="'+W+'" height="'+H+'" rx="14" fill="#ffffff"/>'+
  '<rect x="2" y="2" width="'+(W-4)+'" height="'+(H-4)+'" rx="12" fill="none" stroke="#0d9488" stroke-opacity="0.18" stroke-width="2"/>'+
  '<rect x="'+(leftOX-4)+'" y="'+(topY-6)+'" width="'+(groupAreaW+8)+'" height="'+(groupH+12)+'" rx="12" fill="#0d9488" fill-opacity="0.06"/>'+
  '<rect x="'+(rightOX-4)+'" y="'+(topY-6)+'" width="'+(groupAreaW+8)+'" height="'+(groupH+12)+'" rx="12" fill="#0d9488" fill-opacity="0.06"/>'+
  '<text x="'+(leftOX+groupAreaW/2)+'" y="26" text-anchor="middle" class="cnt" font-size="16" fill="#0f3b36">'+left+'</text>'+
  '<text x="'+(rightOX+groupAreaW/2)+'" y="26" text-anchor="middle" class="cnt" font-size="16" fill="#0f3b36">'+right+'</text>'+
  gL.svg + gR.svg + signMarkup +
  '<line x1="14" y1="'+(topY+groupH+14)+'" x2="'+(W-14)+'" y2="'+(topY+groupH+14)+'" stroke="#0d9488" stroke-opacity="0.15" stroke-width="2"/>'+
  '<text x="18" y="'+(H-14)+'" text-anchor="start" class="tap">לחץ על הצורות כדי לספור</text>'+
  '<text id="eq" x="'+(W/2)+'" y="'+(H-12)+'" text-anchor="middle" font-size="22" font-weight="800" fill="#0d9488"></text>'+
'</svg>'+
'<script>(function(){'+
'  var marked={};'+
'  var eq=document.getElementById("eq");'+
'  function countOn(){var n=0;for(var k in marked){if(marked[k])n++;}return n;}'+
'  function toggle(g){'+ // כלי ספירה בלבד — לא שאלה. סימון מונה כמה נספרו; השאלה נכתבת על הלוח.
'    if(!g)return;'+
'    var i=g.getAttribute("data-i");'+
'    var on=!marked[i]; marked[i]=on;'+
'    if(on){g.classList.add("on");}else{g.classList.remove("on");}'+
'    var c=countOn(); if(eq){eq.textContent=c?String(c):"";}'+
'  }'+
'  var objs=document.querySelectorAll(".obj");'+
'  for(var j=0;j<objs.length;j++){(function(g){'+
'    g.addEventListener("pointerdown",function(ev){ev.preventDefault();toggle(g);});'+
'    g.addEventListener("keydown",function(ev){if(ev.key===" "||ev.key==="Enter"){ev.preventDefault();toggle(g);}});'+
'  })(objs[j]);}'+
'})();<\/script>';

  return html;
},
  "ten_frame": function (p) {
  p = p || {};
  function ci(v, lo, hi, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return v < lo ? lo : v > hi ? hi : v; }
  var cells = ci(p.cells, 1, 30, 10), perRow = ci(p.perRow, 1, 10, Math.min(5, cells));
  var filled0 = ci(p.filled, 0, cells, 0), target = ci(p.target, 0, cells, 0);
  var rows = Math.ceil(cells / perRow);
  var VBW = 360, VBH = 240, INK = "#0f3b36", TEAL = "#0d9488", OK = "#22c55e";
  var top = 22, bottomTxt = 34, availW = VBW - 40, availH = VBH - top - bottomTxt;
  var cs = Math.min(availW / perRow, availH / rows, 56);
  var gridW = cs * perRow, gridH = cs * rows;
  var gx = (VBW - gridW) / 2, gy = top + (availH - gridH) / 2;
  var cellsSvg = "";
  for (var idx = 0; idx < cells; idx++) {
    var rr = Math.floor(idx / perRow), cc = idx % perRow;
    var x = gx + cc * cs, y = gy + rr * cs;
    cellsSvg += '<rect class="cell" data-i="' + idx + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + cs.toFixed(1) + '" height="' + cs.toFixed(1) + '" rx="4" fill="#fff" stroke="' + TEAL + '" stroke-width="2"/>';
  }
  return '<svg viewBox="0 0 360 240" width="100%" height="100%" style="display:block;touch-action:none">'
    + '<g>' + cellsSvg + '</g>'
    + '<text id="ct" x="180" y="' + (VBH - 9) + '" text-anchor="middle" font-size="22" font-weight="800" fill="' + INK + '"></text></svg>'
    + '<script>(function(){var N=' + cells + ',T=' + target + ',st=[],cl=[].slice.call(document.querySelectorAll(".cell")),ct=document.getElementById("ct");'
    + 'for(var i=0;i<N;i++)st[i]=i<' + filled0 + ';'
    + 'function rn(){var n=0;for(var i=0;i<N;i++){cl[i].setAttribute("fill",st[i]?"' + TEAL + '":"#fff");if(st[i])n++;}ct.textContent=n;'
    + 'if(T>0&&n===T){ct.setAttribute("fill","' + OK + '");parent.postMessage({type:"vela:correct"},"*");}else{ct.setAttribute("fill","' + INK + '");}}'
    + 'document.querySelector("svg").addEventListener("pointerdown",function(e){var t=e.target,i=t.getAttribute&&t.getAttribute("data-i");if(i==null)return;i=+i;st[i]=!st[i];rn();});rn();})();<\/script>';
},
  "base_ten_builder": function(p){
  p = p || {};
  var target = Math.max(1, Math.min(999, Math.round(Number(p.target)||23)));

  var html = ''
+ '<svg viewBox="0 0 360 220" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;touch-action:none;-webkit-user-select:none;user-select:none" role="img" aria-label="בונה בסיס עשר">'
+ '<defs>'
+ '<pattern id="hatchH" width="10" height="10" patternUnits="userSpaceOnUse">'
+ '<rect width="10" height="10" fill="#0d9488"/><rect x="9.4" width="0.6" height="10" fill="#0a766c"/><rect y="9.4" width="10" height="0.6" fill="#0a766c"/>'
+ '</pattern>'
+ '</defs>'
+ '<rect x="0" y="0" width="360" height="220" fill="#ffffff"/>'
+ '<text x="12" y="20" font-size="13" font-weight="bold" fill="#0f3b36">בנו את המספר</text>'
+ '<rect x="6" y="28" width="92" height="186" rx="10" fill="#ecfdf8" stroke="#0d9488" stroke-width="1.5"/>'
+ '<text x="52" y="44" font-size="10" text-anchor="middle" fill="#0f3b36">פלטה</text>'
+ '<rect x="104" y="28" width="190" height="186" rx="10" fill="#f8fffd" stroke="#bfe8e0" stroke-width="1.5"/>'
+ '<text x="199" y="44" font-size="9.5" text-anchor="middle" fill="#5b8a82">גררו לכאן</text>'
+ '<rect x="300" y="28" width="54" height="186" rx="10" fill="#0d9488"/>'
+ '<text x="327" y="62" font-size="9" text-anchor="middle" fill="#bdf0e6">יעד</text>'
+ '<text x="327" y="80" font-size="18" font-weight="bold" text-anchor="middle" fill="#ffffff">'+target+'</text>'
+ '<line x1="310" y1="96" x2="344" y2="96" stroke="#3fbfae" stroke-width="1"/>'
+ '<text x="327" y="118" font-size="9" text-anchor="middle" fill="#bdf0e6">בנינו</text>'
+ '<text id="cur" x="327" y="140" font-size="20" font-weight="bold" text-anchor="middle" fill="#ffffff">0</text>'
+ '<g id="okBadge" style="display:none">'
+ '<circle cx="327" cy="178" r="15" fill="#22c55e"/>'
+ '<path d="M320 178 l5 5 l9 -11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
+ '</g>'
+ '<g id="resetBtn" style="cursor:pointer"><rect x="305" y="166" width="44" height="22" rx="6" fill="#0a766c"/><text x="327" y="181" font-size="9" text-anchor="middle" fill="#eafbf6">איפוס</text></g>'
+ '<g id="srcUnit" data-v="1" style="cursor:grab"><rect x="40" y="58" width="14" height="14" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/><text x="47" y="84" font-size="8.5" text-anchor="middle" fill="#0f3b36">1</text></g>'
+ '<g id="srcTen" data-v="10" style="cursor:grab"><rect x="44" y="102" width="9" height="50" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/>'
+ '<line x1="44" y1="112" x2="53" y2="112" stroke="#0a766c" stroke-width="0.7"/><line x1="44" y1="122" x2="53" y2="122" stroke="#0a766c" stroke-width="0.7"/><line x1="44" y1="132" x2="53" y2="132" stroke="#0a766c" stroke-width="0.7"/><line x1="44" y1="142" x2="53" y2="142" stroke="#0a766c" stroke-width="0.7"/>'
+ '<text x="48" y="166" font-size="8.5" text-anchor="middle" fill="#0f3b36">10</text></g>'
+ '<g id="srcHundred" data-v="100" style="cursor:grab"><rect x="33" y="176" width="34" height="34" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/><text x="50" y="197" font-size="9" font-weight="bold" text-anchor="middle" fill="#ffffff">100</text></g>'
+ '<g id="dropLayer"></g>'
+ '<g id="ghost" style="display:none;pointer-events:none"></g>'
+ '</svg>'
+ '<script>(function(){'
+ 'var TARGET='+target+';'
+ 'var svg=document.currentScript.parentNode.querySelector("svg");'
+ 'var SVGNS="http://www.w3.org/2000/svg";'
+ 'var dropLayer=svg.querySelector("#dropLayer");'
+ 'var ghost=svg.querySelector("#ghost");'
+ 'var curT=svg.querySelector("#cur");'
+ 'var okBadge=svg.querySelector("#okBadge");'
+ 'var resetBtn=svg.querySelector("#resetBtn");'
+ 'var total=0,done=false,seq=0;'
+ 'function pt(e){var r=svg.getBoundingClientRect();var sx=360/(r.width||1),sy=220/(r.height||1);return{x:(e.clientX-r.left)*sx,y:(e.clientY-r.top)*sy};}'
+ 'function shapeFor(v){'
+ '  if(v===1)return \'<rect width="14" height="14" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/>\';'
+ '  if(v===10)return \'<rect width="9" height="50" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/><line x1="0" y1="10" x2="9" y2="10" stroke="#0a766c" stroke-width="0.7"/><line x1="0" y1="20" x2="9" y2="20" stroke="#0a766c" stroke-width="0.7"/><line x1="0" y1="30" x2="9" y2="30" stroke="#0a766c" stroke-width="0.7"/><line x1="0" y1="40" x2="9" y2="40" stroke="#0a766c" stroke-width="0.7"/>\';'
+ '  return \'<rect width="34" height="34" rx="2" fill="url(#hatchH)" stroke="#0a766c" stroke-width="1"/><text x="17" y="21" font-size="9" font-weight="bold" text-anchor="middle" fill="#fff">100</text>\';'
+ '}'
+ 'function dims(v){return v===1?[14,14]:v===10?[9,50]:[34,34];}'
+ 'function post(t){try{parent.postMessage({type:t},"*");}catch(e){}}'
+ 'function render(){curT.textContent=total;'
+ '  if(total===TARGET&&!done){done=true;okBadge.style.display="";curT.setAttribute("fill","#bbf7d0");post("vela:correct");}'
+ '  else if(total!==TARGET&&done){done=false;okBadge.style.display="none";curT.setAttribute("fill","#ffffff");}'
+ '}'
+ 'var drag=null;'
+ 'function startDrag(v,e){'
+ '  e.preventDefault();'
+ '  var d=dims(v);'
+ '  ghost.innerHTML=shapeFor(v);ghost.style.display="";'
+ '  var pos=pt(e);'
+ '  drag={v:v,w:d[0],h:d[1],x:pos.x-d[0]/2,y:pos.y-d[1]/2};'
+ '  ghost.setAttribute("transform","translate("+drag.x+","+drag.y+")");'
+ '  try{svg.setPointerCapture(e.pointerId);}catch(_){}'
+ '}'
+ 'function inWork(x,y,w,h){return x>=104&&y>=46&&(x+w)<=294&&(y+h)<=214;}'
+ 'svg.addEventListener("pointermove",function(e){'
+ '  if(!drag)return;e.preventDefault();var pos=pt(e);'
+ '  drag.x=pos.x-drag.w/2;drag.y=pos.y-drag.h/2;'
+ '  ghost.setAttribute("transform","translate("+drag.x+","+drag.y+")");'
+ '});'
+ 'function endDrag(e){'
+ '  if(!drag)return;'
+ '  var cx=Math.max(104,Math.min(294-drag.w,drag.x));'
+ '  var cy=Math.max(46,Math.min(214-drag.h,drag.y));'
+ '  if(inWork(drag.x,drag.y,drag.w,drag.h)){'
+ '    if(total+drag.v<=999){'
+ '      var g=document.createElementNS(SVGNS,"g");'
+ '      g.setAttribute("transform","translate("+cx+","+cy+")");'
+ '      g.setAttribute("data-v",drag.v);g.setAttribute("data-id",++seq);'
+ '      g.style.cursor="pointer";'
+ '      g.innerHTML=shapeFor(drag.v);'
+ '      g.addEventListener("pointerdown",function(ev){ev.stopPropagation();removeBlock(g,parseInt(g.getAttribute("data-v"),10));});'
+ '      dropLayer.appendChild(g);'
+ '      total+=drag.v;render();'
+ '      if(total>TARGET)post("vela:wrong");'
+ '    }'
+ '  }'
+ '  ghost.style.display="none";ghost.innerHTML="";drag=null;'
+ '}'
+ 'function removeBlock(g,v){if(drag)return;if(g.parentNode)g.parentNode.removeChild(g);total-=v;if(total<0)total=0;render();}'
+ 'svg.addEventListener("pointerup",endDrag);'
+ 'svg.addEventListener("pointercancel",function(){if(drag){ghost.style.display="none";ghost.innerHTML="";drag=null;}});'
+ 'svg.querySelector("#srcUnit").addEventListener("pointerdown",function(e){startDrag(1,e);});'
+ 'svg.querySelector("#srcTen").addEventListener("pointerdown",function(e){startDrag(10,e);});'
+ 'svg.querySelector("#srcHundred").addEventListener("pointerdown",function(e){startDrag(100,e);});'
+ 'resetBtn.addEventListener("pointerdown",function(e){e.stopPropagation();while(dropLayer.firstChild)dropLayer.removeChild(dropLayer.firstChild);total=0;done=false;okBadge.style.display="none";curT.setAttribute("fill","#ffffff");render();});'
+ 'render();'
+ '})();</script>';
  return html;
},
  "mult_array": function(p){
  function clampInt(v, lo, hi, dflt){
    v = parseInt(v, 10);
    if (isNaN(v)) v = dflt;
    if (v < lo) v = lo;
    if (v > hi) v = hi;
    return v;
  }
  var maxRows = clampInt(p && p.maxRows, 1, 10, 10);
  var maxCols = clampInt(p && p.maxCols, 1, 10, 10);
  var targetRows = clampInt(p && p.targetRows, 1, maxRows, Math.min(3, maxRows));
  var targetCols = clampInt(p && p.targetCols, 1, maxCols, Math.min(4, maxCols));

  var VB_W = 360, VB_H = 240;

  var gridTop = 16, gridBottomMax = 196;
  var gridW = 312;
  var cellW = gridW / maxCols;
  var availH = gridBottomMax - gridTop;
  var cellH = availH / maxRows;
  var cell = Math.min(cellW, cellH);
  var totalGW = cell * maxCols, totalGH = cell * maxRows;
  var ox = (VB_W - totalGW) / 2;
  var oyBottom = gridTop + availH;
  var r = Math.max(3, cell * 0.30);

  var dots = '';
  for (var row = 0; row < maxRows; row++){
    for (var col = 0; col < maxCols; col++){
      var cx = ox + col * cell + cell / 2;
      var cy = oyBottom - row * cell - cell / 2;
      dots += '<circle class="dot" data-row="'+row+'" data-col="'+col+'" cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="'+r.toFixed(2)+'"/>';
    }
  }

  var data = {
    maxRows: maxRows, maxCols: maxCols,
    targetRows: targetRows, targetCols: targetCols,
    ox: ox, oyBottom: oyBottom, cell: cell, vbw: VB_W, vbh: VB_H
  };
  var dataJson = JSON.stringify(data);

  var html =
'<style>'+
'*{box-sizing:border-box}'+
'html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}'+
'.dot{fill:#cfe9e6;stroke:#9fd3cd;stroke-width:1;transition:fill .08s}'+
'.dot.on{fill:#0d9488;stroke:#0b7a70}'+
'.sel{fill:rgba(34,197,94,0.16);stroke:#22c55e;stroke-width:2.5}'+
'.hint{fill:#0f3b36;opacity:.55}'+
'.bigtxt{fill:#0f3b36;font-weight:800}'+
'.eq{fill:#16a34a;font-weight:800}'+
'.win .sel{fill:rgba(34,197,94,0.32);stroke:#16a34a;stroke-width:3}'+
'.win .dot.on{fill:#16a34a;stroke:#15803d}'+
'</style>'+
'<svg id="vroot" viewBox="0 0 '+VB_W+' '+VB_H+'" width="100%" height="100%" style="display:block;touch-action:none" xmlns="http://www.w3.org/2000/svg">'+
  '<text x="'+(VB_W/2)+'" y="13" text-anchor="middle" font-size="11" class="hint" id="prompt">סמן/י מלבן של '+targetRows+' שורות על '+targetCols+' עמודות</text>'+
  '<g id="dots">'+dots+'</g>'+
  '<rect id="selrect" class="sel" x="0" y="0" width="0" height="0" rx="6" visibility="hidden"/>'+
  '<text id="label" x="'+(VB_W/2)+'" y="221" text-anchor="middle" font-size="20" class="bigtxt">1 × 1 = 1</text>'+
  '<text id="result" x="'+(VB_W/2)+'" y="236" text-anchor="middle" font-size="12" class="eq"></text>'+
  '<rect id="hit" x="0" y="0" width="'+VB_W+'" height="'+VB_H+'" fill="transparent" style="touch-action:none"/>'+
'</svg>'+
'<script>'+
'(function(){'+
  'var D='+dataJson+';'+
  'var svg=document.getElementById("vroot");'+
  'var hit=document.getElementById("hit");'+
  'var sel=document.getElementById("selrect");'+
  'var label=document.getElementById("label");'+
  'var result=document.getElementById("result");'+
  'var dots=Array.prototype.slice.call(document.querySelectorAll(".dot"));'+
  'var solved=false,dragging=false,curR=1,curC=1;'+
  'function pt(ev){'+
    'var rect=svg.getBoundingClientRect();'+
    'if(!rect.width||!rect.height)return{x:0,y:0};'+
    'var x=(ev.clientX-rect.left)/rect.width*D.vbw;'+
    'var y=(ev.clientY-rect.top)/rect.height*D.vbh;'+
    'return {x:x,y:y};'+
  '}'+
  'function colsFromX(x){'+
    'var c=Math.ceil((x-D.ox)/D.cell);'+
    'if(c<1)c=1;if(c>D.maxCols)c=D.maxCols;return c;'+
  '}'+
  'function rowsFromY(y){'+
    'var rr=Math.ceil((D.oyBottom-y)/D.cell);'+
    'if(rr<1)rr=1;if(rr>D.maxRows)rr=D.maxRows;return rr;'+
  '}'+
  'function render(rows,cols){'+
    'curR=rows;curC=cols;'+
    'var x=D.ox;'+
    'var w=cols*D.cell;'+
    'var h=rows*D.cell;'+
    'var y=D.oyBottom-h;'+
    'sel.setAttribute("x",x.toFixed(2));sel.setAttribute("y",y.toFixed(2));'+
    'sel.setAttribute("width",w.toFixed(2));sel.setAttribute("height",h.toFixed(2));'+
    'sel.setAttribute("visibility","visible");'+
    'for(var i=0;i<dots.length;i++){'+
      'var dr=+dots[i].getAttribute("data-row");'+
      'var dc=+dots[i].getAttribute("data-col");'+
      'if(dr<rows&&dc<cols)dots[i].classList.add("on");else dots[i].classList.remove("on");'+
    '}'+
    'if(!solved){label.textContent=rows+" \\u00D7 "+cols+" = "+(rows*cols);result.textContent="";}'+
  '}'+
  'function check(){}'+ // כלי בלבד — בלי "בדיקה"/ניצחון. הילד בוחר ריבוע ורואה rows×cols=מכפלה; השאלה נכתבת על הלוח.
  'function down(ev){'+
    'if(solved)return;'+
    'ev.preventDefault();dragging=true;'+
    'try{hit.setPointerCapture(ev.pointerId);}catch(e){}'+
    'var pp=pt(ev);render(rowsFromY(pp.y),colsFromX(pp.x));'+
  '}'+
  'function move(ev){'+
    'if(solved||!dragging)return;'+
    'ev.preventDefault();'+
    'var pp=pt(ev);render(rowsFromY(pp.y),colsFromX(pp.x));'+
  '}'+
  'function up(ev){'+
    'if(solved)return;'+
    'ev.preventDefault();dragging=false;'+
    'try{hit.releasePointerCapture(ev.pointerId);}catch(e){}'+
    'check();'+
  '}'+
  'hit.addEventListener("pointerdown",down);'+
  'hit.addEventListener("pointermove",move);'+
  'hit.addEventListener("pointerup",up);'+
  'hit.addEventListener("pointercancel",function(){dragging=false;});'+
  'render(1,1);'+
'})();'+
'<\/script>';
  return html;
},
  "mult_table": function(p){
  // ---- params: clamp & defaults ----
  var max = Math.max(2, Math.min(12, Math.round((p&&p.max)||10)));
  var N = max*max;
  // build set of hidden cells (1-based r,c in 1..max)
  var hidden = {};
  function key(r,c){ return r+'x'+c; }
  var hp = p && p.hide;
  if (Array.isArray(hp)) {
    for (var i=0;i<hp.length;i++){
      var pair = hp[i];
      if (Array.isArray(pair) && pair.length>=2){
        var r = Math.round(pair[0]), c = Math.round(pair[1]);
        if (r>=1 && r<=max && c>=1 && c<=max) hidden[key(r,c)] = true;
      }
    }
  } else {
    var cnt = Math.round(hp);
    if (!isFinite(cnt) || cnt<=0) cnt = Math.min(6, N);
    cnt = Math.max(1, Math.min(N, cnt));
    var picked = 0, guard = 0;
    while (picked < cnt && guard < N*40){
      guard++;
      var rr = 1 + Math.floor(Math.random()*max);
      var cc = 1 + Math.floor(Math.random()*max);
      var k = key(rr,cc);
      if (!hidden[k]){ hidden[k] = true; picked++; }
    }
  }

  // ---- internal fixed viewBox ----
  var VB_W = 360, VB_H = 360;
  var pad = 8;
  var titleH = 30;
  var gridX = pad, gridY = pad + titleH;
  var gridW = VB_W - pad*2;
  var gridH = VB_H - gridY - pad;
  var cols = max + 1, rows = max + 1;
  var cw = gridW / cols, ch = gridH / rows;

  var TURQ = '#0d9488', INK = '#0f3b36', OK = '#22c55e', BAD = '#ef4444';

  var svg = '';
  svg += '<rect x="'+gridX+'" y="'+gridY+'" width="'+gridW+'" height="'+gridH+'" rx="10" fill="#ffffff" stroke="'+TURQ+'" stroke-width="2"/>';

  function fmt(n){ return (Math.round(n*100)/100); }

  for (var ri=0; ri<rows; ri++){
    for (var ci=0; ci<cols; ci++){
      var x = gridX + ci*cw, y = gridY + ri*ch;
      var cx = x + cw/2, cy = y + ch/2;
      var isCorner = (ri===0 && ci===0);
      var isHeaderR = (ri===0 && ci>0);
      var isHeaderC = (ci===0 && ri>0);
      if (isCorner){
        svg += '<rect x="'+fmt(x)+'" y="'+fmt(y)+'" width="'+fmt(cw)+'" height="'+fmt(ch)+'" rx="8" fill="'+TURQ+'"/>';
        svg += '<text x="'+fmt(cx)+'" y="'+fmt(cy)+'" fill="#ffffff" font-size="16" font-weight="700" text-anchor="middle" dominant-baseline="central">×</text>';
        continue;
      }
      if (isHeaderR || isHeaderC){
        var hv = isHeaderR ? ci : ri;
        svg += '<rect x="'+fmt(x)+'" y="'+fmt(y)+'" width="'+fmt(cw)+'" height="'+fmt(ch)+'" fill="'+TURQ+'" fill-opacity="0.12"/>';
        svg += '<text x="'+fmt(cx)+'" y="'+fmt(cy)+'" fill="'+TURQ+'" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="central">'+hv+'</text>';
        continue;
      }
      var r = ri, c = ci;
      var val = r*c;
      var isHidden = !!hidden[key(r,c)];
      svg += '<rect x="'+fmt(x)+'" y="'+fmt(y)+'" width="'+fmt(cw)+'" height="'+fmt(ch)+'" fill="#ffffff" stroke="#d9efeb" stroke-width="1"/>';
      if (!isHidden){
        svg += '<text x="'+fmt(cx)+'" y="'+fmt(cy)+'" fill="'+INK+'" font-size="12" text-anchor="middle" dominant-baseline="central">'+val+'</text>';
      } else {
        var ix = x+1.5, iy = y+1.5, iw = cw-3, ih = ch-3;
        svg += '<rect class="slot" data-k="'+r+'x'+c+'" x="'+fmt(ix)+'" y="'+fmt(iy)+'" width="'+fmt(iw)+'" height="'+fmt(ih)+'" rx="6" fill="#fff8e6" stroke="#f0b429" stroke-width="1.5"/>';
        var fx = ix+2, fy = iy+2, fw = iw-4, fh = ih-4;
        svg += '<foreignObject x="'+fmt(fx)+'" y="'+fmt(fy)+'" width="'+fmt(fw)+'" height="'+fmt(fh)+'">'
            + '<input xmlns="http://www.w3.org/1999/xhtml" class="cell-in" data-k="'+r+'x'+c+'" data-v="'+val+'" inputmode="numeric" type="text" '
            + 'aria-label="'+r+' כפול '+c+'" />'
            + '</foreignObject>';
      }
    }
  }

  var titleTxt = 'לוח הכפל — מלאו את החסר';

  var html = ''
  + '<style>'
  + '*{box-sizing:border-box}'
  + 'html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden}'
  + '.wrap{width:100%;height:100%;display:block}'
  + 'svg{display:block;width:100%;height:100%;touch-action:none}'
  + '.cell-in{width:100%;height:100%;border:0;outline:0;background:transparent;'
  +   'text-align:center;font-size:13px;font-weight:700;color:'+INK+';'
  +   'font-family:inherit;padding:0;-webkit-appearance:none;appearance:none;touch-action:none}'
  + '.cell-in:focus{background:rgba(13,148,136,0.08);border-radius:5px}'
  + '.cell-in.ok{color:'+OK+'}'
  + '.cell-in.bad{color:'+BAD+'}'
  + '.titlebar{fill:'+INK+';font-size:14px;font-weight:800}'
  + '</style>'
  + '<div class="wrap">'
  + '<svg viewBox="0 0 '+VB_W+' '+VB_H+'" width="100%" height="100%" style="display:block" preserveAspectRatio="xMidYMid meet">'
  +   '<text x="'+(VB_W/2)+'" y="'+(pad+16)+'" class="titlebar" text-anchor="middle" dominant-baseline="central">'+titleTxt+'</text>'
  +   svg
  +   '<g id="winBadge" style="display:none">'
  +     '<rect x="'+(VB_W/2-72)+'" y="'+(VB_H/2-26)+'" width="144" height="52" rx="14" fill="'+OK+'"/>'
  +     '<text x="'+(VB_W/2)+'" y="'+(VB_H/2)+'" fill="#ffffff" font-size="20" font-weight="800" text-anchor="middle" dominant-baseline="central">כל הכבוד! ✓</text>'
  +   '</g>'
  + '</svg>'
  + '</div>'
  + '<script>'
  + '(function(){'
  + '  function post(t){ try{ parent.postMessage({type:t},"*"); }catch(e){} }'
  + '  var inputs = Array.prototype.slice.call(document.querySelectorAll(".cell-in"));'
  + '  var total = inputs.length;'
  + '  var solvedSet = {};'
  + '  var done = false;'
  + '  function norm(s){ return (s||"").replace(/[^0-9]/g,""); }'
  + '  function updateSlot(k,state){'
  + '    var slot = document.querySelector(\'.slot[data-k="\'+k+\'"]\');'
  + '    if(!slot) return;'
  + '    if(state==="ok"){ slot.setAttribute("fill","rgba(34,197,94,0.16)"); slot.setAttribute("stroke","'+OK+'"); }'
  + '    else if(state==="bad"){ slot.setAttribute("fill","rgba(239,68,68,0.12)"); slot.setAttribute("stroke","'+BAD+'"); }'
  + '    else { slot.setAttribute("fill","#fff8e6"); slot.setAttribute("stroke","#f0b429"); }'
  + '  }'
  + '  function maybeWin(){'
  + '    if(done) return;'
  + '    var n=0; for(var k in solvedSet){ if(solvedSet.hasOwnProperty(k)) n++; }'
  + '    if(total>0 && n>=total){'
  + '      done=true;'
  + '      var b=document.getElementById("winBadge"); if(b) b.style.display="";'
  + '      post("vela:correct");'
  + '    }'
  + '  }'
  + '  function check(inp, announce){'
  + '    var raw = norm(inp.value);'
  + '    inp.classList.remove("ok","bad");'
  + '    var k = inp.getAttribute("data-k");'
  + '    if(raw===""){ delete solvedSet[k]; updateSlot(k,"clear"); maybeWin(); return; }'
  + '    var want = parseInt(inp.getAttribute("data-v"),10);'
  + '    var got = parseInt(raw,10);'
  + '    if(got===want){'
  + '      inp.classList.add("ok"); solvedSet[k]=true; updateSlot(k,"ok");'
  + '    } else {'
  + '      inp.classList.add("bad"); delete solvedSet[k]; updateSlot(k,"bad");'
  + '      if(announce) post("vela:wrong");'
  + '    }'
  + '    maybeWin();'
  + '  }'
  + '  inputs.forEach(function(inp){'
  + '    inp.addEventListener("input", function(){ check(inp,false); });'
  + '    inp.addEventListener("blur", function(){ check(inp,true); });'
  + '    inp.addEventListener("keydown", function(ev){ if(ev.key==="Enter"){ ev.preventDefault(); check(inp,true); inp.blur(); } });'
  + '  });'
  + '})();'
  + '</script>';

  return html;
}
  };
})(typeof window !== "undefined" ? window : this);
