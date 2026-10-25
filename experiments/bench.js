/* Benchmark: node experiments/bench.js <config> <n> <seeds> [firstSeed]
   config: current | rect1 | rect07 (shaped, rectness 1.0 / 0.7). Prints one JSON line of raw results. */
const G=require('../js/generator.js'),S=require('./generator-shaped.js'),R=require('./difficulty.js');
const [cfg,nS,seedsS,firstS]=process.argv.slice(2),n=+nS,seeds=+seedsS||200,first=+firstS||1;

/* Counting clone of js/generator.js generate(): same random stream and output, plus attempt count. */
const D=[[1,0],[-1,0],[0,1],[0,-1]];
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=r()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function grow(n,p,r){const reg=Array(n*n).fill(-1),size=Array(n).fill(1);p.forEach((c,i)=>reg[i*n+c]=i);
  for(let left=n*n-n;left>0;left--){const cand=[];let tot=0;
    for(let k=0;k<n*n;k++){if(reg[k]!==-1)continue;const rr=k/n|0,cc=k%n;
      for(const[dr,dc]of D){const a=rr+dr,b=cc+dc;if(a<0||b<0||a>=n||b>=n)continue;const g=reg[a*n+b];
        if(g>=0){const w=1/Math.pow(size[g],1.5);tot+=w;cand.push([k,g,w])}}}
    let t=r()*tot,i=0;for(;i<cand.length-1;i++){t-=cand[i][2];if(t<=0)break}
    reg[cand[i][0]]=cand[i][1];size[cand[i][1]]++}
  return reg}
function connectedWithout(n,reg,g,skip){let start=-1,cnt=0;for(let k=0;k<n*n;k++)if(reg[k]===g&&k!==skip){cnt++;if(start<0)start=k}
  if(!cnt)return false;const seen=new Set([start]),st=[start];
  while(st.length){const k=st.pop(),rr=k/n|0,cc=k%n;for(const[dr,dc]of D){const a=rr+dr,b=cc+dc;if(a<0||b<0||a>=n||b>=n)continue;
    const q=a*n+b;if(q!==skip&&reg[q]===g&&!seen.has(q)){seen.add(q);st.push(q)}}}
  return seen.size===cnt}
function currentCounted(n,seed){const r=G.rng(seed);let attempts=0;
  for(;;){attempts++;const p=S.placeCats(n,r),reg=grow(n,p,r),truth=new Set(p.map((c,i)=>i*n+c));
    for(let it=0;it<n*n*4;it++){const sols=G.solutions(n,reg,2);
      if(sols.length===1){const colors=shuffle([...Array(10).keys()],r).slice(0,n);return{n,sol:p,reg,colors,attempts}}
      const alt=sols.find(s=>s.some((c,i)=>c!==p[i])),moves=[];
      alt.forEach((c,i)=>{const k=i*n+c;if(truth.has(k))return;const g=reg[k];
        for(const[dr,dc]of D){const a=i+dr,b=c+dc;if(a<0||b<0||a>=n||b>=n)continue;const h=reg[a*n+b];
          if(h!==g&&connectedWithout(n,reg,g,k))moves.push([k,h])}});
      if(!moves.length)break;const[k,h]=moves[r()*moves.length|0];reg[k]=h}}}

/* Shape key: the area's cells translated to the top-left corner (so a 2x3 block and a 3x2 block differ). */
function shapeKey(n,reg,g){const cs=[];for(let k=0;k<n*n;k++)if(reg[k]===g)cs.push([k/n|0,k%n]);
  const r0=Math.min(...cs.map(c=>c[0])),c0=Math.min(...cs.map(c=>c[1]));
  return cs.map(([a,b])=>(a-r0)+','+(b-c0)).sort().join(';')}

const out={cfg,n,seeds,rows:[]};
for(let seed=first;seed<first+seeds;seed++){const t=process.hrtime.bigint();let P,attempts;
  if(cfg==='current'){P=currentCounted(n,seed);attempts=P.attempts;
    if(seed<first+3){const Q=G.generate(n,seed);if(Q.reg.join()!==P.reg.join())throw new Error('clone mismatch')}}
  else{P=S.generate(n,seed,{rectness:cfg==='rect1'?1:0.7});attempts=P.stats.restarts+1}
  const ms=Number(process.hrtime.bigint()-t)/1e6;
  if(G.solutions(n,P.reg,2).length!==1)throw new Error('not unique '+seed);
  const rt=R.rate(P),shapes=[],sizes=[];let rects=0,defect=0,blockFill=0,minSize=n*n;
  for(let g=0;g<n;g++){const s=S.shapeOf(n,P.reg,g);shapes.push(shapeKey(n,P.reg,g));sizes.push(s.cnt);
    if(s.rect)rects++;defect+=s.defect;let inb=0;for(let i=s.block.r0;i<s.block.r0+s.block.h;i++)for(let j=s.block.c0;j<s.block.c0+s.block.w;j++)if(P.reg[i*n+j]===g)inb++;blockFill+=inb/s.cnt;minSize=Math.min(minSize,s.cnt)}
  out.rows.push({seed,ms,attempts,level:rt.level,steps:rt.steps,uses:rt.uses,shapes,sizes,rects,defect,blockFill:blockFill/n,minSize})}
console.log(JSON.stringify(out));
