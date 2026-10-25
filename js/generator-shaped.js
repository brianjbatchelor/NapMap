/* NapMap shaped generator: furniture-SHAPED areas for the "Cozy" and "Boxy" board styles.
   Same output as SunGen.generate: {n, sol, reg, colors}, with colors (the bed type of each area) picked by the
   shape of the area's largest inner rectangle, so tall blocks get tall furniture and wide blocks wide furniture.
   Promoted from experiments/generator-shaped.js (the research record, see experiments/REPORT.md).

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
   Deterministic per (n, seed, rectness). Node: require('./generator-shaped.js'); browser: window.ShapedGen.
   STYLES maps the board styles to rectness: cozy 0.7, boxy 1.0. */
(function(root){
const Sun=root.SunGen||(typeof require!=='undefined'?require('./generator.js'):null);
const {rng}=Sun;
/* Same result as SunGen.solutions (the first `limit` solutions in the same row-by-row order), only faster:
   bitmasks for used columns and areas, and a cut as soon as some area without a cat has no free column left
   in the rows still to fill. */
function solutions(n,reg,limit){const out=[],pos=[],suf=new Int32Array((n+1)*n);
  for(let r=n-1;r>=0;r--)for(let g=0;g<n;g++){let m=suf[(r+1)*n+g];for(let c=0;c<n;c++)if(reg[r*n+c]===g)m|=1<<c;suf[r*n+g]=m}
  const full=(1<<n)-1;
  (function bt(i,cm,gm,prev){if(i===n){out.push(pos.slice());return}
    const free=~cm&full,base=i*n;
    for(let g=0;g<n;g++)if(!(gm>>g&1)&&!(suf[base+g]&free))return;
    for(let c=0;c<n;c++){if(cm>>c&1||(c>=prev-1&&c<=prev+1))continue;const g=reg[base+c];if(gm>>g&1)continue;
      pos[i]=c;bt(i+1,cm|1<<c,gm|1<<g,c);if(out.length>=limit)return}})(0,0,0,-9);
  return out}
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

/* Largest rectangle lying fully inside area g (ties: closer to square). js/furniture.js draws the room-style art
   in this rectangle, anchored to its bottom edge, and bedsByShape picks the furniture by its aspect. */
function innerRect(n,reg,g){let best=null,ba=-1;
  for(let r0=0;r0<n;r0++)for(let c0=0;c0<n;c0++){if(reg[r0*n+c0]!==g)continue;
    for(let r1=r0;r1<n&&reg[r1*n+c0]===g;r1++)for(let c1=c0;c1<n;c1++){let ok=true;
      for(let r=r0;r<=r1;r++)if(reg[r*n+c1]!==g){ok=false;break}if(!ok)break;
      const h=r1-r0+1,w=c1-c0+1,a=h*w*10-Math.abs(h-w);if(a>ba){ba=a;best={r0,c0,h,w}}}}
  return best}
/* Bed type (index into the 10 furniture drawings) per area, by block shape, all distinct:
   tall blocks get the cat tree or teepee, wide ones the couch, blankets, hammock or box, the rest cushions and beds.
   Most elongated blocks choose first; a block whose pool is used up borrows from the nearest pool. */
const TALL=[2,7],WIDE=[9,1,4,5],SQUARE=[0,3,6,8];
const kindOf=b=>{const ar=b.w/b.h;return ar>=1.5?'wide':ar<=1/1.5?'tall':'sq'};
function bedsByShape(n,reg,r){const blocks=[];for(let g=0;g<n;g++)blocks[g]=innerRect(n,reg,g);
  const pools={tall:shuffle(TALL.slice(),r),wide:shuffle(WIDE.slice(),r),sq:shuffle(SQUARE.slice(),r)};
  const order={tall:['tall','sq','wide'],wide:['wide','sq','tall'],sq:['sq','wide','tall']};
  const elong=b=>Math.abs(Math.log(b.h/b.w));
  const gs=[...Array(n).keys()].sort((a,b)=>elong(blocks[b])-elong(blocks[a])||a-b),out=[];
  for(const g of gs){const k=kindOf(blocks[g]);for(const pk of order[k])if(pools[pk].length){out[g]=pools[pk].shift();break}}
  return out}

/* Smallest total defect that reliably yields unique puzzles grows with size (measured: 6x6 1, 8x8 ~4, 10x10 ~12). */
const floorDefect=n=>Math.max(1,Math.round(0.5*(n-5)*(n-5)));
function limits(n,rectness){const x=1-Math.max(0,Math.min(1,rectness));
  return{total:floorDefect(n)+Math.round(x*n*2),per:Math.max(n>=9?3:n>=8?2:1,Math.min(6,1+Math.round(x*7)))}}
function generate(n,seed,opts={}){const rectness=opts.rectness==null?1:opts.rectness,r=rng(seed);
  const lim=limits(n,rectness),maxIt=opts.maxIt||n*n*4,stats={restarts:0,evals:0,budget:lim.total};
  for(;;){const p=placeCats(n,r),truth=new Set(p.map((c,i)=>i*n+c));let reg=partition(n,p,r);
    for(let it=0;it<maxIt;it++){const sols=solutions(n,reg,2);stats.evals++;
      if(sols.length===1){const colors=bedsByShape(n,reg,r);stats.defect=totalDefect(n,reg);
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

const STYLES={cozy:0.7,boxy:1};
root.ShapedGen={generate,solutions,partition,shapeOf,placeCats,totalDefect,limits,floorDefect,innerRect,bedsByShape,kindOf,STYLES,TALL,WIDE,SQUARE};
if(typeof module!=='undefined')module.exports=root.ShapedGen;
})(typeof window!=='undefined'?window:globalThis);
