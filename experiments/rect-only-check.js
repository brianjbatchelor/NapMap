// Exhaustive check: for every valid cat layout, list EVERY way to cut the board into n perfect rectangles
// with one cat each, and count how many make a puzzle with exactly one solution.
// Run: node experiments/rect-only-check.js <n> [maxLayouts] [maxPartitions]   (n=5 and 6 finish in seconds)
const G=require('../js/generator.js');
const n=+process.argv[2]||5, maxLayouts=+process.argv[3]||1e9, limitParts=+process.argv[4]||1e9;
const layouts=[];(function bt(p,used){if(p.length===n){layouts.push(p.slice());return}
  for(let c=0;c<n;c++){if(used[c]||(p.length&&Math.abs(p[p.length-1]-c)<=1))continue;used[c]=1;p.push(c);bt(p,used);p.pop();used[c]=0}})([],[]);
let parts=0,uniq=0,hist={},t0=Date.now(),example=null;
for(const p of layouts.slice(0,maxLayouts)){const isCat=(i,j)=>p[i]===j;
  const reg=Array(n*n).fill(-1);let cnt=0;
  (function fill(){if(parts>=limitParts)return;let k=reg.indexOf(-1);if(k<0){parts++;cnt++;const c=G.solutions(n,reg,2).length;
      hist[c]=(hist[c]||0)+1;if(c===1){uniq++;if(!example)example=reg.slice()}return}
    const r0=k/n|0,c0=k%n;
    for(let w=1;c0+w<=n&&reg[r0*n+c0+w-1]===-1;w++)for(let h=1;r0+h<=n;h++){
      let ok=true,cats=[];for(let j=c0;j<c0+w;j++)if(reg[(r0+h-1)*n+j]!==-1){ok=false;break}
      if(!ok)break;
      for(let i=r0;i<r0+h;i++)for(let j=c0;j<c0+w;j++)if(isCat(i,j))cats.push(i);
      if(cats.length>1)break; if(cats.length!==1)continue;
      for(let i=r0;i<r0+h;i++)for(let j=c0;j<c0+w;j++)reg[i*n+j]=cats[0];
      fill();
      for(let i=r0;i<r0+h;i++)for(let j=c0;j<c0+w;j++)reg[i*n+j]=-1}})();
}
console.log('n',n,'layouts',Math.min(layouts.length,maxLayouts),'partitions',parts,'unique',uniq,JSON.stringify(hist),(Date.now()-t0)+'ms');
if(example)for(let i=0;i<n;i++)console.log(example.slice(i*n,i*n+n).join(' '));
