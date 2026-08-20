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
+ ''
+ '<rect x="6" y="28" width="92" height="186" rx="10" fill="#ecfdf8" stroke="#0d9488" stroke-width="1.5"/>'
+ ''
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
},
  "clock_interactive": function (p) {
    p = p || {};
    function ci(v, lo, hi, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return v < lo ? lo : v > hi ? hi : v; }
    var hour = ci(p.hour, 0, 23, 3) % 12, minute = ci(p.minute, 0, 59, 0);
    var INK = "#0f3b36", TEAL = "#0d9488", cx = 150, cy = 145, R = 108;
    var nums = "";
    for (var i = 1; i <= 12; i++) { var a = (i * 30 - 90) * Math.PI / 180, nx = cx + (R - 22) * Math.cos(a), ny = cy + (R - 22) * Math.sin(a); nums += '<text x="' + nx.toFixed(1) + '" y="' + (ny + 7).toFixed(1) + '" text-anchor="middle" font-size="19" font-weight="700" fill="' + INK + '">' + i + '</text>'; }
    var ticks = "";
    for (var t = 0; t < 60; t++) { var ta = (t * 6 - 90) * Math.PI / 180, big = t % 5 === 0, r1 = R - (big ? 10 : 5); ticks += '<line x1="' + (cx + r1 * Math.cos(ta)).toFixed(1) + '" y1="' + (cy + r1 * Math.sin(ta)).toFixed(1) + '" x2="' + (cx + R * Math.cos(ta)).toFixed(1) + '" y2="' + (cy + R * Math.sin(ta)).toFixed(1) + '" stroke="' + (big ? TEAL : "#bcdcd8") + '" stroke-width="' + (big ? 2.5 : 1) + '"/>'; }
    return '<svg viewBox="0 0 300 300" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<circle cx="150" cy="145" r="' + R + '" fill="#fff" stroke="' + TEAL + '" stroke-width="3"/>' + ticks + nums
      + '<line id="hh" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>'
      + '<line id="mh" stroke="' + TEAL + '" stroke-width="5" stroke-linecap="round"/>'
      + '<circle cx="150" cy="145" r="6" fill="' + INK + '"/>'
      + '<text id="dg" x="150" y="288" text-anchor="middle" font-size="26" font-weight="800" fill="' + INK + '"></text></svg>'
      + '<script>(function(){var CX=150,CY=145,H=' + hour + ',M=' + minute + ',NS="http://www.w3.org/2000/svg";'
      + 'var s=document.querySelector("svg"),hh=document.getElementById("hh"),mh=document.getElementById("mh"),dg=document.getElementById("dg"),drag=null;'
      + 'function pt(a,len){return {x:CX+len*Math.cos((a-90)*Math.PI/180),y:CY+len*Math.sin((a-90)*Math.PI/180)};}'
      + 'function rn(){var ma=M*6,ha=(H%12)*30+M*0.5;var mp=pt(ma,82),hp=pt(ha,56);mh.setAttribute("x1",CX);mh.setAttribute("y1",CY);mh.setAttribute("x2",mp.x.toFixed(1));mh.setAttribute("y2",mp.y.toFixed(1));hh.setAttribute("x1",CX);hh.setAttribute("y1",CY);hh.setAttribute("x2",hp.x.toFixed(1));hh.setAttribute("y2",hp.y.toFixed(1));var hd=H%12;if(hd===0)hd=12;dg.textContent=hd+":"+(M<10?"0"+M:M);}'
      + 'function ang(e){var r=s.getBoundingClientRect();var x=(e.clientX-r.left)*(300/r.width)-CX,y=(e.clientY-r.top)*(300/r.height)-CY;var d=Math.atan2(x,-y)*180/Math.PI;return (d+360)%360;}'
      + 'function which(e){var a=ang(e),md=Math.min((a-M*6+540)%360,(M*6-a+540)%360),ha=((H%12)*30+M*0.5),hd=Math.min((a-ha+540)%360,(ha-a+540)%360);return hd<md?"h":"m";}'
      + 's.addEventListener("pointerdown",function(e){e.preventDefault();drag=which(e);try{s.setPointerCapture(e.pointerId);}catch(_){}});' // בוחר מחוג; זז רק בגרירה (לא בנגיעה)
      + 's.addEventListener("pointermove",function(e){if(!drag)return;e.preventDefault();set(e);});'
      + 's.addEventListener("pointerup",function(){drag=null;});s.addEventListener("pointercancel",function(){drag=null;});'
      + 'function set(e){var a=ang(e);if(drag==="m"){M=Math.round(a/6)%60;}else{var hf=a/30;H=Math.floor(hf)%12;M=Math.round((hf-Math.floor(hf))*60)%60;}rn();}' // מחוג-שעה: זמן רציף מהזווית (שעה+דקות משתמעות) → המחוג עוקב חלק אחרי הסמן, בלי קפיצות
      + 'rn();})();<\/script>';
  },
  "money_coins": function (p) {
  p = p || {};
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  var target = Math.max(0, Math.round(num(p.target, 0))); // הסכום שהילד צריך לבנות (0 = חקירה חופשית, בלי בדיקה)
  var INK = "#0f3b36", TEAL = "#0d9488";
  // מטבעות/שטרות עם גודל יחסי — ערך גבוה = גדול יותר (כמו במציאות)
  var DEN = {
    1: { r: 16, f: "#d8c98f", e: "#a98f3e" },
    2: { r: 19, f: "#e7cf93", e: "#b5933f" },
    5: { r: 22, f: "#cdbe85", e: "#9c8136" },
    10: { r: 25, f: "#e0c25c", e: "#a8842a" },
    20: { bill: 1, w: 56, h: 32, f: "#a7d3c9", e: "#3f8d7f" },
    50: { bill: 1, w: 60, h: 34, f: "#c2b2d8", e: "#6f5a9a" }
  };
  return '<svg viewBox="0 0 380 300" width="100%" height="100%" style="display:block;touch-action:none">'
    + '<text x="190" y="17" text-anchor="middle" font-size="13.5" font-weight="700" fill="' + INK + '">' + (target > 0 ? 'גררו ' + target + ' ₪ לארנק' : 'גררו מטבעות לארנק') + '</text>'
    + '<g id="pal"></g>'
    + '<rect x="18" y="84" width="344" height="138" rx="14" fill="rgba(13,148,136,0.05)" stroke="' + TEAL + '" stroke-width="2" stroke-dasharray="7 6"/>'
    + '<text id="hint" x="190" y="158" text-anchor="middle" font-size="13" fill="#9bb3ae" style="pointer-events:none">כאן הארנק — גררו לכאן</text>'
    + '<g id="tray"></g>'
    + '<text id="tot" x="22" y="252" font-size="20" font-weight="800" fill="' + INK + '">סך״כ: 0 ₪</text>'
    + '<g id="chk" style="cursor:pointer"><rect x="246" y="234" width="116" height="34" rx="17" fill="' + TEAL + '"/><text x="304" y="256" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" style="pointer-events:none">בדוק</text></g>'
    + '<text id="res" x="22" y="286" font-size="15" font-weight="800" fill="' + INK + '"></text>'
    + '</svg>'
    + '<script>(function(){'
    + 'var DEN=' + JSON.stringify(DEN) + ',TARGET=' + target + ',NSV="http://www.w3.org/2000/svg";'
    + 'var svg=document.querySelector("svg"),pal=document.getElementById("pal"),tray=document.getElementById("tray"),tot=document.getElementById("tot"),res=document.getElementById("res"),hint=document.getElementById("hint");'
    + 'var TRAY={x:18,y:84,w:344,h:138},placed=[],idc=0,ghost=null,gv=0;'
    + 'function el(tag,a){var e=document.createElementNS(NSV,tag);for(var k in a)e.setAttribute(k,a[k]);return e;}'
    + 'function mk(v,cx,cy){var d=DEN[v],g=el("g",{});'
    + 'if(d.bill){g.appendChild(el("rect",{x:cx-d.w/2,y:cy-d.h/2,width:d.w,height:d.h,rx:5,fill:d.f,stroke:d.e,"stroke-width":2}));}'
    + 'else{g.appendChild(el("circle",{cx:cx,cy:cy,r:d.r,fill:d.f,stroke:d.e,"stroke-width":2}));}'
    + 'var t=el("text",{x:cx,y:cy+(d.bill?6:5),"text-anchor":"middle","font-size":(d.bill||d.r>20?15:12),"font-weight":800,fill:"#0f3b36",style:"pointer-events:none"});t.textContent=v;g.appendChild(t);return g;}'
    + 'var order=[1,2,5,10,20,50],gx=24;'
    + 'order.forEach(function(v){var d=DEN[v],w=d.bill?d.w:d.r*2,g=mk(v,gx+w/2,48);g.setAttribute("class","src");g.setAttribute("data-v",v);g.style.cursor="grab";pal.appendChild(g);gx+=w+12;});'
    + 'function toVB(e){var r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)*(380/r.width),y:(e.clientY-r.top)*(300/r.height)};}'
    + 'function inTray(q){return q.x>=TRAY.x&&q.x<=TRAY.x+TRAY.w&&q.y>=TRAY.y&&q.y<=TRAY.y+TRAY.h;}'
    + 'function sum(){var s=0;for(var i=0;i<placed.length;i++)s+=placed[i].v;return s;}'
    + 'function rn(){while(tray.firstChild)tray.removeChild(tray.firstChild);placed.forEach(function(c){var g=mk(c.v,c.x,c.y);g.setAttribute("class","pc");g.setAttribute("data-id",c.id);g.style.cursor="pointer";tray.appendChild(g);});tot.textContent="\\u05E1\\u05DA\\u05F4\\u05DB: "+sum()+" \\u20AA";if(hint)hint.style.opacity=placed.length?0:1;}'
    + 'function ghostAt(q){var ng=mk(gv,q.x,q.y);ng.setAttribute("pointer-events","none");ng.setAttribute("opacity","0.85");if(ghost){svg.replaceChild(ng,ghost);}else{svg.appendChild(ng);}ghost=ng;}'
    + 'svg.addEventListener("pointerdown",function(e){var t=e.target;var pc=t.closest?t.closest(".pc"):null;if(pc){var id=+pc.getAttribute("data-id");placed=placed.filter(function(c){return c.id!==id;});rn();return;}'
    + 'var src=t.closest?t.closest(".src"):null;if(!src||e.isPrimary===false)return;e.preventDefault();gv=+src.getAttribute("data-v");ghostAt(toVB(e));try{svg.setPointerCapture(e.pointerId);}catch(_){}});'
    + 'svg.addEventListener("pointermove",function(e){if(!ghost)return;e.preventDefault();ghostAt(toVB(e));});'
    + 'svg.addEventListener("pointerup",function(e){if(!ghost)return;var q=toVB(e);if(inTray(q)){var d=DEN[gv],hw=d.bill?d.w/2:d.r,hh=d.bill?d.h/2:d.r;var cx=Math.max(TRAY.x+hw+2,Math.min(TRAY.x+TRAY.w-hw-2,q.x)),cy=Math.max(TRAY.y+hh+2,Math.min(TRAY.y+TRAY.h-hh-2,q.y));placed.push({id:++idc,v:gv,x:cx,y:cy});rn();}svg.removeChild(ghost);ghost=null;});'
    + 'svg.addEventListener("pointercancel",function(){if(ghost){svg.removeChild(ghost);ghost=null;}});'
    + 'function endDrag(){if(ghost){try{svg.removeChild(ghost);}catch(_){}ghost=null;}}window.addEventListener("pointerup",endDrag);window.addEventListener("pointercancel",endDrag);' // גיבוי ניקוי אם השחרור מחוץ ל-svg ולכידה נכשלה
    + 'document.getElementById("chk").addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();var s=sum();if(TARGET>0){if(s===TARGET){res.setAttribute("fill","#22c55e");res.textContent="\\u05E0\\u05DB\\u05D5\\u05DF! \\u2713";try{parent.postMessage({type:"vela:correct"},"*");}catch(_){}}else{res.setAttribute("fill","#ef4444");res.textContent=(s>TARGET?"\\u05D9\\u05D5\\u05EA\\u05E8 \\u05DE\\u05D3\\u05D9":"\\u05D7\\u05E1\\u05E8 \\u05E2\\u05D5\\u05D3")+" ("+s+"/"+TARGET+")";try{parent.postMessage({type:"vela:wrong"},"*");}catch(_){}}}else{res.setAttribute("fill","#0f3b36");res.textContent=s+" \\u20AA";}});'
    + 'rn();})();<\/script>';
},
  "hundred_chart": function (p) {
    p = p || {};
    function ci(v, lo, hi, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return v < lo ? lo : v > hi ? hi : v; }
    var start = (p.start === 0 || p.start === "0") ? 0 : 1, skip = ci(p.skip, 0, 12, 0);
    var INK = "#0f3b36", TEAL = "#0d9488", cell = 28, gx = 10, gy = 10, cells = "", pre = [];
    for (var r = 0; r < 10; r++) for (var c = 0; c < 10; c++) {
      var n = start + r * 10 + c, x = gx + c * cell, y = gy + r * cell, hot = skip > 0 && n > 0 && n % skip === 0;
      if (hot) pre.push(n);
      cells += '<g class="cl" data-n="' + n + '" style="cursor:pointer">'
        + '<rect x="' + x + '" y="' + y + '" width="' + (cell - 2) + '" height="' + (cell - 2) + '" rx="4" fill="' + (hot ? TEAL : "#fff") + '" stroke="#cfe6e3" stroke-width="1"/>'
        + '<text x="' + (x + cell / 2 - 1) + '" y="' + (y + cell / 2 + 4) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + (hot ? "#fff" : INK) + '" style="pointer-events:none">' + n + '</text></g>';
    }
    return '<svg viewBox="0 0 300 300" width="100%" height="100%" style="display:block;touch-action:none">' + cells + '</svg>'
      + '<script>(function(){var g=document.querySelector("svg"),on={' + pre.map(function (n) { return '"' + n + '":1'; }).join(",") + '};'
      + 'g.addEventListener("pointerdown",function(e){var t=e.target;while(t&&t!==g&&!(t.classList&&t.classList.contains("cl")))t=t.parentNode;if(!t||t===g)return;'
      + 'var n=t.getAttribute("data-n"),rc=t.querySelector("rect"),tx=t.querySelector("text");on[n]=!on[n];rc.setAttribute("fill",on[n]?"#0d9488":"#fff");if(tx)tx.setAttribute("fill",on[n]?"#fff":"#0f3b36");});})();<\/script>';
  },
  "number_line_interactive": function (p) {
    p = p || {};
    function ci(v, lo, hi, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return v < lo ? lo : v > hi ? hi : v; }
    var from = ci(p.from, -100, 1000, 0), to = ci(p.to, from + 1, from + 1000, 10), step = ci(p.step, 1, 100, 1);
    var startN = ci(p.start, from, to, from);
    var INK = "#0f3b36", TEAL = "#0d9488", x0 = 28, x1 = 332, Y = 120;
    step = Math.max(1, Math.min(step, to - from)); // הצעד לא גדול מהטווח (אחרת n=0 וחלוקה ב-0)
    var n = Math.round((to - from) / step);
    if (n > 40) { step = Math.ceil((to - from) / 40); n = Math.round((to - from) / step); }
    if (n < 1) n = 1; // לפחות מרווח אחד
    var ticks = "";
    for (var i = 0; i <= n; i++) { var v = from + i * step, x = x0 + (x1 - x0) * i / n; ticks += '<line x1="' + x.toFixed(1) + '" y1="' + (Y - 7) + '" x2="' + x.toFixed(1) + '" y2="' + (Y + 7) + '" stroke="' + TEAL + '" stroke-width="2"/><text x="' + x.toFixed(1) + '" y="' + (Y + 28) + '" text-anchor="middle" font-size="13" fill="' + INK + '">' + v + '</text>'; }
    return '<svg viewBox="0 0 360 180" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<line x1="' + x0 + '" y1="' + Y + '" x2="' + x1 + '" y2="' + Y + '" stroke="' + TEAL + '" stroke-width="3" stroke-linecap="round"/>' + ticks
      + '<path id="arc" fill="none" stroke="' + INK + '" stroke-width="2.5"/>'
      + '<text id="jl" text-anchor="middle" font-size="16" font-weight="700" fill="' + INK + '"></text>'
      + '<circle id="hd" r="10" fill="' + TEAL + '" stroke="#fff" stroke-width="2.5" style="cursor:grab"/>'
      + '<text id="vl" text-anchor="middle" font-size="22" font-weight="800" fill="' + TEAL + '"></text></svg>'
      + '<script>(function(){var FROM=' + from + ',TO=' + to + ',STEP=' + step + ',N=' + n + ',ST=' + startN + ',X0=' + x0 + ',X1=' + x1 + ',Y=' + Y + ';'
      + 'var s=document.querySelector("svg"),hd=document.getElementById("hd"),vl=document.getElementById("vl"),arc=document.getElementById("arc"),jl=document.getElementById("jl"),cur=ST,drag=false;'
      + 'function px(v){return X0+(X1-X0)*((v-FROM)/STEP)/N;}' // לפי אינדקס-שנתה (כמו ציור השנתות) → הסמן יושב בדיוק על השנתות, ומגיע לקצה
      + 'function rn(){var hx=px(cur);hd.setAttribute("cx",hx.toFixed(1));hd.setAttribute("cy",Y);vl.setAttribute("x",hx.toFixed(1));vl.setAttribute("y",Y-46);vl.textContent=cur;'
      + 'var sx=px(ST),ex=hx,mx=(sx+ex)/2,h=20+Math.abs(ex-sx)*0.28;if(Math.abs(cur-ST)<0.001){arc.setAttribute("d","");jl.textContent="";}else{arc.setAttribute("d","M"+sx+","+(Y-6)+" Q"+mx+","+(Y-h)+" "+ex+","+(Y-6));jl.setAttribute("x",mx);jl.setAttribute("y",Y-h-4);jl.textContent=(cur>=ST?"+":"\\u2212")+Math.abs(cur-ST);}}'
      + 'function setX(cx){var r=s.getBoundingClientRect();var x=(cx-r.left)*(360/r.width);var i=Math.round((x-X0)/(X1-X0)*N);i=Math.max(0,Math.min(N,i));cur=FROM+i*STEP;rn();}'
      + 's.addEventListener("pointerdown",function(e){drag=true;e.preventDefault();setX(e.clientX);try{s.setPointerCapture(e.pointerId);}catch(_){}});'
      + 's.addEventListener("pointermove",function(e){if(!drag)return;e.preventDefault();setX(e.clientX);});'
      + 's.addEventListener("pointerup",function(){drag=false;});s.addEventListener("pointercancel",function(){drag=false;});rn();})();<\/script>';
  },

  /* ══════════════════════════════════════════════════════════════════════
     כלים לכיתות ג׳–ו׳
     ──────────────────────────────────────────────────────────────────────
     הערכה המקורית נבנתה לא׳–ב׳ (לוח-עשר, לוח-מאה, בלוקי בסיס-10, מטבעות,
     שעון). לחומר של ג׳–ו׳ לא היה כלי מוכן, ולכן נכתבו מאות ווידג'טים
     מותאמים בכתב-יד — אותו מושג מיושם אחרת בכל שיעור, וכולם סטטיים.
     הכלים כאן מחליפים אותם: מוכנים, אחידים, ו*אינטראקטיביים*.
     ══════════════════════════════════════════════════════════════════════ */

  /** מד-זווית — הילד גורר את הקרן וקורא מעלות. שני סולמות, כמו במד-זווית אמיתי. */
  "protractor": function (p) {
    p = p || {};
    var ang = wkNum(p.angle, 0, 180, 60), target = wkNum(p.target, -1, 180, -1);
    // lock — הקרן קבועה. חובה כששואלים "כמה מעלות?", אחרת הילד גורר והתשובה משתנה.
    // value:false — מסתיר את הקריאה המספרית, אחרת הכלי מסגיר את התשובה.
    var lock = p.lock === true || String(p.lock) === "true";
    var showVal = !(p.value === false || String(p.value) === "false");
    var cx = 190, cy = 185, R = 150, INK = "#0f3b36", ticks = "", nums = "";
    for (var d = 0; d <= 180; d += 5) {
      var a = (180 - d) * Math.PI / 180, len = d % 10 === 0 ? (d % 30 === 0 ? 20 : 14) : 8;
      ticks += '<line x1="' + (cx + R * Math.cos(a)).toFixed(1) + '" y1="' + (cy - R * Math.sin(a)).toFixed(1)
        + '" x2="' + (cx + (R - len) * Math.cos(a)).toFixed(1) + '" y2="' + (cy - (R - len) * Math.sin(a)).toFixed(1)
        + '" stroke="' + INK + '" stroke-width="' + (d % 30 === 0 ? 2 : 1) + '"/>';
      if (d % 30 === 0) {
        var rn1 = R - 34, rn2 = R - 58;
        nums += '<text x="' + (cx + rn1 * Math.cos(a)).toFixed(1) + '" y="' + (cy - rn1 * Math.sin(a) + 5).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#0d9488">' + d + '</text>';
        // בקצוות (0 ו-180) שני הסולמות נופלים זה על זה וקוראים "0 180" — מדלגים על הפנימי
        if (d > 0 && d < 180) nums += '<text x="' + (cx + rn2 * Math.cos(a)).toFixed(1) + '" y="' + (cy - rn2 * Math.sin(a) + 5).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#c2410c">' + (180 - d) + '</text>';
      }
    }
    return '<svg viewBox="0 0 380 230" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<path d="M' + (cx - R) + ',' + cy + ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R) + ',' + cy + ' Z" fill="#f0fdfa" stroke="' + INK + '" stroke-width="2"/>'
      + ticks + nums
      + '<line x1="' + (cx - R) + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy + '" stroke="' + INK + '" stroke-width="3"/>'
      + '<line id="ry" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy + '" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + INK + '"/>'
      + '<text id="rd" x="' + cx + '" y="222" text-anchor="middle" font-size="24" font-weight="800" fill="' + INK + '"></text></svg>'
      + '<script>(function(){var CX=' + cx + ',CY=' + cy + ',R=' + R + ',T=' + target + ',a=' + ang + ',LOCK=' + (lock ? 1 : 0) + ',SHOW=' + (showVal ? 1 : 0) + ';'
      + 'var s=document.querySelector("svg"),ry=document.getElementById("ry"),rd=document.getElementById("rd"),drag=false;'
      + 'function rn(){var r=a*Math.PI/180;ry.setAttribute("x2",(CX+R*Math.cos(Math.PI-r)).toFixed(1));ry.setAttribute("y2",(CY-R*Math.sin(Math.PI-r)).toFixed(1));'
      + 'rd.textContent=SHOW?(a+"\\u00B0"):"";if(T>=0&&a===T){rd.setAttribute("fill","#22c55e");parent.postMessage({type:"vela:correct"},"*");}else{rd.setAttribute("fill","#0f3b36");}}'
      + 'function set(cx2,cy2){var b=s.getBoundingClientRect(),k=380/b.width;var x=(cx2-b.left)*k-CX,y=CY-((cy2-b.top)*k);'
      + 'var d=Math.round(Math.atan2(Math.max(0,y),-x)*180/Math.PI/5)*5;a=Math.max(0,Math.min(180,d));rn();}'
      + 'if(!LOCK){s.addEventListener("pointerdown",function(e){drag=true;e.preventDefault();set(e.clientX,e.clientY);try{s.setPointerCapture(e.pointerId);}catch(_){}});'
      + 's.addEventListener("pointermove",function(e){if(drag){e.preventDefault();set(e.clientX,e.clientY);}});'
      + 's.addEventListener("pointerup",function(){drag=false;});}rn();})();<\/script>';
  },

  /** רשת עשרונית — 10 עשיריות או 100 מאיות. לחיצה צובעת, והקריאה מראה שבר, עשרוני ואחוז יחד. */
  "decimal_grid": function (p) {
    p = p || {};
    var rows = wkNum(p.rows, 1, 10, 10) === 1 ? 1 : 10;
    var cells = rows === 1 ? 10 : 100;
    var filled = wkNum(p.filled, 0, cells, 0), target = wkNum(p.target, -1, cells, -1);
    // lock — הרשת קבועה. במסך-הוראה שבו המורה אומר "צבעתי שלושים משבצות",
    // לחיצה של הילד הייתה משנה ל-31 והדברים היו סותרים את מה שעל הלוח.
    var lock = p.lock === true || String(p.lock) === "true";
    // גובה-viewBox קבוע: המנוע נועל יחס-ווידג'ט, ו-viewBox משתנה היה מעוות את הכרטיס
    var INK = "#0f3b36", cs = rows === 1 ? 30 : 26, gx = (340 - cs * 10) / 2, gy = rows === 1 ? 150 : 44, sq = "";
    for (var i = 0; i < cells; i++) {
      var r = Math.floor(i / 10), c = i % 10;
      sq += '<rect class="c" data-i="' + i + '" x="' + (gx + c * cs) + '" y="' + (gy + r * cs) + '" width="' + (cs - 2) + '" height="' + (cs - 2) + '" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/>';
    }
    return '<svg viewBox="0 0 340 360" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<text x="170" y="26" text-anchor="middle" font-size="16" font-weight="700" fill="' + INK + '">' + (rows === 1 ? "עשיריות" : "מאיות") + '</text>'
      + sq + '<text id="rd" x="170" y="' + (gy + rows * cs + 36) + '" text-anchor="middle" font-size="21" font-weight="800" fill="' + INK + '"></text></svg>'
      + '<script>(function(){var N=' + cells + ',D=' + (rows === 1 ? 10 : 100) + ',T=' + target + ',st=[],s=document.querySelector("svg"),rd=document.getElementById("rd");'
      + 'var cs=[].slice.call(s.querySelectorAll(".c"));for(var i=0;i<N;i++)st[i]=i<' + filled + ';'
      + 'function rn(){var n=0;for(var i=0;i<N;i++){cs[i].setAttribute("fill",st[i]?"#0d9488":"#fff");if(st[i])n++;}'
      + 'var dec=(n/D).toFixed(D===10?1:2);rd.textContent=n+"/"+D+"  =  "+dec;'
      + 'if(T>=0&&n===T){rd.setAttribute("fill","#22c55e");parent.postMessage({type:"vela:correct"},"*");}else{rd.setAttribute("fill","#0f3b36");}}'
      + (lock ? "" : 's.addEventListener("pointerdown",function(e){var i=e.target.getAttribute&&e.target.getAttribute("data-i");if(i==null)return;i=+i;st[i]=!st[i];rn();});') + 'rn();})();<\/script>';
  },

  /** פס-אחוזים — גוררים, ורואים בו-זמנית אחוז, שבר וכמה זה מתוך הכמות. */
  "percent_bar": function (p) {
    p = p || {};
    var total = wkNum(p.total, 1, 100000, 100), pc = wkNum(p.percent, 0, 100, 50), target = wkNum(p.target, -1, 100, -1);
    var INK = "#0f3b36", bx = 30, bw = 320, by = 60, bh = 54, marks = "";
    for (var i = 0; i <= 10; i++) {
      var x = bx + bw * i / 10;
      marks += '<line x1="' + x + '" y1="' + by + '" x2="' + x + '" y2="' + (by + bh + (i % 5 === 0 ? 10 : 5)) + '" stroke="' + INK + '" stroke-width="' + (i % 5 === 0 ? 2 : 1) + '"/>';
      if (i % 5 === 0) marks += '<text x="' + x + '" y="' + (by + bh + 28) + '" text-anchor="middle" font-size="13" fill="' + INK + '">' + (i * 10) + '%</text>';
    }
    return '<svg viewBox="0 0 380 180" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>'
      + '<rect id="fl" x="' + bx + '" y="' + by + '" width="0" height="' + bh + '" fill="#0d9488" opacity="0.85"/>'
      + marks
      + '<line id="hd" x1="' + bx + '" y1="' + (by - 8) + '" x2="' + bx + '" y2="' + (by + bh + 8) + '" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>'
      // חשבון וטקסט עברי בתוך אותו <text> מתהפכים ב-RTL ("25% 15 = 60-מ").
      // לכן הנוסחה לבדה, עם direction:ltr, והמילים העבריות בכיתוב נפרד.
      + '<text id="rd" x="190" y="34" text-anchor="middle" font-size="22" font-weight="800" fill="' + INK + '" style="direction:ltr;unicode-bidi:isolate"></text>'
      + '<text id="cp" x="190" y="160" text-anchor="middle" font-size="15" fill="#64748b">מתוך ' + total + '</text></svg>'
      + '<script>(function(){var BX=' + bx + ',BW=' + bw + ',TOT=' + total + ',T=' + target + ',pc=' + pc + ';'
      + 'var s=document.querySelector("svg"),fl=document.getElementById("fl"),hd=document.getElementById("hd"),rd=document.getElementById("rd"),drag=false;'
      + 'function rn(){var w=BW*pc/100;fl.setAttribute("width",w.toFixed(1));hd.setAttribute("x1",(BX+w).toFixed(1));hd.setAttribute("x2",(BX+w).toFixed(1));'
      + 'var v=TOT*pc/100;rd.textContent=pc+"%  =  "+(Math.round(v*100)/100);'
      + 'if(T>=0&&pc===T){rd.setAttribute("fill","#22c55e");parent.postMessage({type:"vela:correct"},"*");}else{rd.setAttribute("fill","#0f3b36");}}'
      + 'function set(cx){var b=s.getBoundingClientRect(),k=380/b.width;var x=(cx-b.left)*k-BX;pc=Math.max(0,Math.min(100,Math.round(x/BW*100/5)*5));rn();}'
      + 's.addEventListener("pointerdown",function(e){drag=true;e.preventDefault();set(e.clientX);try{s.setPointerCapture(e.pointerId);}catch(_){}});'
      + 's.addEventListener("pointermove",function(e){if(drag){e.preventDefault();set(e.clientX);}});'
      + 's.addEventListener("pointerup",function(){drag=false;});rn();})();<\/script>';
  },

  /** מעגל — רדיוס, קוטר והיקף. לחיצה מחליפה בין רדיוס לקוטר ומגלה את החישוב. */
  "circle_parts": function (p) {
    p = p || {};
    var r = wkNum(p.radius, 1, 99, 5), show = String(p.show || "radius");
    // lock — בלי מחזור-לחיצה. חובה כשהמעגל הוא *עזר לשאלה*: בלעדיו הילד לוחץ,
    // הכלי מגיע למצב ההיקף ומציג "3.14 × 20 = 62.8" — כלומר את התשובה עצמה.
    var lock = p.lock === true || String(p.lock) === "true";
    // R קטן מספיק כדי שהכיתוב מתחת (y=224) לא ייפול על שפת המעגל
    var INK = "#0f3b36", cx = 170, cy = 118, R = 78;
    return '<svg viewBox="0 0 340 260" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#f0fdfa" stroke="' + INK + '" stroke-width="3"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + INK + '"/>'
      + '<line id="sg" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy + '" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>'
      + '<text id="lb" x="' + cx + '" y="' + (cy - 14) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#e11d48"></text>'
      // הנוסחה לבדה ב-LTR; המילה העברית יושבת ב-cp, אחרת "היקף = 3.14 × 10" מתהפך
      + '<text id="rd" x="170" y="242" text-anchor="middle" font-size="19" font-weight="800" fill="' + INK + '" style="direction:ltr;unicode-bidi:isolate"></text>'
      + '<text id="cp" x="170" y="224" text-anchor="middle" font-size="15" fill="#64748b"></text>'
      + (lock ? "" : '<text x="170" y="26" text-anchor="middle" font-size="13" fill="#64748b">לחיצה מחליפה: רדיוס ← קוטר ← היקף</text>') + '</svg>'
      + '<script>(function(){var CX=' + cx + ',CY=' + cy + ',R=' + R + ',rad=' + r + ';var modes=["radius","diameter","circumference"],m=Math.max(0,modes.indexOf("' + show + '"));'
      + 'var sg=document.getElementById("sg"),lb=document.getElementById("lb"),rd=document.getElementById("rd"),cp=document.getElementById("cp");'
      + 'function rn(){if(m===0){sg.setAttribute("x1",CX);sg.setAttribute("x2",CX+R);lb.textContent="\\u05E8\\u05D3\\u05D9\\u05D5\\u05E1";cp.textContent="\\u05DE\\u05D4\\u05DE\\u05E8\\u05DB\\u05D6 \\u05D0\\u05DC \\u05D4\\u05E7\\u05E6\\u05D4";rd.textContent="r = "+rad;}'
      // "d = 20" ולא "2 × 10 = 20": כשהקוטר הוא הנתון, נוסחה שמזכירה רדיוס
      // שלא נמסר בשאלה רק מבלבלת. ההסבר יושב בכיתוב שמתחת.
      + 'else if(m===1){sg.setAttribute("x1",CX-R);sg.setAttribute("x2",CX+R);lb.textContent="\\u05E7\\u05D5\\u05D8\\u05E8";cp.textContent="\\u05E4\\u05E2\\u05DE\\u05D9\\u05D9\\u05DD \\u05D4\\u05E8\\u05D3\\u05D9\\u05D5\\u05E1";rd.textContent="d = "+(rad*2);}'
      + 'else{sg.setAttribute("x1",CX-R);sg.setAttribute("x2",CX+R);lb.textContent="\\u05E7\\u05D5\\u05D8\\u05E8";cp.textContent="\\u05D4\\u05D9\\u05E7\\u05E3 \\u05D4\\u05DE\\u05E2\\u05D2\\u05DC";rd.textContent="3.14 \\u00D7 "+(rad*2)+" = "+(Math.round(3.14*rad*2*100)/100);}}'
      + (lock ? "" : 'document.querySelector("svg").addEventListener("pointerdown",function(){m=(m+1)%3;rn();});') + 'rn();})();<\/script>';
  },

  /** טבלת ערך-מקום — עד מיליון. לחיצה על ספרה מגלה כמה היא באמת שווה. */
  "place_value_table": function (p) {
    p = p || {};
    var val = String(wkNum(p.value, 0, 9999999, 3456));
    var names = ["יחידות", "עשרות", "מאות", "אלפים", "עשרות אלפים", "מאות אלפים", "מיליונים"];
    var n = Math.max(val.length, wkNum(p.upto, 1, 7, val.length));
    while (val.length < n) val = "0" + val;
    var INK = "#0f3b36", cw = Math.min(58, 400 / n), gx = (420 - cw * n) / 2, hd = "", dg = "";
    for (var i = 0; i < n; i++) {
      var place = n - 1 - i, x = gx + i * cw;
      hd += '<rect x="' + x + '" y="44" width="' + (cw - 2) + '" height="34" fill="#e6fffb" stroke="' + INK + '" stroke-width="1.5"/>'
        + '<text x="' + (x + cw / 2) + '" y="66" text-anchor="middle" font-size="' + (cw < 46 ? 9 : 11) + '" fill="' + INK + '">' + names[place] + '</text>';
      dg += '<rect class="d" data-p="' + place + '" data-v="' + val[i] + '" x="' + x + '" y="78" width="' + (cw - 2) + '" height="52" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/>'
        + '<text class="d" data-p="' + place + '" data-v="' + val[i] + '" x="' + (x + cw / 2) + '" y="116" text-anchor="middle" font-size="28" font-weight="800" fill="' + INK + '">' + val[i] + '</text>';
    }
    return '<svg viewBox="0 0 420 200" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<text x="210" y="28" text-anchor="middle" font-size="15" font-weight="700" fill="' + INK + '">לחץ/י על ספרה כדי לראות כמה היא שווה</text>'
      + hd + dg
      + '<text id="rd" x="210" y="168" text-anchor="middle" font-size="22" font-weight="800" fill="#0d9488"></text></svg>'
      + '<script>(function(){var rd=document.getElementById("rd");'
      + 'document.querySelector("svg").addEventListener("pointerdown",function(e){var t=e.target;if(!t.getAttribute)return;var pl=t.getAttribute("data-p"),v=t.getAttribute("data-v");if(pl==null)return;'
      + 'rd.textContent=v+" \\u00D7 "+Math.pow(10,+pl)+" = "+(+v*Math.pow(10,+pl));});})();<\/script>';
  },

  /** דיאגרמת עמודות — יחידה או כפולה עם מקרא. הסולם מפורש, כי שם ילדים נופלים. */
  "bar_chart": function (p) {
    p = p || {};
    var labels = (Array.isArray(p.labels) ? p.labels : String(p.labels || "").split(",")).slice(0, 6).map(function (s) { return String(s).slice(0, 10).replace(/[<>&]/g, ""); });
    var a = (Array.isArray(p.series) ? p.series : String(p.series || "").split(",")).map(Number).slice(0, 6);
    // בלי סינון המחרוזת הריקה: "".split(",") נותן [""], ו-Number("") הוא 0 —
    // כלומר סדרה שנייה מדומה של אפסים, מקרא מיותר, ועמודות בחצי רוחב.
    var b = (Array.isArray(p.series2) ? p.series2 : String(p.series2 || "").split(","))
      .filter(function (s) { return String(s).trim() !== ""; }).map(Number).slice(0, 6);
    var hasB = b.length > 0 && b.every(function (v) { return isFinite(v); });
    var step = wkNum(p.step, 1, 1000, 5), INK = "#0f3b36";
    var mx = Math.max.apply(null, a.concat(hasB ? b : [0]).concat([step])), top = Math.ceil(mx / step) * step;
    // אוויר מעל הגבוהה: בלעדיו העמודה המקסימלית נוגעת בקו העליון ונראית חתוכה.
    // מספר המשבצות לא משתנה — רק הציר מתארך, כך שהשוואת-צורה בין סולמות נשמרת.
    if (top === mx) top += step;
    var bx = 54, by = 46, bw = 320, bh = 150, grid = "", bars = "";
    for (var i = 0; i <= top / step; i++) {
      var y = by + bh - bh * (i * step) / top;
      grid += '<line x1="' + bx + '" y1="' + y.toFixed(1) + '" x2="' + (bx + bw) + '" y2="' + y.toFixed(1) + '" stroke="#cbd5e1" stroke-width="1"/>'
        + '<text x="' + (bx - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="' + INK + '">' + (i * step) + '</text>';
    }
    var slot = bw / Math.max(1, a.length), wid = hasB ? slot * 0.3 : slot * 0.5;
    // unit:"squares" — כל פריט הוא משבצת נפרדת ולא עמודה מלאה. זו השיטה של
    // כיתות ב׳–ג׳ ("משבצת אחת = פריט אחד"), ובלעדיה החלפת דיאגרמה ידנית בכלי
    // הייתה מוחקת בדיוק את הרעיון שהשיעור מלמד.
    var squares = String(p.unit || "") === "squares";
    var COL = ["#0d9488", "#f59e0b", "#a78bfa", "#ef4444", "#3b82f6", "#84cc16"];
    for (var k = 0; k < a.length; k++) {
      var cx0 = bx + slot * (k + 0.5), h1 = bh * (a[k] || 0) / top;
      if (squares) {
        var uh = bh / top * step, n1 = Math.round((a[k] || 0) / step);
        for (var q = 0; q < n1; q++)
          bars += '<rect x="' + (cx0 - wid / 2).toFixed(1) + '" y="' + (by + bh - (q + 1) * uh + 1).toFixed(1) + '" width="' + wid.toFixed(1) + '" height="' + (uh - 2).toFixed(1) + '" fill="' + COL[k % COL.length] + '" stroke="' + INK + '" stroke-width="1.5"/>';
      } else {
        bars += '<rect x="' + (cx0 - (hasB ? wid + 3 : wid / 2)).toFixed(1) + '" y="' + (by + bh - h1).toFixed(1) + '" width="' + wid.toFixed(1) + '" height="' + h1.toFixed(1) + '" fill="#0d9488"/>';
        if (hasB) { var h2 = bh * (b[k] || 0) / top; bars += '<rect x="' + (cx0 + 3).toFixed(1) + '" y="' + (by + bh - h2).toFixed(1) + '" width="' + wid.toFixed(1) + '" height="' + h2.toFixed(1) + '" fill="#f59e0b"/>'; }
      }
      bars += '<text x="' + cx0.toFixed(1) + '" y="' + (by + bh + 18) + '" text-anchor="middle" font-size="12" fill="' + INK + '">' + (labels[k] || "") + '</text>';
    }
    var lg = "";
    if (hasB) lg = '<rect x="150" y="228" width="14" height="14" fill="#0d9488"/><text x="170" y="240" font-size="12" fill="' + INK + '">' + (String(p.name1 || "א").slice(0, 10)) + '</text>'
      + '<rect x="230" y="228" width="14" height="14" fill="#f59e0b"/><text x="250" y="240" font-size="12" fill="' + INK + '">' + (String(p.name2 || "ב").slice(0, 10)) + '</text>';
    return '<svg viewBox="0 0 400 250" width="100%" height="100%" style="display:block">'
      + '<text x="200" y="26" text-anchor="middle" font-size="15" font-weight="700" fill="' + INK + '">כל משבצת = ' + step + '</text>'
      + grid + bars
      + '<line x1="' + bx + '" y1="' + (by + bh) + '" x2="' + (bx + bw) + '" y2="' + (by + bh) + '" stroke="' + INK + '" stroke-width="2.5"/>'
      + '<line x1="' + bx + '" y1="' + by + '" x2="' + bx + '" y2="' + (by + bh) + '" stroke="' + INK + '" stroke-width="2.5"/>' + lg + '</svg>';
  },

  /** שטח והיקף על משבצות — הילד לוחץ ורואה ששטח נספר בפנים והיקף מסביב. */
  "area_grid": function (p) {
    p = p || {};
    var w = wkNum(p.w, 1, 12, 5), h = wkNum(p.h, 1, 8, 3), INK = "#0f3b36";
    var cs = Math.min(36, 300 / w, 170 / h), gx = (340 - cs * w) / 2, gy = 48, sq = "";
    for (var r = 0; r < h; r++) for (var c = 0; c < w; c++)
      sq += '<rect class="c" data-i="' + (r * w + c) + '" x="' + (gx + c * cs).toFixed(1) + '" y="' + (gy + r * cs).toFixed(1) + '" width="' + (cs - 1).toFixed(1) + '" height="' + (cs - 1).toFixed(1) + '" fill="#fff" stroke="' + INK + '" stroke-width="1.2"/>';
    return '<svg viewBox="0 0 340 300" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<text x="170" y="28" text-anchor="middle" font-size="14" fill="#64748b">לחץ/י על משבצות — השטח נספר בפנים</text>' + sq
      + '<rect x="' + gx + '" y="' + gy + '" width="' + (cs * w - 1).toFixed(1) + '" height="' + (cs * h - 1).toFixed(1) + '" fill="none" stroke="#e11d48" stroke-width="3"/>'
      + '<text id="rd" x="170" y="' + (gy + h * cs + 34) + '" text-anchor="middle" font-size="18" font-weight="800" fill="' + INK + '">שטח: 0 · היקף: ' + (2 * (w + h)) + '</text></svg>'
      + '<script>(function(){var W=' + w + ',H=' + h + ',P=' + (2 * (w + h)) + ',A=' + (w * h) + ',st={},n=0;var s=document.querySelector("svg"),rd=document.getElementById("rd");'
      + 's.addEventListener("pointerdown",function(e){var i=e.target.getAttribute&&e.target.getAttribute("data-i");if(i==null)return;'
      + 'if(st[i]){st[i]=0;n--;e.target.setAttribute("fill","#fff");}else{st[i]=1;n++;e.target.setAttribute("fill","#5eead4");}'
      + 'rd.textContent="\\u05E9\\u05D8\\u05D7: "+n+" \\u00B7 \\u05D4\\u05D9\\u05E7\\u05E3: "+P;'
      + 'if(n===A){rd.setAttribute("fill","#22c55e");parent.postMessage({type:"vela:correct"},"*");}else{rd.setAttribute("fill","#0f3b36");}});})();<\/script>';
  },

  /** קיר-שברים — שורות שלם, חצאים… שתים-עשרה. הילד רואה שוויון-ערך בעיניים. */
  "fraction_wall": function (p) {
    p = p || {};
    var list = (Array.isArray(p.rows) ? p.rows : String(p.rows || "1,2,3,4,6,8").split(",")).map(Number)
      .filter(function (v) { return v >= 1 && v <= 12; }).slice(0, 7);
    if (!list.length) list = [1, 2, 3, 4, 6, 8];
    var INK = "#0f3b36", bx = 24, bw = 292, rh = Math.min(34, 210 / list.length), rows = "";
    for (var r = 0; r < list.length; r++) {
      var n = list[r], cw = bw / n, y = 42 + r * (rh + 4);
      for (var i = 0; i < n; i++) {
        rows += '<rect class="c" data-r="' + r + '" data-n="' + n + '" x="' + (bx + i * cw).toFixed(1) + '" y="' + y + '" width="' + (cw - 2).toFixed(1) + '" height="' + rh + '" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/>';
        if (cw > 28) rows += '<text x="' + (bx + i * cw + cw / 2).toFixed(1) + '" y="' + (y + rh / 2 + 5) + '" text-anchor="middle" font-size="12" fill="' + INK + '" pointer-events="none">' + (n === 1 ? "1" : "1/" + n) + '</text>';
      }
    }
    return '<svg viewBox="0 0 340 300" width="100%" height="100%" style="display:block;touch-action:none">'
      + '<text x="170" y="26" text-anchor="middle" font-size="14" fill="#64748b">לחץ/י על חלקים — כמה יוצא ביחד?</text>' + rows
      + '<text id="rd" x="170" y="' + (42 + list.length * (rh + 4) + 26) + '" text-anchor="middle" font-size="18" font-weight="800" fill="' + INK + '"></text></svg>'
      + '<script>(function(){var s=document.querySelector("svg"),rd=document.getElementById("rd"),sel={};'
      + 's.addEventListener("pointerdown",function(e){var t=e.target,r=t.getAttribute&&t.getAttribute("data-r");if(r==null)return;'
      + 'var k=t.getAttribute("x")+"|"+r;if(sel[k]){delete sel[k];t.setAttribute("fill","#fff");}else{sel[k]=+t.getAttribute("data-n");t.setAttribute("fill","#0d9488");}'
      + 'var sum=0,cnt=0;for(var q in sel){sum+=1/sel[q];cnt++;}'
      + 'rd.textContent=cnt?("\\u05D1\\u05D9\\u05D7\\u05D3 = "+(Math.round(sum*1000)/1000)):"";});})();<\/script>';
  },

  /** סרגל — חפץ מונח מול שנתות ס״מ. מדידה בלי סרגל היא לא מדידה. */
  "ruler": function (p) {
    p = p || {};
    var len = wkNum(p.length, 1, 20, 8);
    var from = wkNum(p.from, 0, 12, 0);          // מאיזו שנתה מתחיל החפץ
    var maxCm = wkNum(p.max, 5, 20, 20);
    if (from + len > maxCm) from = Math.max(0, maxCm - len);
    var INK = "#0f3b36", x0 = 30, x1 = 350, unit = (x1 - x0) / maxCm;
    var ticks = "";
    for (var i = 0; i <= maxCm; i++) {
      var x = x0 + i * unit, big = i % 5 === 0;
      ticks += '<line x1="' + x.toFixed(1) + '" y1="118" x2="' + x.toFixed(1) + '" y2="' + (big ? 92 : 104) + '" stroke="' + INK + '" stroke-width="' + (big ? 2 : 1) + '"/>';
      if (big) ticks += '<text x="' + x.toFixed(1) + '" y="85" text-anchor="middle" font-size="11" fill="' + INK + '">' + i + '</text>';
    }
    var ox = x0 + from * unit, ow = len * unit;
    var label = p.label ? String(p.label).slice(0, 24).replace(/[<>&]/g, "") : "";
    return '<svg viewBox="0 0 380 190" width="100%" height="100%" style="display:block">'
      + (label ? '<text x="190" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="' + INK + '">' + label + '</text>' : '')
      + '<rect x="' + ox.toFixed(1) + '" y="42" width="' + ow.toFixed(1) + '" height="26" rx="5" fill="#5eead4" stroke="' + INK + '" stroke-width="2"/>'
      + '<rect x="' + x0 + '" y="118" width="' + (x1 - x0) + '" height="46" fill="#fef3c7" stroke="' + INK + '" stroke-width="2"/>'
      + ticks
      + '<text x="190" y="182" text-anchor="middle" font-size="12" fill="#64748b">סנטימטרים</text></svg>';
  },

  /** גוף ופריסתו — הילד רואה את התלת-ממד ואת הפריסה זה לצד זה. */
  "solid_net": function (p) {
    p = p || {};
    var solid = String(p.solid || "cube").toLowerCase();
    if (["cube", "box", "cylinder", "prism", "pyramid"].indexOf(solid) < 0) solid = "cube";
    var INK = "#0f3b36", F = "#99f6e4", body = "", net = "", nm = "";
    if (solid === "cube" || solid === "box") {
      var W2 = solid === "cube" ? 70 : 92, H2 = 70, D2 = 30;
      body = '<path d="M30,' + (60 + D2) + ' h' + W2 + ' v' + H2 + ' h-' + W2 + ' Z" fill="' + F + '" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M30,' + (60 + D2) + ' l' + D2 + ',-' + D2 + ' h' + W2 + ' l-' + D2 + ',' + D2 + '" fill="#ccfbf1" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M' + (30 + W2) + ',' + (60 + D2) + ' l' + D2 + ',-' + D2 + ' v' + H2 + ' l-' + D2 + ',' + D2 + '" fill="#5eead4" stroke="' + INK + '" stroke-width="2"/>';
      var u = 32, nx = 210, ny = 52;
      var cellsN = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
      for (var i = 0; i < cellsN.length; i++)
        net += '<rect x="' + (nx + cellsN[i][0] * u) + '" y="' + (ny + cellsN[i][1] * u) + '" width="' + u + '" height="' + u + '" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>';
      nm = solid === "cube" ? "קובייה — 6 פאות" : "תיבה — 6 פאות";
    } else if (solid === "cylinder") {
      body = '<ellipse cx="80" cy="72" rx="46" ry="16" fill="#ccfbf1" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M34,72 v70 a46,16 0 0 0 92,0 v-70" fill="' + F + '" stroke="' + INK + '" stroke-width="2"/>';
      net = '<ellipse cx="238" cy="58" rx="26" ry="14" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<rect x="196" y="80" width="150" height="66" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<ellipse cx="238" cy="170" rx="26" ry="14" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>';
      nm = "גליל — 2 עיגולים ומלבן";
    } else if (solid === "prism") {
      body = '<path d="M40,150 L80,66 L120,150 Z" fill="' + F + '" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M40,150 l26,-24 L106,42 L80,66 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M120,150 l26,-24 L106,42" fill="#5eead4" stroke="' + INK + '" stroke-width="2"/>';
      net = '<path d="M212,60 L248,110 L176,110 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<rect x="176" y="110" width="72" height="52" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<rect x="248" y="110" width="72" height="52" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<rect x="104" y="110" width="72" height="52" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<path d="M212,212 L248,162 L176,162 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>';
      nm = "מנסרה משולשת — 2 משולשים ו-3 מלבנים";
    } else {
      body = '<path d="M40,152 L120,152 L80,60 Z" fill="' + F + '" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M40,152 l28,-22 L108,130 L120,152" fill="#ccfbf1" stroke="' + INK + '" stroke-width="2"/>'
        + '<path d="M80,60 L108,130 L120,152" fill="#5eead4" stroke="' + INK + '" stroke-width="2"/>';
      net = '<rect x="212" y="98" width="60" height="60" fill="' + F + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<path d="M212,98 L272,98 L242,44 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<path d="M212,158 L272,158 L242,212 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<path d="M212,98 L212,158 L158,128 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>'
        + '<path d="M272,98 L272,158 L326,128 Z" fill="#ccfbf1" stroke="' + INK + '" stroke-width="1.8"/>';
      nm = "פירמידה — בסיס ומשולשים";
    }
    return '<svg viewBox="0 0 400 240" width="100%" height="100%" style="display:block">'
      + '<text x="200" y="24" text-anchor="middle" font-size="15" font-weight="700" fill="' + INK + '">' + nm + '</text>'
      + body + net
      + '<text x="80" y="230" text-anchor="middle" font-size="13" fill="#64748b">הגוף</text>'
      + '<text x="260" y="230" text-anchor="middle" font-size="13" fill="#64748b">הפריסה</text></svg>';
  }
  };

  /** קליטת מספר בטוחה — משותפת לכלים החדשים (הישנים מגדירים ci/clampInt אצלם). */
  function wkNum(v, lo, hi, d) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = d;
    return v < lo ? lo : v > hi ? hi : v;
  }
})(typeof window !== "undefined" ? window : this);
