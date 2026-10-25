/* NapMap difficulty: a human-style deduction solver on a candidate grid. Pure, no DOM.
   Rules, simplest first (the level is the hardest rule a puzzle needs):
     L1 "only"    a row, column or area with one open spot gets a cat (its row, column, area and 8 neighbours are crossed out)
     L2 "line"    an area whose open spots sit in one row/column clears the rest of that line, and the reverse
     L3 "squeeze" a spot whose cat would block every open spot of some row, column or area is crossed out
     L4 "group"   k areas confined to the same k rows/columns clear the rest of those lines (k >= 2), and the reverse
     L5           the rules stall, so the puzzle needs guessing
   API:
     rate(puzzle)                    -> {level, steps, ruleCounts}
     nextStep(puzzle, state, {names}) -> next simplest deduction from a player's board (see nextStep below)
     generateRated(n, seed, target)  -> SunGen.generate output plus {rating, tries}; target {min, max, minSteps, tries}
     TARGETS                         -> target per game mode
   Puzzle: {n, reg, sol?}. State: per cell 0 empty, 1 crossed, 2 cat, 3 wrong guess (counts as crossed). */
(function(root){
const OPEN=0,X=1,CAT=2;

function context(P){const n=P.n,N=n*n,rows=[],cols=[],areas=[];
  for(let i=0;i<n;i++){rows.push([]);cols.push([]);areas.push([])}
  for(let k=0;k<N;k++){rows[k/n|0].push(k);cols[k%n].push(k);areas[P.reg[k]].push(k)}
  const units=[];
  for(let i=0;i<n;i++)units.push({type:'row',index:i,cells:rows[i]});
  for(let i=0;i<n;i++)units.push({type:'col',index:i,cells:cols[i]});
  for(let i=0;i<n;i++)units.push({type:'area',index:i,cells:areas[i]});
  /* peer[k*N+q]: a cat at k rules out q (same row, column or area, or touching) */
  const peer=new Uint8Array(N*N),peers=[];
  for(let k=0;k<N;k++){const r=k/n|0,c=k%n,g=P.reg[k],list=[];
    for(let q=0;q<N;q++){if(q===k)continue;const a=q/n|0,b=q%n;
      if(a===r||b===c||P.reg[q]===g||(Math.abs(a-r)<=1&&Math.abs(b-c)<=1)){peer[k*N+q]=1;list.push(q)}}
    peers.push(list)}
  return {n,N,reg:P.reg,rows,cols,areas,units,peer,peers}}

const hasCat=(st,cells)=>cells.some(k=>st[k]===CAT);
const openOf=(st,cells)=>cells.filter(k=>st[k]===OPEN);

/* Each finder returns the first deduction of its kind, or null. Steps: {rule, level, place?, cross[], units[]} */
function findPeers(C,st){ // tidy-up of a cat the player placed without crossing around it
  for(let k=0;k<C.N;k++){if(st[k]!==CAT)continue;const cross=C.peers[k].filter(q=>st[q]===OPEN);
    if(cross.length)return {rule:'peers',level:1,cat:k,cross,units:[]}}
  return null}
function findOnly(C,st){
  for(const u of C.units){if(hasCat(st,u.cells))continue;const open=openOf(st,u.cells);
    if(open.length===0)return {rule:'stuck',level:5,cross:[],units:[u]};
    if(open.length===1)return {rule:'only',level:1,place:open[0],cross:C.peers[open[0]].filter(q=>st[q]===OPEN),units:[u]}}
  return null}
function findLine(C,st){const n=C.n;
  const areaU=C.units.slice(2*n),lineU=C.units.slice(0,2*n);
  for(const dir of ['row','col'])for(const a of areaU){if(hasCat(st,a.cells))continue;const open=openOf(st,a.cells);if(!open.length)continue;
    const idx=open.map(k=>dir==='row'?k/n|0:k%n);if(!idx.every(i=>i===idx[0]))continue;
    const line=C.units[(dir==='row'?0:n)+idx[0]],cross=line.cells.filter(k=>st[k]===OPEN&&C.reg[k]!==a.index);
    if(cross.length)return {rule:'line',level:2,dir:'area',cross,units:[a,line]}}
  for(const line of lineU){if(hasCat(st,line.cells))continue;const open=openOf(st,line.cells);if(!open.length)continue;
    const g=C.reg[open[0]];if(!open.every(k=>C.reg[k]===g))continue;
    const a=areaU[g],cross=a.cells.filter(k=>st[k]===OPEN&&!line.cells.includes(k));
    if(cross.length)return {rule:'line',level:2,dir:'line',cross,units:[line,a]}}
  return null}
function findSqueeze(C,st){const N=C.N;
  /* group by the unit that gets squeezed, so one hint can clear every spot that would empty it */
  for(const u of C.units){if(hasCat(st,u.cells))continue;const open=openOf(st,u.cells);if(!open.length)continue;
    const cross=[];
    for(let k=0;k<N;k++){if(st[k]!==OPEN||u.cells.includes(k))continue;
      if(open.every(q=>C.peer[k*N+q]))cross.push(k)}
    if(cross.length)return {rule:'squeeze',level:3,cross,units:[u]}}
  return null}
const popcount=m=>{let c=0;while(m){m&=m-1;c++}return c};
function findGroup(C,st){const n=C.n;
  /* masks: for each area, which rows/cols hold its open spots; for each row/col, which areas */
  const live=u=>!hasCat(st,u.cells)&&openOf(st,u.cells).length>0;
  for(const dir of ['row','col']){const off=dir==='row'?0:n,pos=k=>dir==='row'?k/n|0:k%n;
    for(const fromArea of [true,false]){
      const src=[],srcMask=[];
      for(let i=0;i<n;i++){const u=fromArea?C.units[2*n+i]:C.units[off+i];if(!live(u))continue;
        let m=0;for(const k of openOf(st,u.cells))m|=1<<(fromArea?pos(k):C.reg[k]);src.push(i);srcMask.push(m)}
      const s=src.length,half=s>>1;if(half<2)continue;
      for(let sub=1;sub<(1<<s);sub++){const k=popcount(sub);if(k<2||k>half)continue;
        let m=0;for(let j=0;j<s;j++)if(sub>>j&1)m|=srcMask[j];if(popcount(m)!==k)continue;
        const chosen=[];for(let j=0;j<s;j++)if(sub>>j&1)chosen.push(src[j]);
        const targets=[];for(let i=0;i<n;i++)if(m>>i&1)targets.push(i);
        let cross;
        if(fromArea){const set=new Set(chosen);cross=[];
          for(const t of targets)for(const q of C.units[off+t].cells)if(st[q]===OPEN&&!set.has(C.reg[q]))cross.push(q)}
        else{const set=new Set(chosen);cross=[];
          for(const g of targets)for(const q of C.areas[g])if(st[q]===OPEN&&!set.has(pos(q)))cross.push(q)}
        if(!cross.length)continue;
        const areaIdx=fromArea?chosen:targets,lineIdx=fromArea?targets:chosen;
        return {rule:'group',level:4,dir,fromArea,cross,
          units:[...areaIdx.map(g=>C.units[2*n+g]),...lineIdx.map(i=>C.units[off+i])]}}}}
  return null}
const FINDERS=[findPeers,findOnly,findLine,findSqueeze,findGroup];
function find(C,st){for(const f of FINDERS){const s=f(C,st);if(s)return s}return null}
function apply(st,s){if(s.place!=null)st[s.place]=CAT;for(const k of s.cross)st[k]=X}

function toCandidates(P,state){const N=P.n*P.n,st=new Uint8Array(N);
  if(state)for(let k=0;k<N;k++){const v=state[k];st[k]=v===2?CAT:v===1||v===3?X:OPEN}
  return st}
const catCount=st=>{let c=0;for(const v of st)if(v===CAT)c++;return c};

/* Rate from an empty board: level is the hardest rule needed, 5 if the rules stall */
function rate(P,state){const C=context(P),st=toCandidates(P,state),ruleCounts={only:0,line:0,squeeze:0,group:0};
  let level=0,steps=0;
  for(;;){if(catCount(st)===P.n)break;const s=find(C,st);
    if(!s||s.rule==='stuck'){level=5;break}
    if(s.rule!=='peers'){ruleCounts[s.rule]++;steps++;if(s.level>level)level=s.level}
    apply(st,s)}
  return {level:Math.max(level,1),steps,ruleCounts}}

/* ---------- explanations ---------- */
const WORDS=['zero','one','two','three','four','five'];
const join=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function namer(P,names){const nm=g=>names&&names[g]?'the '+names[g]:'area '+(g+1);
  const unit=u=>u.type==='row'?'row '+(u.index+1):u.type==='col'?'column '+(u.index+1):nm(u.index);
  const spot=k=>`row ${(k/P.n|0)+1}, column ${k%P.n+1}`;
  return {nm,unit,spot}}
function explain(P,s,names){const N=namer(P,names),U=s.units;
  switch(s.rule){
  case 'peers':return `The cat at ${N.spot(s.cat)} already rules out its row, its column, ${N.nm(P.reg[s.cat])} and every spot touching it, so those are crossed out.`;
  case 'only':return `${cap(N.unit(U[0]))} has only one open spot left, so a cat must nap there.`;
  case 'line':{const[a,b]=U;
    if(s.dir==='area')return `All the open spots in ${N.unit(a)} are in ${N.unit(b)}, so nothing else in ${N.unit(b)} can have a cat.`;
    return `All the open spots in ${N.unit(a)} are in ${N.unit(b)}, so ${N.unit(a)}'s cat sleeps there and the rest of ${N.unit(b)} can't have a cat.`}
  case 'squeeze':{const u=N.unit(U[0]);
    if(s.cross.length===1)return `A cat at ${N.spot(s.cross[0])} would touch or line up with every open spot in ${u}, leaving it nowhere to nap, so no cat can go there.`;
    const cnt=s.cross.length===2?'either of the two':'any of the '+(s.cross.length<=5?WORDS[s.cross.length]:s.cross.length);
    return `A cat on ${cnt} glowing spots would touch or line up with every open spot in ${u}, leaving it nowhere to nap, so they're crossed out.`}
  case 'group':{const areas=U.filter(u=>u.type==='area'),lines=U.filter(u=>u.type!=='area'),k=areas.length,kw=WORDS[k]||k;
    const lw=(s.dir==='row'?'rows ':'columns ')+join(lines.map(u=>String(u.index+1)));
    const an=join(areas.map(u=>N.unit(u)));
    if(s.fromArea)return `${cap(an)} only have open spots in ${lw}, so those ${kw} cats fill ${lw}. Nothing else in those ${s.dir==='row'?'rows':'columns'} can have a cat.`;
    return `${cap(lw)} only have open spots in ${an}, so those ${kw} beds' cats all sleep in ${lw}. The rest of those beds can't have a cat.`}
  }
  return ''}

/* Next simplest deduction from the player's board.
   Returns {rule, level, action:'place'|'cross'|'none', cell, cells, units:[{type,index}], zone:[cells to highlight], text}.
   rule is one of peers, only, line, squeeze, group, error (a mark contradicts the solution), reveal (rules stall), done. */
function nextStep(P,state,opts={}){const names=opts.names,C=context(P),st=toCandidates(P,state),n=P.n;
  const out=(o)=>Object.assign({rule:'done',level:0,action:'none',cell:null,cells:[],units:[],zone:[],text:''},o);
  const sol=P.sol?P.sol.map((c,r)=>r*n+c):null;
  if(sol){const isSol=k=>P.sol[k/n|0]===k%n;
    const badX=sol.find(k=>st[k]===X);
    if(badX!=null)return out({rule:'error',cells:[badX],zone:[badX],text:"One of your X's is on a spot a cat needs. Try undoing."});
    for(let k=0;k<C.N;k++)if(st[k]===CAT&&!isSol(k))return out({rule:'error',cells:[k],zone:[k],text:"That cat is in a spot that doesn't work out. Try undoing."});}
  if(catCount(st)===n)return out({text:'Every cat is already napping!'});
  const s=find(C,st);
  if(!s||s.rule==='stuck'){
    if(!sol)return out({rule:'reveal',text:'No simple step from here. Try undoing a few moves.'});
    /* rules stall (should not happen on rated puzzles): give a free cat in the tightest area */
    let best=null;for(let g=0;g<n;g++){if(hasCat(st,C.areas[g]))continue;const o=openOf(st,C.areas[g]).length;if(!best||o<best.o)best={g,o}}
    const k=sol.find(q=>P.reg[q]===best.g);
    return out({rule:'reveal',level:5,action:'place',cell:k,cells:[k],units:[{type:'area',index:best.g}],zone:C.areas[best.g].slice(),
      text:`This one needs a leap, so here's a free cat: one naps at ${namer(P,names).spot(k)}.`})}
  const zone=new Set();s.units.forEach(u=>u.cells.forEach(k=>zone.add(k)));
  if(s.rule==='peers'){zone.add(s.cat);s.cross.forEach(k=>zone.add(k))}
  if(s.rule==='squeeze')s.cross.forEach(k=>zone.add(k));
  return out({rule:s.rule,level:s.level,action:s.place!=null?'place':'cross',cell:s.place!=null?s.place:null,
    cells:s.place!=null?[s.place]:s.cross.slice(),units:s.units.map(u=>({type:u.type,index:u.index})),zone:[...zone],text:explain(P,s,names)})}

/* ---------- targeted generation ---------- */
const TARGETS={daily:{min:2,max:3},6:{min:1,max:2},7:{min:2,max:3},8:{min:3,max:4},9:{min:4,max:4},10:{min:4,max:4,minSteps:16}};
const gen=()=>root.SunGen||(typeof require!=='undefined'?require('./generator.js'):null);
const derive=(seed,i)=>i===0?seed>>>0:((Math.imul((seed>>>0)^Math.imul(i,0x9E3779B1),0x85EBCA6B)^(i*0xC2B2AE35))>>>0)||1;
/* tries derived seeds in a fixed order until the rating fits; after `tries` (default 300) takes the closest one seen.
   A puzzle that needs guessing (level 5) is never returned. */
function generateRated(n,seed,target={}){const G=gen(),min=target.min||1,max=target.max||4,minSteps=target.minSteps||0,cap=target.tries||300;
  let best=null,bestD=Infinity;
  for(let i=0;;i++){const p=G.generate(n,derive(seed,i)),r=rate(p);
    if(r.level<=4){const d=(r.level<min?min-r.level:r.level>max?r.level-max:0)*100+Math.max(0,minSteps-r.steps);
      if(d<bestD){bestD=d;best=Object.assign(p,{rating:r,tries:i+1})}
      if(d===0||i+1>=cap)return best}}}

const api={rate,nextStep,generateRated,TARGETS,derive,
  _internal:{context,toCandidates,findPeers,findOnly,findLine,findSqueeze,findGroup}}; /* _internal: for tests */
root.NapMapDifficulty=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
