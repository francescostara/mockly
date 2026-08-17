# Pattern Library

The reusable scaffolding behind every mockup. These patterns are battle-tested across the
three gold-standard examples in `assets/`. Copy and adapt them — do not reinvent. When a
detail here is ambiguous, open the closest gold-standard file and match it exactly.

## Table of contents
1. Fixed-canvas shell + fit-to-viewport
2. Layout & composition (filter placement, alignment, proportion)
3. Seeded deterministic PRNG
4. Formatting helpers
5. The KPI card (house signature)
6. Chart helpers (SVG, hand-rolled, no libraries)
7. The cross-filter state engine
8. Drill-through
9. Tooltips
10. Assembly checklist

---

## 1. Fixed-canvas shell + fit-to-viewport

Every mockup is a **1280x720** canvas that scales to fit its container, exactly like Power
BI's "Fit to page". All visuals sit at true pixel coordinates on that canvas.

```html
<div id="stage"><div id="canvas"><!-- header, nav, page go here --></div></div>
```
```css
html,body{margin:0;height:100%;overflow:hidden}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
#canvas{width:1280px;height:720px;transform-origin:center center;position:relative}
```
```js
function fit(){const st=document.querySelector('#stage'),cv=document.querySelector('#canvas');
  cv.style.transform='scale('+Math.min(st.clientWidth/1280,st.clientHeight/720)+')'}
addEventListener('resize',fit); fit();
```

Layout budget inside the canvas: a header band (~58-64px), an optional filter/period bar
(~34-44px), then the page area. Three rows of visuals fit comfortably; tune each visual's
height so the page fills the canvas without overflow (the QA sweep checks this).

---

## 2. Layout & composition

A mockup can have perfect numbers and still look amateurish if the frames don't line up.
Composition is not decoration — it is the difference between "a consultant made this" and
"someone dragged charts onto a canvas". Follow these rules.

### Filter placement — one axis, never split

Slicers and filters live in **one** place: either a **left sidebar** or a **top row** — never
both at once. Splitting filters across two edges makes the user hunt for controls and reads as
untidy. Pick one home for every slicer and keep them all there.

**The one permitted combination:** a **left filter sidebar** plus a **top bar reserved for
page navigation or bookmarks**. This is not mixing filters — it separates concerns cleanly:
the left axis filters the data, the top axis moves between pages/views. Filters never appear on
top in this arrangement; the top is only nav.

Decide by aesthetic (see `domain-knowledge.md`): corporate sober → left rail holding slicers
(and page buttons together); agency modern and executive minimal → a top strip holding page
nav and, on the same top axis, the filter chips/period controls.

### Density & the KPI band

- The **KPI band is always the top row, spanning the full content width** — a single clean
  band of equal-height cards. It is the first thing read; give it the top edge every time.
  Do not inset it or stack it in a side column.
- **Maximum three visuals per row.** Two reads spacious, three is the balanced default, four
  is too dense for a 1280-wide canvas and starts to crowd. If content needs more, add a row,
  not a fourth column. (The KPI band is exempt — it can hold 4-5 compact metric cards since
  they are lightweight.)
- **Always close the page with the full-width performance matrix** — the analytical table
  spanning all columns at the bottom, with a totals row and drill-through on each row. This is
  a signature element and a proven favourite; keep it on every report. It is usually the
  most-read part of the page, so give it room and never drop it to fit a decorative chart.

### Alignment — one shared column grid, edges line up top to bottom

This is a hard rule, not a preference. **The KPI band defines a master column grid, and every
row below composes its visuals as integer spans of that same grid**, so every card's left and
right edge lines up with an edge above it, all the way down the page. A visual whose edge
falls in the middle of a KPI card looks broken even when everything else is right.

Mechanics: the KPI band is N equal columns across the full content width (N = number of KPI
cards, usually 4-5). Compute one column width once, then size every visual as a whole number
of columns plus the gutters it swallows:

```js
const CW = 1254, G = 11, NCOL = 5;        // content width, gutter, number of KPI columns
const colW = (CW - (NCOL-1)*G) / NCOL;    // one grid column  (= 242 here)
const span = k => k*colW + (k-1)*G;       // width of a k-column visual (absorbs inner gutters)
// with NCOL=5, a 3-visual row that fills the width: span(2), span(2), span(1)
//   → 495 + 495 + 242, plus two 11px gutters = 1254 = CW exactly, edges aligned
```

So on a 5-KPI report a three-visual row is **2 + 2 + 1** columns (or 2+1+2, 1+2+2 — any integer
partition of 5). A two-visual row is 3 + 2. The closing matrix spans all 5. On a 4-KPI report,
partitions of 4: a three-visual row is 2 + 1 + 1, a two-visual row is 2 + 2 or 3 + 1. Never use
an off-grid width (like 604 / 328 / flex) that aligns with nothing above it.

**Vertical edge continuity across every row — pick one page split.** It is not enough that each
row is on-grid; the *same* column boundary must recur down the page so the dividers between
cards line up vertically from the KPI band through every row to the bottom matrix. Choose the
page's primary vertical split once and reuse it in every row. Concretely, if the KPI/level-2
boundary falls after column 3 (a 3+2 layout), level 3 must also break after column 3 — a
level-2 split of 3|2 with a level-3 split of 2|3 is exactly the misalignment to avoid.

**When a table is present, it anchors the split.** A matrix/table needs a certain width to hold
its columns comfortably; let that need decide where the page's primary boundary sits, then
compose every other row on that same boundary. So size the table first (give it the 2 or 3
columns its content wants), fix the page boundary there, and let the companion visuals in
other rows fill the remaining columns against it. Table width wins; the rest conforms.

Choose the partition so the hero visual gets the wider span and companions the narrower ones,
while still summing to N and honouring the page boundary. Keep the KPI count and the grid in
sync: 5 KPI cards → 5-column grid; 4 → 4-column grid.

### Other alignment details

- **Equal gutters** everywhere — the same gap between every pair of cards and every row
  (the examples use ~11-12px). The `span()` helper already assumes this gutter.
- Cards in the same row share the **same top and bottom edge** (equal height). A row of KPI
  cards is one clean band, not a ragged skyline.
- The KPI band spans the full content width as the top row; the closing matrix spans it as the
  bottom row; everything between aligns to the same left and right margins and the same grid.

### Proportion — harmonic and balanced

Aim for a balanced, harmonic ratio between visuals — no single element dwarfing the rest, no
cramped afterthoughts. Guidance that produces this:
- A wide "hero" visual paired with a narrower companion works well at roughly a **2:1 to
  3:2** width ratio (e.g. a 734px trend beside a ~470px matrix on a 1216px content width),
  rather than 50/50 which often feels static, or 4:1 which feels lopsided.
- Give the analytical matrix room — it is usually the most-read element; don't starve it to
  feed a decorative chart.
- Leave consistent breathing room at the page margins; a report that touches every edge feels
  tense. Balance density (enough to look substantial) against whitespace (enough to look
  considered).
- Vertical rhythm: rows should feel evenly weighted top to bottom, not front-loaded with a
  huge first row and a thin strip at the bottom.

When unsure, open the closest gold-standard example and match its grid: the column widths,
the 12px gutters, and the row proportions there are already tuned to these rules.

## 3. Seeded deterministic PRNG

Never use `Math.random()` — the mockup must regenerate identically. Use mulberry32:

```js
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=mulberry32(20260101);          // any fixed seed
const j=(lo,hi)=>lo+R()*(hi-lo);       // jitter in a range
const pick=(arr,ws)=>{let r=R()*ws.reduce((a,b)=>a+b,0);
  for(let i=0;i<arr.length;i++){r-=ws[i];if(r<=0)return arr[i]}return arr[arr.length-1]};
```

## 4. Formatting helpers

Match the author's conventions: compact currency with K/M, tabular figures, signed variances.

```js
const eur=(v,d=1)=>{const a=Math.abs(v),s=v<0?'−':'';
  if(a>=1e6)return s+'€'+(a/1e6).toFixed(d)+'M';
  if(a>=1e3)return s+'€'+Math.round(a/1e3)+'K'; return s+'€'+Math.round(a)};
const pc=(v,d=1)=>(v*100).toFixed(d)+'%';
const N=v=>Math.round(v).toLocaleString('en-US');
const sgp=(v,d=1)=>(v>0?'+':'−')+pc(Math.abs(v),d);   // signed percentage
const bps=v=>Math.abs(v)<5e-5?'flat':(v>0?'+':'−')+Math.abs(Math.round(v*10000))+'bps';
```
Always give numbers the class `tnum` with `font-variant-numeric:tabular-nums` so columns
align. Use a real minus sign `−` (U+2212), not a hyphen, for negatives in finance contexts.

## 5. The KPI card — house signature

The author's KPI card is instantly recognisable and must be consistent across every mockup:
a large value, a variance chip with ▲/▼, and a **dynamic descriptor line** reading
`PY <prior> | CY <current> | Var <delta>` (or a domain equivalent). Optionally a progress
bar with a target tick, or a sparkline.

**Always label the comparison basis on the variance.** Every variance must say whether it is
**YoY** (year over year) or **MoM** (month over month) — never leave the reader to guess. The
basis follows the selected date grain: a full year selected → YoY; a single month selected →
MoM; a quarter → YoY vs the same quarter last year (or QoQ if that is the report's convention,
but state it). Put the tag right after the percentage: `▲ 5,6% YoY`. Mirror it in the
descriptor line (`PY … | CY …` for YoY; `PM … | CM …` for MoM).

```js
function kpi(label,val,cur,ref,detail,o={}){
  const d=(ref&&isFinite(ref)&&Math.abs(ref)>1e-9)?(cur-ref)/Math.abs(ref):0;
  const cls=Math.abs(d)<.002?'fl':(d>0?(o.inv?'dn':'up'):(o.inv?'up':'dn')); // inv: lower is better
  const arw=Math.abs(d)<.002?'—':(d>0?'▲':'▼');
  const basis=o.basis||'YoY';                       // 'YoY' | 'MoM' | 'QoQ' — REQUIRED to be shown
  return `<div class="card kpi">
    <div class="k">${label}</div>
    <div class="vr"><div class="v tnum">${val}</div><div class="d ${cls} tnum">${arw} ${pc(Math.abs(d))} ${basis}</div></div>
    <div class="det tnum">${detail}</div></div>`;
}
// e.g. kpi('Fatturato', eur(rev,2), rev, prevRev, `PY ${eur(prevRev,2)} | CY ${eur(rev,2)} | Var ${sgp(g)}`, {basis:'YoY'})
```
`.up{color:green-ish}` `.dn{color:red-ish}` `.fl{color:muted}` — exact tokens per aesthetic
in `domain-knowledge.md`. The `inv` flag flips colour semantics for metrics where lower is
better (cost per lead, sales cycle, net debt / EBITDA).

## 6. Chart helpers

All charts are hand-rolled SVG — no chart library, so the file stays self-contained and every
element can carry a `data-tip` and a `data-f` (cross-filter) attribute. The gold-standard
files contain production versions of each; the essentials:

- **`axisTicks(max,n)`** — "nice" round tick values. Reuse everywhere for a clean Y axis.
- **Clustered column + line** — actual vs budget/prior bars with a target/rate line on a
  secondary axis. The workhorse for "X vs Y by month".
- **Waterfall / bridge** — revenue→EBITDA or PY→CY decomposition. Totals are dark; positive
  steps green, negative red.
- **Horizontal bars** — ranked lists (top customers, channels, sellers). Support a faint
  track behind each bar and an optional second overlaid value.
- **Donut** — mix by segment with centre total and a side legend. **Use only for 2-5
  categories**, ideally to dramatise a Pareto/dominant split; for 6+ or near-equal slices use a
  sorted horizontal bar or a 100% stacked bar instead (see `chart-selection.md`).
- **100% stacked bar** — composition / part-to-whole ("what share," not "how much"). 3-4 series.
- **Ribbon** — rank change over time; shows category crossings a grouped bar hides.
- **Pareto** — sorted bars with a cumulative-% line for 80/20 contribution stories.
- **Funnel** — stage-by-stage with step-conversion percentages. Core to pipeline pages.
- **Sparkline** — tiny inline trend for matrix rows.
- **Matrix / table** — the analytical heart. Rows carry `data-f` (cross-filter) and
  `data-drill` (drill-through). Include a totals row that recomputes with filters.

Two helpers for the less obvious charts (adapt colours to the aesthetic):

```js
// 100% STACKED BAR — composition. cats:[{id,l,c}], rows:[{l, vals:{id:number}}]
function stack100(w,h,cats,rows){
  const lw=96,m={t:6,r:10,b:6},rh=(h-m.t-m.b)/rows.length,bh=Math.min(20,rh*.6),iw=w-lw-m.r;
  let s=`<svg width="${w}" height="${h}">`;
  rows.forEach((row,i)=>{const y=m.t+rh*i+rh/2, tot=cats.reduce((a,c)=>a+(row.vals[c.id]||0),0)||1; let x=lw;
    s+=`<text x="${lw-8}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#6D747C">${row.l}</text>`;
    cats.forEach(c=>{const v=row.vals[c.id]||0, bl=v/tot*iw;
      s+=`<rect class="hit" x="${x.toFixed(1)}" y="${(y-bh/2).toFixed(1)}" width="${Math.max(0,bl-1).toFixed(1)}" height="${bh}" fill="${c.c}" data-f="cat:${c.id}" data-tip="<b>${row.l} · ${c.l}</b><br>${(v/tot*100).toFixed(1)}%"/>`;
      if(bl>34)s+=`<text x="${(x+bl/2).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#fff">${Math.round(v/tot*100)}%</text>`;
      x+=bl;});});
  return s+'</svg>';
}

// RIBBON — rank flow across periods. periods:[label], cats:[{id,l,c}], val(catId,periodIdx)->number
function ribbon(w,h,periods,cats,val){
  const m={t:14,r:10,b:20,l:34},iw=w-m.l-m.r,ih=h-m.t-m.b, gap=6;
  const X=i=>m.l+(iw/(periods.length-1))*i;
  const cols=periods.map((_,pi)=>{const arr=cats.map(c=>({c,v:val(c.id,pi)})).sort((a,b)=>b.v-a.v);
    const tot=arr.reduce((a,o)=>a+o.v,0)||1; let y=m.t; const pos={};
    arr.forEach(o=>{const bh=(o.v/tot)*(ih-gap*(cats.length-1)); pos[o.c.id]={y0:y,y1:y+bh}; y+=bh+gap;}); return pos;});
  let s=`<svg width="${w}" height="${h}">`;
  cats.forEach(c=>{ // ribbons between consecutive periods
    for(let p=0;p<periods.length-1;p++){const a=cols[p][c.id],b=cols[p+1][c.id],x1=X(p),x2=X(p+1),cx=(x1+x2)/2;
      s+=`<path d="M${x1},${a.y0} C${cx},${a.y0} ${cx},${b.y0} ${x2},${b.y0} L${x2},${b.y1} C${cx},${b.y1} ${cx},${a.y1} ${x1},${a.y1} Z" fill="${c.c}" opacity=".85"/>`;}
    periods.forEach((_,p)=>{const o=cols[p][c.id];
      s+=`<rect class="hit" x="${(X(p)-5).toFixed(1)}" y="${o.y0.toFixed(1)}" width="10" height="${Math.max(1,o.y1-o.y0).toFixed(1)}" fill="${c.c}" data-tip="<b>${c.l} · ${periods[p]}</b><br>${Math.round(val(c.id,p)).toLocaleString()}"/>`;});
  });
  periods.forEach((lb,p)=>s+=`<text x="${X(p).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="9" fill="#6D747C">${lb}</text>`);
  return s+'</svg>';
}
```

Every interactive `<rect>`/`<path>`/`<circle>`/`<tr>` gets:
```
class="hit"  data-tip="<b>Label</b><br>Metric: value"  data-f="dim:id"   (and data-drill for rows)
```
Dim non-selected elements with a `dimd` class (opacity ~.28) when a filter is active.

## 7. The cross-filter state engine

One state object drives the whole report. Every render reads it; every interaction mutates it
and re-renders. This is what makes clicks filter the page like Power BI.

```js
const S={page:'p1', period:'FY', seg:null, mo:null, drill:null, from:'p1'};

function filtered(rows){                 // apply current state to the fact table
  return rows.filter(r =>
    inPeriod(r.m) &&
    (!S.seg || r.seg===S.seg) &&
    (S.mo===null || r.m===S.mo));
}

document.addEventListener('click',e=>{
  const f=e.target.closest('[data-f]');
  if(f){const [k,v]=f.dataset.f.split(':');
    if(k==='mo'){S.mo=S.mo===+v?null:+v} else {S[k]=S[k]===v?null:v}  // toggle
    render(); return}
  // …nav buttons, period chips, reset handled similarly
});
```
Rules: clicking an already-selected item **toggles it off**. A "reset" control clears every
filter. Show active filters as removable pills in the header/filter bar. The totals row and
KPI band must recompute from `filtered(...)`, not from constants.

**Wire every global filter at ONE shared aggregation layer — never per-visual.** The single most
common cross-filter bug: adding a `.filter()` into one specific visual's data-build step. That
visual now responds; every other page and visual that doesn't happen to read the same array stays
inert, and the break is invisible until the user switches pages. Instead, route each filter
through the *same* shared slice/aggregation function the KPI band uses (one `entityShare()` /
`applyFilters()` returning a revenue/spend multiplier or a sliced fact set), and have every visual
consume it. One shared function per filter, consumed everywhere, is the only way to guarantee a
filter behaves identically on every page without re-auditing each visual after every change.

**Every filter shown in the toolbar must actually filter — no decorative filters.** A control that
updates a context pill but touches no data is indistinguishable from broken. If the mockup lacks
the grain to filter exactly (e.g. no per-customer-type fact table), drive the filter with a
documented share/weight model rather than leaving it inert — and label the approximation (tooltip
or glossary) rather than presenting it as exact. Silence is what makes "simplified" read as
"broken".

### Hierarchical date slicer (Power BI style) + the timeline exemption

Provide a **Year → Quarter → Month** date filter as a compact **dropdown** (a button that opens
a panel with the three levels), the way a Power BI report does — **not** a long row of chips and
**not** year+quarter only. The Month level is required. A full, working, copy-ready
implementation of this dropdown (button, panel, month-within-quarter disabling, and the state
wiring) lives in `assets/canonical-retail-fullspec.html` under `#slBtn` / `#slPanel`; copy it
rather than rebuilding, since this is the component most often dropped or simplified to chips.

**One critical exemption: the primary time-series / trend visual ignores the month and quarter
filter and always shows the full series.** This mirrors Power BI's "edit interactions" — you do
not want picking August to collapse the 12-month trend line to a single point. The trend keeps
its full timeline; everything else (KPI band, matrix, donut, bars) responds to the date
selection. Only the year level may narrow the trend (to that year's months); quarter and month
selections leave the trend untouched and instead highlight the selected span if anything.

```js
// state carries the grain and value
const S={ dateY:2025, dateQ:null, dateM:null, /* … */ };

function inDate(row, opts={}){                 // opts.timeline=true → ignore Q/M
  if(row.y !== S.dateY) return false;          // year always applies
  if(opts.timeline) return true;               // trend: year only, keep full series
  if(S.dateQ!==null && Math.floor(row.m/3)!==S.dateQ) return false;
  if(S.dateM!==null && row.m!==S.dateM) return false;
  return true;
}
// visuals: filtered(rows)            → uses inDate(r)          (respects Y/Q/M)
// the trend: rows.filter(r=>inDate(r,{timeline:true}))         (respects Y only)
```

Also: the date grain sets the KPI comparison basis (see §5) — a month selection makes the
cards read **MoM**, a year selection **YoY**. Keep the two in sync.

## 8. Drill-through

Right-click a matrix row → swap to a dedicated detail page filtered to that entity, with a
back button. Mirrors Power BI's drill-through page.

```js
document.addEventListener('contextmenu',e=>{
  const d=e.target.closest('[data-drill]'); if(!d) return;
  e.preventDefault();
  const [type,id]=d.dataset.drill.split(':');
  S.from = S.page==='drill' ? S.from : S.page;   // remember where we came from
  S.drill={type,id}; S.page='drill'; render();
});
// back button: S.page=S.from; S.drill=null; render();
```
The drill page reuses the KPI band and chart helpers, scoped to the selected entity, and
compares it against the same prior period as the main pages.

## 9. Tooltips

One floating element, positioned on mousemove, flipped near edges so it never clips.

```js
const tip=document.querySelector('#tip');
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');
  if(!t){tip.style.opacity=0;return} tip.innerHTML=t.getAttribute('data-tip'); tip.style.opacity=1});
document.addEventListener('mousemove',e=>{ if(tip.style.opacity==='1'){
  let x=e.clientX+14,y=e.clientY+16;
  if(x+tip.offsetWidth>innerWidth-8) x=e.clientX-tip.offsetWidth-14;
  if(y+tip.offsetHeight>innerHeight-8) y=e.clientY-tip.offsetHeight-14;
  tip.style.left=x+'px'; tip.style.top=y+'px'}});
```

## 10. Assembly checklist

- Header (brand + page nav) → filter/period bar → page area, all inside the 1280x720 canvas.
- Establish the master column grid from the KPI band (N columns) and size **every** visual
  below as an integer span of it, so all left/right edges align top to bottom (see §2).
- `render()` rebuilds the page area from `S`; call it once at load and after every mutation.
- KPI band first, then 1-2 rows of visuals composed on the grid, ending in the **full-width
  performance matrix** (spans all columns, totals row, drill-through).
- Every visual reads from `filtered(...)`; nothing is hard-coded.
- Cross-filter + drill-through + tooltips wired via event delegation on `document`.
- A `prefers-reduced-motion` guard disabling transitions.
- Fit-to-viewport called at load and on resize.
- Discreet "synthetic demonstration data" watermark.
