/* Render every fixture into out/. */
'use strict';
const fs = require('fs');
const path = require('path');
const { render, lint, toolbarBudget } = require('./render.js');
const fixtures = require('./specs/index.js');

const out = path.join(__dirname, '..', 'out');
fs.mkdirSync(out, { recursive: true });

Object.keys(fixtures).forEach(id => {
  const { spec, build } = fixtures[id];
  const data = build();
  const html = render(spec, data);
  const file = path.join(out, id + '.html');
  fs.writeFileSync(file, html);
  const tb = toolbarBudget(spec, data);
  console.log(`${id.padEnd(20)} ${(Buffer.byteLength(html) / 1024).toFixed(1)}KB  ${String(html.split('\n').length).padStart(4)} lines  ` +
    `${spec.aesthetic.padEnd(18)} toolbar ${tb.used}/${tb.available}px  tie-out ${JSON.stringify(data.tieOut || {})}`);
  lint(spec, data).forEach(w => console.log('   note ' + w));
});
