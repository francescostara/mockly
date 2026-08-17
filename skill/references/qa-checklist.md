# QA Checklist

Do not ship a mockup without this pass. A mockup that breaks on the third filter click, or
overflows the canvas, or shows a `NaN`, destroys the credibility the whole artifact exists to
build. This sweep is cheap and catches the embarrassing failures.

## The four gates

### 1. State sweep — no broken values in any state
Programmatically visit every combination of page × period/slicer × cross-filter × drill-through
and scan the rendered page for `NaN`, `undefined`, `Infinity`. This is the single most
valuable check: these bugs hide in filter states you'd never click by hand.

### 2. Tie-out — the numbers reconcile
Confirm that figures which should match do match (sales total = finance revenue; totals row =
sum of visible rows; weighted pipeline = Σ value×probability). Print the key aggregates and
eyeball them against expectations.

### 3. Fit-to-canvas — nothing overflows 720px
Sum the heights of the header, filter bar, and each page row; confirm each page fits within
720px with a little breathing room. Tune visual heights if a page overflows or leaves a gap.

### 4. Domain plausibility — an expert would accept it
The human read from `data-realism.md`: win rates, leverage, margins, engagement rates all in
believable ranges. No segment with impossible numbers.

### Gate 5 — every filter actually filters (not inert)
The NaN/undefined/Infinity sweep is necessary but **not sufficient**: it catches *broken*
states, not *inert* ones — a filter that updates `S` and re-renders cleanly while every value on
screen still reads the unfiltered total passes the sweep and is indistinguishable from broken to
the user. Add a positive assertion: for each filter, capture a representative KPI card's **text
content**, apply the filter, and assert the text **changed** (before !== after) — not merely that
a `dim`/`sel` CSS class toggled. One number per filter is enough to catch this whole class.
```js
const before = d.querySelector('#page .kpi .v').textContent;
clk('[data-f="country:de"]');
const after  = d.querySelector('#page .kpi .v').textContent;
console.log(before!==after ? 'country filter LIVE' : 'country filter INERT — bug');
```

### Gate 6 — toolbar / filter-bar width budget
jsdom does not compute layout, so a filter bar that overflows the 1280 canvas never shows up in
the harness — it just clips silently in a real browser. Budget the header/toolbar width the same
way page height is budgeted: sum the fixed-width controls and assert the total is comfortably
under the content width **before** considering the bar done. Any filter for a dimension with more
than ~4-5 members must be a **dropdown**, not a per-value chip row (8 country chips + 6 channel
chips + 4 dropdowns ≈ 1790px will silently clip in a 1240px bar).

## Ready headless harness

Run the file through jsdom and drive it. Adapt the selectors to the mockup's actual controls.

```bash
npm install jsdom --silent
```
```js
const {JSDOM}=require('jsdom'); const fs=require('fs');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window, d=w.document;
const clk=s=>{const e=d.querySelector(s); if(e)e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))};
const rmb=s=>{const e=d.querySelector(s); if(e)e.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}))};

setTimeout(()=>{
  if(!d.querySelector('#page').innerHTML.length){console.log('RENDER FAILED');return}
  let bad=0,n=0;
  const scan=t=>{n++; const h=d.querySelector('#page').innerHTML;
    if(['NaN','undefined','Infinity'].some(x=>h.includes(x))){bad++; if(bad<6) console.log('BAD',t)}};

  // enumerate YOUR controls — pages, period chips, slicers:
  for(const pg of ['p1','p2'])
    for(const per of ['FY','H1','H2','Q4']){
      clk(`[data-page=${pg}]`); clk(`[data-per=${per}]`); scan(pg+per);
      // every cross-filter target on the page:
      [...d.querySelectorAll('#page [data-f]')].slice(0,6).forEach(el=>{
        el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); scan('xf');
        el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));   // toggle back
      });
      // every drill target:
      [...d.querySelectorAll('#page [data-drill]')].slice(0,3).forEach(el=>{
        el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
        scan('drill'); clk('#btnBack');
      });
    }
  console.log('states tested:',n, bad?`${bad} BROKEN`:'ALL CLEAN');

  // spot-check the aggregates for the tie-out gate:
  // console.log('revenue', ..., 'ties to sales', ...);
}, 700);
```

Interpretation: `ALL CLEAN` across a few hundred states is the bar. Any `BAD` state points at
an unguarded divide-by-zero or a missing filter branch — fix the generator, not the symptom
(guard ratios: `den ? num/den : 0`).

## Model floor

Generating a correct interactive mockup — working cross-filter, a hierarchical date slicer,
drill-through, an aligned grid, and clean data across all states — needs a capable model.
In testing, a small/fast model produced broken output: dead filters, an empty matrix, and
misaligned cards. Treat **Sonnet-class as the minimum**; do not ship the product on the
smallest tier. Measure cost on Sonnet first (below); only test a cheaper tier against the full
eval gate before trusting it, and expect it to fail the interactive assertions.

## Cost measurement (do this once, early)

The first time the skill generates a real mockup, record token usage in and out. That number
is what turns the pricing model from a guess into a fact: cost per generation drives the
credit allowance in each plan. Note it and report it back.

## Pre-delivery final checks
- Single self-contained file, opens from `file://`, no console errors, no external requests.
- `prefers-reduced-motion` respected.
- "Synthetic demonstration data" watermark present and discreet.
- Canvas scales cleanly at multiple container sizes (fit-to-viewport working).
- Saved to the outputs directory and presented, with a two-line Vercel deploy + iframe note.
