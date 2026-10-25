/* NapMap experiment: furniture-SHAPED areas. Same output as SunGen.generate: {n, sol, reg, colors}.

   Important finding (see REPORT.md): if EVERY area is a perfect rectangle, the puzzle never has a unique
   solution (checked exhaustively for 5x5 and 6x6, and in large samples for bigger boards).
   So "rectness" controls how few cells may break the rectangle look:
     defect of an area = fewest cells to add or remove to turn it into a rectangle (a notch or bump = 1)
     rectness 1.0  -> as rectangular as possible: total defect starts at the smallest budget that works
                      for the size (1 cell at 6x6, ~4 at 8x8, ~12 at 10x10) and grows only if needed
     rectness 0.7  -> that floor plus about 0.6*n cells, each area at most 3 cells off
     rectness 0    -> loose blocks (each area at most 6 cells off a rectangle)

   Method:
   1. Random valid cat layout (one per row/column, no touching).
   2. Guillotine-cut the board into n rectangles, each holding exactly one cat.
   3. Repair, like js/generator.js: find a second solution, pick one of its cells, and change that cell's
      area so the second solution breaks. Moves (never touching a cat's own cell): re-cut 2-3 neighbouring
      rectangles whose union is a rectangle; slide a full edge strip to the neighbouring rectangle; hand
      the single cell to a neighbour (only inside the defect budget). Repeat until exactly one solution.
      Restart with a new cat layout if stuck.
   Deterministic per (n, seed, rectness). Node: require('./generator-shaped.js'); browser: window.ShapedGen. */
(function(root){
const Sun=root.SunGen||(typeof require!=='undefined'?require('../js/generator.js'):null);
const {rng,solutions}=Sun;
const D=[[1,0],[-1,0],[0,1],[0,-1]];
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=r()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function placeCats(n,r){const p=[],used=Array(n).fill(false);
  (function bt(i){if(i===n)return true;for(const c of shuffle([...Array(n).keys()],r)){
    if(used[c]||(i>0&&Math.abs(p[i-1]-c)<=1))continue;used[c]=true;p[i]=c;if(bt(i+1))return true;used[c]=false}return false})(0);
  return p}

/* Random guillotine cut of window (R0,C0,H,W) so each piece holds exactly one cat (ids = cat row).
   Pieces thinner than 1:5 are avoided where possible; no furniture is that shape. */
function cutWindow(n,p,r,reg,R0,C0,H,W){
  const catsIn=(r0,c0,h,w)=>{const out=[];for(let i=r0;i<r0+h;i++)if(p[i]>=c0&&p[i]<c0+w)out.push(i);return out};
  (function cut(r0,c0,h,w){const cats=catsIn(r0,c0,h,w);
    if(cats.length===1){for(let i=r0;i<r0+h;i++)for(let j=c0;j<c0+w;j++)reg[i*n+j]=cats[0];return}
    const opts=[],thin=(k,a,b)=>k===1&&Math.max(a,b)/Math.min(a,b)>5;
    for(let t=1;t<h;t++){const k1=catsIn(r0,c0,t,w).length,k2=cats.length-k1;if(!k1||!k2)continue;
      opts.push([0,t,(thin(k1,t,w)||thin(k2,h-t,w))?0.05:1])}
    for(let t=1;t<w;t++){const k1=catsIn(r0,c0,h,t).length,k2=cats.length-k1;if(!k1||!k2)continue;
      opts.push([1,t,(thin(k1,h,t)||thin(k2,h,w-t))?0.05:1])}
    let x=r()*opts.reduce((s,o)=>s+o[2],0),o=opts[opts.length-1];
    for(const q of opts){x-=q[2];if(x<=0){o=q;break}}
    if(o[0]===0){cut(r0,c0,o[1],w);cut(r0+o[1],c0,h-o[1],w)}else{cut(r0,c0,h,o[1]);cut(r0,c0+o[1],h,w-o[1])}})(R0,C0,H,W)}
function partition(n,p,r){const reg=Array(n*n).fill(-1);cutWindow(n,p,r,reg,0,0,n,n);return reg}

/* Shape of one area: size, bounding box, and defect (fewest cells to add/remove to make a rectangle),
   plus that best rectangle (the block the furniture is drawn in). */
function shapeOf(n,reg,g){let cnt=0,r0=n,r1=-1,c0=n,c1=-1;
  for(let k=0;k<n*n;k++)if(reg[k]===g){cnt++;const a=k/n|0,b=k%n;if(a<r0)r0=a;if(a>r1)r1=a;if(b<c0)c0=b;if(b>c1)c1=b}
  const h=r1-r0+1,w=c1-c0+1;
  if(!cnt)return{cnt,defect:Infinity};
  if(cnt===h*w)return{cnt,r0,c0,h,w,rect:true,defect:0,block:{r0,c0,h,w}};
  const W1=w+1,S=Array((h+1)*W1).fill(0);
  for(let i=0;i<h;i++)for(let j=0;j<w;j++)S[(i+1)*W1+j+1]=(reg[(r0+i)*n+c0+j]===g?1:0)+S[i*W1+j+1]+S[(i+1)*W1+j]-S[i*W1+j];
  let best=Infinity,block=null;
  for(let a=0;a<h;a++)for(let b=a+1;b<=h;b++)for(let c=0;c<w;c++)for(let d=c+1;d<=w;d++){
    const inside=S[b*W1+d]-S[a*W1+d]-S[b*W1+c]+S[a*W1+c],area=(b-a)*(d-c),df=cnt+area-2*inside;
    if(df<best||(df===best&&area>block.h*block.w)){best=df;block={r0:r0+a,c0:c0+c,h:b-a,w:d-c}}}
  return{cnt,r0,c0,h,w,rect:false,defect:best,block}}
function connected(n,reg,g){let start=-1,cnt=0;for(let k=0;k<n*n;k++)if(reg[k]===g){cnt++;if(start<0)start=k}
  if(!cnt)return false;const seen=new Set([start]),st=[start];
  while(st.length){const k=st.pop(),a=k/n|0,b=k%n;for(const[dr,dc]of D){const x=a+dr,y=b+dc;if(x<0||y<0||x>=n||y>=n)continue;
    const q=x*n+y;if(reg[q]===g&&!seen.has(q)){seen.add(q);st.push(q)}}}
  return seen.size===cnt}
function totalDefect(n,reg){let t=0;for(let g=0;g<n;g++)t+=shapeOf(n,reg,g).defect;return t}

/* All moves target cell k (a cell used by some other solution), so that solution stops working.
   Move A: re-cut reg[k]'s rectangle together with 1-2 neighbours whose union is a rectangle. */
function nbOf(n,reg,g){const nb=new Set();for(let q=0;q<n*n;q++)if(reg[q]===g){const a=q/n|0,b=q%n;
    for(const[dr,dc]of D){const x=a+dr,y=b+dc;if(x<0||y<0||x>=n||y>=n)continue;const h=reg[x*n+y];if(h!==g)nb.add(h)}}return[...nb]}
function recut(n,reg,p,r,k){const g=reg[k],nbs=nbOf(n,reg,g),groups=[];
  for(const h of nbs){groups.push([g,h]);for(const h2 of nbs)if(h2>h)groups.push([g,h,h2])}
  for(const grp of shuffle(groups,r)){let r0=n,r1=-1,c0=n,c1=-1,cnt=0;
    for(let q=0;q<n*n;q++)if(grp.includes(reg[q])){cnt++;const a=q/n|0,b=q%n;if(a<r0)r0=a;if(a>r1)r1=a;if(b<c0)c0=b;if(b>c1)c1=b}
    const h=r1-r0+1,w=c1-c0+1;if(cnt!==h*w)continue;
    const out=reg.slice();cutWindow(n,p,r,out,r0,c0,h,w);if(out[k]!==reg[k])return out}
  return null}
/* Move B: the full edge strip of reg[k]'s rectangle through k moves to the neighbouring rectangle, if both stay rectangles. */
function strip(n,reg,p,r,k){const g=reg[k],s=shapeOf(n,reg,g);if(!s.rect)return null;const cat=new Set(p.map((c,i)=>i*n+c));
  const a=k/n|0,b=k%n,opts=[];
  if(a===s.r0&&s.h>1)opts.push([[a,s.c0,1,s.w],[-1,0]]);if(a===s.r0+s.h-1&&s.h>1)opts.push([[a,s.c0,1,s.w],[1,0]]);
  if(b===s.c0&&s.w>1)opts.push([[s.r0,b,s.h,1],[0,-1]]);if(b===s.c0+s.w-1&&s.w>1)opts.push([[s.r0,b,s.h,1],[0,1]]);
  for(const[[r0,c0,h,w],[dr,dc]]of shuffle(opts,r)){const out=reg.slice();let to=-2,ok=true;
    for(let i=r0;i<r0+h&&ok;i++)for(let j=c0;j<c0+w;j++){const q=i*n+j,x=i+dr,y=j+dc;
      if(cat.has(q)||x<0||y<0||x>=n||y>=n){ok=false;break}const t=reg[x*n+y];if(to===-2)to=t;else if(t!==to){ok=false;break}out[q]=t}
    if(ok&&shapeOf(n,out,to).rect)return out}
  return null}
/* Move C: hand cell k to a neighbouring area (L-shapes, notches, bumps), within the defect budget. */
function single(n,reg,p,r,lim,k){const a=k/n|0,b=k%n,from=reg[k];
  for(const[dr,dc]of shuffle(D.slice(),r)){const x=a+dr,y=b+dc;if(x<0||y<0||x>=n||y>=n)continue;const to=reg[x*n+y];if(to===from)continue;
    const out=reg.slice();out[k]=to;if(!connected(n,out,from))continue;
    const s1=shapeOf(n,out,to),s2=shapeOf(n,out,from);if(s1.defect>lim.per||s2.defect>lim.per)continue;
    if(totalDefect(n,out)<=lim.total)return out}
  return null}

/* Smallest total defect that reliably yields unique puzzles grows with size (measured: 6x6 1, 8x8 ~4, 10x10 ~12). */
const floorDefect=n=>Math.max(1,Math.round(0.5*(n-5)*(n-5)));
function limits(n,rectness){const x=1-Math.max(0,Math.min(1,rectness));
  return{total:floorDefect(n)+Math.round(x*n*2),per:Math.max(n>=9?3:n>=8?2:1,Math.min(6,1+Math.round(x*7)))}}
function generate(n,seed,opts={}){const rectness=opts.rectness==null?1:opts.rectness,r=rng(seed);
  const lim=limits(n,rectness),maxIt=opts.maxIt||n*n*4,stats={restarts:0,evals:0,budget:lim.total};
  for(;;){const p=placeCats(n,r),truth=new Set(p.map((c,i)=>i*n+c));let reg=partition(n,p,r);
    for(let it=0;it<maxIt;it++){const sols=solutions(n,reg,2);stats.evals++;
      if(sols.length===1){const colors=shuffle([...Array(10).keys()],r).slice(0,n);stats.defect=totalDefect(n,reg);
        return{n,sol:p,reg,colors,stats}}
      const alt=sols.find(s=>s.some((c,i)=>c!==p[i])),ks=[];
      alt.forEach((c,i)=>{const k=i*n+c;if(!truth.has(k))ks.push(k)});
      let out=null;
      for(const k of shuffle(ks,r)){const x=r();
        const order=x<0.45?['C','A','B']:x<0.8?['A','B','C']:['B','A','C'];
        for(const m of order){out=m==='A'?recut(n,reg,p,r,k):m==='B'?strip(n,reg,p,r,k):single(n,reg,p,r,lim,k);if(out)break}
        if(out)break}
      if(!out)break;reg=out}
    stats.restarts++;
    /* rectness 1.0 starts with a 1-cell budget; if that keeps failing, allow one more cell */
    if(!opts.fixed&&stats.restarts%8===0&&lim.total<2*n){lim.total++;if(lim.per<3)lim.per++;stats.budget=lim.total}
    if(opts.maxRestarts&&stats.restarts>=opts.maxRestarts)return null}}

root.ShapedGen={generate,partition,shapeOf,placeCats,totalDefect,limits,floorDefect};
if(typeof module!=='undefined')module.exports=root.ShapedGen;
})(typeof window!=='undefined'?window:globalThis);
