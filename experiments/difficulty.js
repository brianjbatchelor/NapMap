/* NapMap experiment: human-style deduction solver to rate puzzle difficulty.
   Always uses the easiest rule that makes progress, then starts again from the easiest rule.
     1 "single"   an area, row or column with only one open cell gets a cat
                  (placing a cat crosses out its row, column, area and 8 neighbours; that part is free)
     2 "line"     all open cells of an area lie in one row/column: cross out the rest of that row/column
                  (and the mirror: a row/column whose open cells lie in one area: cross out the rest of that area)
     3 "group"    k areas confined to the same k rows/columns: cross out everything else in those rows/columns
                  (and the mirror: k rows/columns confined to k areas: cross out the rest of those areas), k >= 2
     4 "what-if"  a cell whose cat would leave some area, row or column with no open cell is crossed out
     5 "guess"    the rules above stall: solving needs trial and error / deeper look-ahead
   rate(puzzle) -> {level, name, steps, uses:{single,line,group,whatif}, solved}
   Node: require('./difficulty.js'); browser: window.NapMapRate. */
(function(root){
const NAMES=['','single','line','group','what-if','guess'];
function rate(P){const n=P.n,N=n*n,reg=P.reg,st=Array(N).fill(0); // 0 open, 1 crossed, 2 cat
  const units=[];for(let i=0;i<n;i++){const row=[],col=[];for(let j=0;j<n;j++){row.push(i*n+j);col.push(j*n+i)}units.push(row,col)}
  const areas=[];for(let g=0;g<n;g++)areas.push([]);for(let k=0;k<N;k++)areas[reg[k]].push(k);
  for(const a of areas)units.push(a);
  const peers=[];for(let k=0;k<N;k++){const r=k/n|0,c=k%n,s=[];
    for(let q=0;q<N;q++){if(q===k)continue;const a=q/n|0,b=q%n;if(a===r||b===c||reg[q]===reg[k]||(Math.abs(a-r)<=1&&Math.abs(b-c)<=1))s.push(q)}peers.push(s)}
  const uses={single:0,line:0,group:0,whatif:0};let level=0,steps=0;
  const place=k=>{st[k]=2;for(const q of peers[k])if(st[q]===0)st[q]=1};
  const hasCat=u=>u.some(k=>st[k]===2),open=u=>u.filter(k=>st[k]===0);
  const cross=ks=>{let ch=false;for(const k of ks)if(st[k]===0){st[k]=1;ch=true}return ch};
  const rowsOf=ks=>new Set(ks.map(k=>k/n|0)),colsOf=ks=>new Set(ks.map(k=>k%n));
  function single(){for(const u of units){if(hasCat(u))continue;const o=open(u);if(o.length===1){place(o[0]);return true}}return false}
  /* k sets of "groups" (areas) confined to k "lines"; also lines confined to k areas. kMin..kMax */
  function confine(kMin,kMax){
    const freeAreas=[];for(let g=0;g<n;g++)if(!hasCat(areas[g]))freeAreas.push(g);
    for(const dim of[0,1]){const lineOf=dim?(k=>k%n):(k=>k/n|0),lineCells=i=>units[2*i+dim];
      const freeLines=[];for(let i=0;i<n;i++)if(!hasCat(lineCells(i)))freeLines.push(i);
      const aLines=freeAreas.map(g=>new Set(open(areas[g]).map(lineOf)));
      const lAreas=freeLines.map(i=>new Set(open(lineCells(i)).map(k=>reg[k])));
      const m=freeAreas.length,ml=freeLines.length;
      /* areas -> lines */
      for(let mask=1;mask<(1<<m);mask++){const bits=popc(mask);if(bits<kMin||bits>kMax)continue;const L=new Set(),G=new Set();
        for(let t=0;t<m;t++)if(mask>>t&1){G.add(freeAreas[t]);for(const x of aLines[t])L.add(x)}
        if(L.size!==bits)continue;const ks=[];for(const i of L)for(const k of lineCells(i))if(!G.has(reg[k]))ks.push(k);
        if(cross(ks))return true}
      /* lines -> areas */
      for(let mask=1;mask<(1<<ml);mask++){const bits=popc(mask);if(bits<kMin||bits>kMax)continue;const A=new Set(),Ls=new Set();
        for(let t=0;t<ml;t++)if(mask>>t&1){Ls.add(freeLines[t]);for(const x of lAreas[t])A.add(x)}
        if(A.size!==bits)continue;const ks=[];for(const g of A)for(const k of areas[g])if(!Ls.has(lineOf(k)))ks.push(k);
        if(cross(ks))return true}}
    return false}
  function whatif(){let ch=false;for(let k=0;k<N;k++){if(st[k]!==0)continue;const gone=new Set(peers[k]);gone.add(k);
      for(const u of units){if(u.includes(k)||hasCat(u))continue;if(!u.some(q=>st[q]===0&&!gone.has(q))){st[k]=1;ch=true;break}}
      if(ch)return true}
    return false}
  const done=()=>st.filter(s=>s===2).length===n;
  for(let guard=0;guard<N*4&&!done();guard++){
    if(single()){uses.single++;level=Math.max(level,1)}
    else if(confine(1,1)){uses.line++;level=Math.max(level,2)}
    else if(confine(2,n-1)){uses.group++;level=Math.max(level,3)}
    else if(whatif()){uses.whatif++;level=Math.max(level,4)}
    else break;
    steps++}
  const solved=done();
  if(solved&&P.sol){for(let i=0;i<n;i++)if(st[i*n+P.sol[i]]!==2)throw new Error('rater disagrees with solution')}
  if(!solved)level=5;
  return{level,name:NAMES[level],steps,uses,solved}}
function popc(x){let c=0;while(x){x&=x-1;c++}return c}
root.NapMapRate={rate,NAMES};
if(typeof module!=='undefined')module.exports=root.NapMapRate;
})(typeof window!=='undefined'?window:globalThis);
