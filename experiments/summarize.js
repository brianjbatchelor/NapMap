/* Summarize bench.js output: node experiments/summarize.js <dir-with-json>  -> markdown tables */
const fs=require('fs'),path=require('path'),dir=process.argv[2];
const runs={};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const txt=fs.readFileSync(path.join(dir,f),'utf8').trim();if(!txt)continue;
  const o=JSON.parse(txt),k=o.cfg+'|'+o.n;(runs[k]=runs[k]||{cfg:o.cfg,n:o.n,rows:[]}).rows.push(...o.rows)}
const CF=['current','rect1','rect07'],LBL={current:'Current (free shapes)',rect1:'Shaped, rectness 1.0',rect07:'Shaped, rectness 0.7'};
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
const pct=(x,t)=>Math.round(100*x/t)+'%',f1=x=>x.toFixed(1),ms=x=>x<10?x.toFixed(1)+' ms':x<1000?Math.round(x)+' ms':(x/1000).toFixed(1)+' s';
const L=[];const sizes=[6,7,8,9,10];
const get=(c,n)=>runs[c+'|'+n];
L.push('### Generation time and success\n');
L.push('| Size | Generator | Puzzles | Median time | p90 time | Unique puzzle on first layout | Layouts tried (avg) |');
L.push('|---|---|---|---|---|---|---|');
for(const n of sizes)for(const c of CF){const R=get(c,n);if(!R)continue;const r=R.rows;
  L.push(`| ${n}×${n} | ${LBL[c]} | ${r.length} | ${ms(q(r.map(x=>x.ms),.5))} | ${ms(q(r.map(x=>x.ms),.9))} | ${pct(r.filter(x=>x.attempts===1).length,r.length)} | ${f1(r.reduce((s,x)=>s+x.attempts,0)/r.length)} |`)}
L.push('\n### Difficulty (hardest rule a human needs)\n');
L.push('| Size | Generator | Single | Line | Group | What-if | Needs guessing | Median steps |');
L.push('|---|---|---|---|---|---|---|---|');
for(const n of sizes)for(const c of CF){const R=get(c,n);if(!R)continue;const r=R.rows,cnt=l=>pct(r.filter(x=>x.level===l).length,r.length);
  L.push(`| ${n}×${n} | ${LBL[c]} | ${cnt(1)} | ${cnt(2)} | ${cnt(3)} | ${cnt(4)} | ${cnt(5)} | ${q(r.map(x=>x.steps),.5)} |`)}
L.push('\n### Variety and shape\n');
L.push('| Size | Generator | Distinct layouts (area-shape sets) | Distinct area shapes seen | Top-10 shapes cover | Perfect rectangles | Cells off-rectangle per puzzle | Area size spread (avg std dev) | Puzzles with a 1-cell area | Furniture block covers |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for(const n of sizes)for(const c of CF){const R=get(c,n);if(!R)continue;const r=R.rows;
  const sets=new Set(r.map(x=>[...x.shapes].sort().join('|'))),shapeCount={};let areas=0;
  for(const x of r)for(const s of x.shapes){shapeCount[s]=(shapeCount[s]||0)+1;areas++}
  const top=Object.values(shapeCount).sort((a,b)=>b-a).slice(0,10).reduce((a,b)=>a+b,0);
  const sd=r.map(x=>{const m=x.sizes.reduce((a,b)=>a+b)/n;return Math.sqrt(x.sizes.reduce((a,b)=>a+(b-m)**2,0)/n)});
  L.push(`| ${n}×${n} | ${LBL[c]} | ${sets.size}/${r.length} | ${Object.keys(shapeCount).length} | ${pct(top,areas)} | ${pct(r.reduce((s,x)=>s+x.rects,0),areas)} | ${f1(r.reduce((s,x)=>s+x.defect,0)/r.length)} | ${f1(sd.reduce((a,b)=>a+b)/sd.length)} | ${pct(r.filter(x=>x.minSize===1).length,r.length)} | ${pct(r.reduce((s,x)=>s+x.blockFill,0),r.length)} |`)}
console.log(L.join('\n'));
