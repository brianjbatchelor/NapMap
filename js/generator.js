/* NapMap puzzle generator: random valid cat layout, regions grown around each cat,
   then local repairs until the puzzle has exactly one solution. Pure, no DOM. */
(function(root){
const D=[[1,0],[-1,0],[0,1],[0,-1]];
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=r()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function placeCats(n,r){const p=[],used=Array(n).fill(false);
  (function bt(i){if(i===n)return true;for(const c of shuffle([...Array(n).keys()],r)){
    if(used[c]||(i>0&&Math.abs(p[i-1]-c)<=1))continue;used[c]=true;p[i]=c;if(bt(i+1))return true;used[c]=false}return false})(0);
  return p}
function grow(n,p,r){const reg=Array(n*n).fill(-1),size=Array(n).fill(1);p.forEach((c,i)=>reg[i*n+c]=i);
  for(let left=n*n-n;left>0;left--){const cand=[];let tot=0;
    for(let k=0;k<n*n;k++){if(reg[k]!==-1)continue;const rr=k/n|0,cc=k%n;
      for(const[dr,dc]of D){const a=rr+dr,b=cc+dc;if(a<0||b<0||a>=n||b>=n)continue;const g=reg[a*n+b];
        if(g>=0){const w=1/Math.pow(size[g],1.5);tot+=w;cand.push([k,g,w])}}}
    let t=r()*tot,i=0;for(;i<cand.length-1;i++){t-=cand[i][2];if(t<=0)break}
    reg[cand[i][0]]=cand[i][1];size[cand[i][1]]++}
  return reg}
function solutions(n,reg,limit){const out=[],col=Array(n).fill(false),rg=Array(n).fill(false),pos=[];
  (function bt(i){if(out.length>=limit)return;if(i===n){out.push(pos.slice());return}
    for(let c=0;c<n;c++){if(col[c]||(i>0&&Math.abs(pos[i-1]-c)<=1))continue;const g=reg[i*n+c];if(rg[g])continue;
      col[c]=rg[g]=true;pos[i]=c;bt(i+1);col[c]=rg[g]=false}})(0);
  return out}
function connectedWithout(n,reg,g,skip){let start=-1,cnt=0;for(let k=0;k<n*n;k++)if(reg[k]===g&&k!==skip){cnt++;if(start<0)start=k}
  if(!cnt)return false;const seen=new Set([start]),st=[start];
  while(st.length){const k=st.pop(),rr=k/n|0,cc=k%n;for(const[dr,dc]of D){const a=rr+dr,b=cc+dc;if(a<0||b<0||a>=n||b>=n)continue;
    const q=a*n+b;if(q!==skip&&reg[q]===g&&!seen.has(q)){seen.add(q);st.push(q)}}}
  return seen.size===cnt}
function generate(n,seed){const r=rng(seed);
  for(;;){const p=placeCats(n,r),reg=grow(n,p,r),truth=new Set(p.map((c,i)=>i*n+c));
    for(let it=0;it<n*n*4;it++){const sols=solutions(n,reg,2);
      if(sols.length===1)return relabel(n,p,reg,r);
      const alt=sols.find(s=>s.some((c,i)=>c!==p[i])),moves=[];
      alt.forEach((c,i)=>{const k=i*n+c;if(truth.has(k))return;const g=reg[k];
        for(const[dr,dc]of D){const a=i+dr,b=c+dc;if(a<0||b<0||a>=n||b>=n)continue;const h=reg[a*n+b];
          if(h!==g&&connectedWithout(n,reg,g,k))moves.push([k,h])}});
      if(!moves.length)break;const[k,h]=moves[r()*moves.length|0];reg[k]=h}}}
function relabel(n,p,reg,r){const colors=shuffle([...Array(10).keys()],r).slice(0,n);return{n,sol:p,reg,colors}}

root.SunGen={rng,generate,solutions};
if(typeof module!=='undefined')module.exports=root.SunGen;
})(typeof window!=='undefined'?window:globalThis);
