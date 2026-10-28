/* NapMap furniture art: each region gets a big illustration of its piece of cat furniture,
   drawn in the region's largest open rectangle, behind the cats and X marks. */
(function(){
const S=window.NapMap;if(!S)return;
const O='#2B2F45'; // outline
const st=`stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const ART={
/* 0 Tufty Puff Pillow */
0:`<path d="M12 32Q50 22 88 32Q96 58 88 82Q50 92 12 82Q4 58 12 32Z" fill="#F08F7F" ${st}/>
<path d="M30 40Q34 58 30 74M70 40Q66 58 70 74M18 57Q50 52 82 57" fill="none" stroke="#C8655A" stroke-width="2"/>
<g fill="#C8655A"><circle cx="30" cy="57" r="3"/><circle cx="70" cy="57" r="3"/><circle cx="50" cy="44" r="3"/><circle cx="50" cy="72" r="3"/></g>
<g fill="#F2A516" ${st}><path d="M12 32l-6-8 8 2z"/><path d="M88 32l6-8-8 2z"/><path d="M12 82l-6 8 8-2z"/><path d="M88 82l6 8-8-2z"/></g>`,
/* 1 Knitty-Knot Blanket: folded stack plus yarn ball */
1:`<rect x="8" y="58" width="70" height="16" rx="7" fill="#F2C94C" ${st}/>
<rect x="12" y="42" width="64" height="16" rx="7" fill="#9AD0C2" ${st}/>
<rect x="16" y="26" width="58" height="16" rx="7" fill="#F2A3B3" ${st}/>
<path d="M14 66l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4M18 50l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4M22 34l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>
<circle cx="80" cy="80" r="13" fill="#E0475B" ${st}/>
<path d="M69 76q11-6 22 2M70 84q10-6 21 1M76 68q-4 12 2 24" fill="none" stroke="#A82D40" stroke-width="1.8"/>
<path d="M60 92l34-26M66 94l30-22" stroke="#8C6A3E" stroke-width="2.6" stroke-linecap="round"/>`,
/* 2 Sisal Tippy Tower: cat tree */
2:`<rect x="12" y="86" width="76" height="9" rx="4" fill="#6FA35A" ${st}/>
<rect x="27" y="40" width="12" height="47" fill="#E8C48A" ${st}/>
<rect x="63" y="58" width="12" height="29" fill="#E8C48A" ${st}/>
<path d="M27 47h12M27 54h12M27 61h12M27 68h12M27 75h12M27 82h12M63 65h12M63 72h12M63 79h12" stroke="#B48E52" stroke-width="1.6"/>
<rect x="50" y="51" width="40" height="8" rx="4" fill="#6FA35A" ${st}/>
<rect x="12" y="18" width="44" height="26" rx="8" fill="#6FA35A" ${st}/>
<circle cx="34" cy="32" r="8" fill="#2F4A27" ${st}/>
<rect x="8" y="12" width="52" height="8" rx="4" fill="#86BA70" ${st}/>
<path d="M82 59v12" stroke="${O}" stroke-width="1.6"/><circle cx="82" cy="75" r="5" fill="#E0475B" ${st}/>`,
/* 3 Wiggle-Wicker Basket */
3:`<path d="M22 50Q50 2 78 50" fill="none" stroke="#A86A2F" stroke-width="7" stroke-linecap="round"/>
<path d="M22 50Q50 2 78 50" fill="none" stroke="${O}" stroke-width="1.5" stroke-dasharray="3 4"/>
<ellipse cx="50" cy="50" rx="34" ry="8" fill="#F6E7D3" ${st}/>
<path d="M14 52H86L79 88Q50 96 21 88Z" fill="#D9964F" ${st}/>
<path d="M18 62H82M20 72H80M22 82H78" stroke="#A86A2F" stroke-width="2"/>
<path d="M28 52l2 36M40 52l1 40M52 52v41M64 52l-1 40M76 52l-2 36" stroke="#A86A2F" stroke-width="1.6" stroke-dasharray="5 5"/>
<rect x="11" y="47" width="78" height="9" rx="4.5" fill="#B8783A" ${st}/>`,
/* 4 Swingy Hammock */
4:`<path d="M4 92H96" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M10 92L22 22M90 92L78 22" stroke="#8C6A3E" stroke-width="6" stroke-linecap="round"/>
<path d="M10 92L22 22M90 92L78 22" stroke="${O}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<path d="M22 26L30 40M78 26L70 40" stroke="#8C6A3E" stroke-width="2"/>
<path d="M28 38Q50 82 72 38Q50 62 28 38Z" fill="#4FA3C7" ${st}/>
<path d="M33 46Q50 70 67 46M39 54Q50 68 61 54" fill="none" stroke="#F4F7FF" stroke-width="2.4"/>`,
/* 5 Very Good Box, with ears peeking out */
5:`<path d="M42 40l4-12 6 10M56 40l4-12 4 12" fill="#2B2F45" ${st}/>
<path d="M18 42L6 28H40L44 42Z" fill="#E2B97C" ${st}/>
<path d="M82 42L94 28H60L56 42Z" fill="#E2B97C" ${st}/>
<rect x="18" y="42" width="64" height="48" fill="#D2A060" ${st}/>
<rect x="44" y="42" width="12" height="20" fill="#F0D7A8" stroke="${O}" stroke-width="1.4"/>
<path d="M27 82V68M23 72l4-5 4 5M36 82V68M32 72l4-5 4 5" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
<path d="M64 74h10" stroke="${O}" stroke-width="1.6"/>`,
/* 6 Plushy Donut Bed */
6:`<ellipse cx="50" cy="64" rx="42" ry="24" fill="#EF9CC0" ${st}/>
<ellipse cx="50" cy="58" rx="26" ry="12" fill="#F9D3E3" ${st}/>
<path d="M14 66q3-4 6 0M24 78q3-4 6 0M40 84q3-4 6 0M58 84q3-4 6 0M74 78q3-4 6 0M82 64q3-4 6 0M18 52q3-4 6 0M76 50q3-4 6 0" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
<g transform="translate(70 30) rotate(-25)" fill="#FFF6E6" ${st}><rect x="-9" y="-2.6" width="18" height="5.2" rx="2"/><circle cx="-9" cy="-3" r="3.4"/><circle cx="-9" cy="3" r="3.4"/><circle cx="9" cy="-3" r="3.4"/><circle cx="9" cy="3" r="3.4"/></g>`,
/* 7 Tippy Teepee */
7:`<path d="M44 14L36 4M56 14L64 4M50 14V2" stroke="#8C6A3E" stroke-width="3" stroke-linecap="round"/>
<path d="M50 12L88 90H12Z" fill="#F1E4CA" ${st}/>
<path d="M26 62H74L77 68H23Z" fill="#9B86C9"/>
<path d="M31 52l5 6 5-6 5 6 5-6 5 6 5-6 5 6 5-6" fill="none" stroke="#E0475B" stroke-width="2.2"/>
<path d="M50 40L64 90H36Z" fill="#5E4A82" ${st}/>
<path d="M50 40V90" stroke="#F1E4CA" stroke-width="1.6"/>`,
/* 8 Cloud-Fluff Bed */
8:`<path d="M20 86v6M80 86v6" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
<path d="M14 86Q4 86 6 74Q8 62 20 64Q20 48 36 50Q42 36 58 42Q72 34 80 50Q96 50 94 66Q96 86 82 86Z" fill="#F4F7FF" ${st}/>
<path d="M28 74q8 6 16 0M56 74q8 6 16 0" fill="none" stroke="#BCCBF3" stroke-width="2.4" stroke-linecap="round"/>
<path d="M74 10a10 10 0 1 0 10 14 8 8 0 0 1-10-14z" fill="#F2A516" ${st}/>
<path d="M24 16l2 4 4.6.6-3.4 3.2 1 4.6-4.2-2.2-4.2 2.2 1-4.6-3.4-3.2 4.6-.6z" fill="#F2A516" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`,
/* 9 Velvet Fainting Couch */
9:`<path d="M18 88v6M82 88v6" stroke="#5D4630" stroke-width="5" stroke-linecap="round"/>
<path d="M12 46Q12 34 26 36L60 40Q74 42 74 56H12Z" fill="#3E8E7E" ${st}/>
<rect x="8" y="56" width="84" height="18" rx="8" fill="#4FA592" ${st}/>
<rect x="8" y="72" width="84" height="16" rx="6" fill="#3E8E7E" ${st}/>
<path d="M86 76Q98 70 94 56Q90 46 80 52Q76 62 86 76Z" fill="#4FA592" ${st}/>
<g fill="#2C6B5E"><circle cx="24" cy="46" r="2.4"/><circle cx="40" cy="47" r="2.4"/><circle cx="56" cy="48" r="2.4"/></g>
<path d="M12 88h76" stroke="#F2A516" stroke-width="2" stroke-dasharray="2 3"/>`
};
/* Largest open rectangle in each region, preferring square-ish ones since the art is square. */
function bestRect(P,g){const n=P.n;let best=null,bs=-1;
  for(let r0=0;r0<n;r0++)for(let c0=0;c0<n;c0++){if(P.reg[r0*n+c0]!==g)continue;
    for(let r1=r0;r1<n;r1++){if(P.reg[r1*n+c0]!==g)break;
      for(let c1=c0;c1<n;c1++){let ok=true;for(let r=r0;r<=r1&&ok;r++)if(P.reg[r*n+c1]!==g)ok=false;if(!ok)break;
        const h=r1-r0+1,w=c1-c0+1,sc=Math.min(h,w)*100+h*w;if(sc>bs){bs=sc;best={r0,c0,h,w}}}}}
  return best}
/* --- styles: room look for Cozy and Boxy boards (css/room.css) ---
   Each area is one rounded block (an SVG path traced around the area, inset from the cell edges so the wall and
   floor show between blocks), with the padded edges and stitching of the classic look redrawn on the block's own
   edge. The furniture stands on the bottom of the area's largest inner rectangle (xMidYMax meet), still inside a
   clipped .furn box. Coordinates: 100 units per cell. */
const U=100,GAP=8,RC=20,RI=9,STITCH=19,PAD=13;
/* Outline of area g, traced clockwise, inset by `inset` units, convex corners rounded by rc and concave ones by ri */
function outline(P,g,inset=GAP,rc=RC,ri=RI){const n=P.n,E=new Map(),key=(x,y)=>x+','+y;
  const add=(x1,y1,x2,y2)=>{const k=key(x1,y1);(E.get(k)||E.set(k,[]).get(k)).push([x2,y2])};
  const same=(a,b)=>a>=0&&b>=0&&a<n&&b<n&&P.reg[a*n+b]===g;
  for(let k=0;k<n*n;k++){if(P.reg[k]!==g)continue;const r=k/n|0,c=k%n;
    if(!same(r-1,c))add(c,r,c+1,r);if(!same(r,c+1))add(c+1,r,c+1,r+1);if(!same(r+1,c))add(c+1,r+1,c,r+1);if(!same(r,c-1))add(c,r+1,c,r)}
  let d='';
  while(E.size){const [k0]=E.keys();let [x,y]=k0.split(',').map(Number);const pts=[[x,y]];
    for(;;){const k=key(x,y),L=E.get(k);if(!L)break;const [nx,ny]=L.pop();if(!L.length)E.delete(k);x=nx;y=ny;
      if(x===pts[0][0]&&y===pts[0][1])break;pts.push([x,y])}
    const v=pts.filter((p,i)=>{const a=pts[(i-1+pts.length)%pts.length],b=pts[(i+1)%pts.length];return!((a[0]===p[0]&&p[0]===b[0])||(a[1]===p[1]&&p[1]===b[1]))});
    const m=v.length,q=v.map((p,i)=>{const a=v[(i-1+m)%m],b=v[(i+1)%m];
      const din=[Math.sign(p[0]-a[0]),Math.sign(p[1]-a[1])],dout=[Math.sign(b[0]-p[0]),Math.sign(b[1]-p[1])];
      const nin=[-din[1],din[0]],nout=[-dout[1],dout[0]],cross=din[0]*dout[1]-din[1]*dout[0];
      return{x:p[0]*U+inset*(nin[0]+nout[0]),y:p[1]*U+inset*(nin[1]+nout[1]),r:cross>0?rc:ri}});
    for(let i=0;i<m;i++){const p=q[i],a=q[(i-1+m)%m],b=q[(i+1)%m];
      const toward=(s,t,r)=>{const dx=t.x-s.x,dy=t.y-s.y,l=Math.hypot(dx,dy)||1,rr=Math.min(r,l/2);return[s.x+dx/l*rr,s.y+dy/l*rr]};
      const [x1,y1]=toward(p,a,p.r),[x2,y2]=toward(p,b,p.r);
      d+=(i?'L':'M')+x1.toFixed(1)+' '+y1.toFixed(1)+'Q'+p.x.toFixed(1)+' '+p.y.toFixed(1)+' '+x2.toFixed(1)+' '+y2.toFixed(1)}
    d+='Z'}
  return d}
/* Largest rectangle fully inside area g, the block the room furniture stands in (same rule the shaped generator
   uses to pick each area's furniture by shape) */
const innerRect=(P,g)=>window.ShapedGen?window.ShapedGen.innerRect(P.n,P.reg,g):bestRect(P,g);
const isRoom=P=>P.style==='cozy'||P.style==='boxy';
let uid=0;
function drawRoom(P,board){const n=P.n,W=n*U,id='rm'+(++uid);
  /* thin seams between the cells of a block, like the quilting of the classic look */
  let grid='';for(let i=1;i<n;i++)grid+=`M${i*U} 0V${W}M0 ${i*U}H${W}`;
  let defs='',body='';
  for(let g=0;g<n;g++){const d=outline(P,g),st=outline(P,g,STITCH,RC-6,Math.max(3,RI-6)),bed=P.colors[g],c=`${id}c${g}`;
    /* padded edges: thin bands along the block's own edges (light on top and left, shade on the bottom and right) */
    const band=(dx,dy)=>`<mask id="${c}${dx}${dy}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${W}"><path d="${d}" fill="#fff"/><path d="${d}" transform="translate(${dx} ${dy})" fill="#000"/></mask>`;
    defs+=`<clipPath id="${c}"><path d="${d}"/></clipPath>`+band(0,6)+band(0,-8)+band(5,0)+band(-5,0);
    body+=`<g class="rm-blk" data-bed="${bed}" data-g="${g}"><path class="rm-shadow" d="${d}" transform="translate(0 6)"/>`
      +`<path class="rm-fill" d="${d}"/>`
      +`<g clip-path="url(#${c})"><path class="rm-seam" d="${grid}"/></g>`
      +`<path class="rm-hi" d="${d}" mask="url(#${c}06)"/><path class="rm-lo" d="${d}" mask="url(#${c}0-8)"/>`
      +`<path class="rm-hi2" d="${d}" mask="url(#${c}50)"/><path class="rm-lo2" d="${d}" mask="url(#${c}-50)"/>`
      +`<path class="rm-stitch" d="${st}"/><path class="rm-edge" d="${d}"/></g>`}
  const layer=document.createElement('div');layer.className='room-layer';layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<svg viewBox="0 0 ${W} ${W}" preserveAspectRatio="none"><defs>${defs}</defs>${body}</svg>`;
  board.insertBefore(layer,board.firstChild)}
/* --- end styles --- */
/* A mask the shape of area g (block outline for room boards, its cells for classic), so furniture that moves can
   never be seen outside its own area */
function areaMask(P,g,room){const n=P.n;let svg;
  if(room)svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n*U} ${n*U}" preserveAspectRatio="none"><path d="${outline(P,g)}"/></svg>`;
  else{let d='';for(let k=0;k<n*n;k++)if(P.reg[k]===g)d+=`M${k%n} ${k/n|0}h1v1h-1z`;
    svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" preserveAspectRatio="none"><path d="${d}"/></svg>`}
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`}
const pct=(v,n)=>v/n*100+'%';
const setBox=(f,n,[l,t,w,h])=>{f.style.left=pct(l,n);f.style.top=pct(t,n);f.style.width=pct(w,n);f.style.height=pct(h,n)};
function draw(){const P=S.puzzle,board=document.getElementById('board');if(!P||!board)return;
  board.querySelectorAll('.furn-clip,.room-layer').forEach(e=>e.remove());const n=P.n;
  /* --- styles --- */
  const room=isRoom(P);if(room)drawRoom(P,board);
  /* --- end styles --- */
  for(let g=0;g<n;g++){const b=room?innerRect(P,g):bestRect(P,g),bed=P.colors[g];if(!b)continue;const d=document.createElement('div');
    d.className='furn';d.dataset.bed=bed;d.dataset.g=g;
    /* the box in cell units: room boards stand inside the block's inset edge, the drawing on the bottom (its floor) */
    const box=room?[b.c0+PAD/U,b.r0+PAD/U,b.w-2*PAD/U,b.h-2*PAD/U]:[b.c0,b.r0,b.w,b.h];
    d.dataset.box=box.join(',');setBox(d,n,box);
    d.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="xMid${room?'YMax':'YMid'} meet" aria-hidden="true">${ART[bed]}</svg>`;
    const clip=document.createElement('div');clip.className='furn-clip';clip.setAttribute('aria-hidden','true');
    const m=areaMask(P,g,room);clip.style.webkitMaskImage=m;clip.style.maskImage=m;
    clip.appendChild(d);board.appendChild(clip)}}
S.on('newPuzzle',draw);
draw();

/* --- napping: once its cat has curled up, an area's furniture slowly shrinks to about 2x2 cells and slides in
   behind the sleeper (css/furniture.css times it); taking the cat back (undo, retry) puts the furniture back --- */
const NAP=2;
function napBox(P,f,k){const n=P.n,g=P.reg[k],room=isRoom(P),kk=room?1:.88,off=room?0:.06,[l,t,w,h]=f.dataset.box.split(',').map(Number);
  const a=Math.min(NAP,kk*Math.min(w,h)),side=a/kk,cx=k%n+.5,cy=(k/n|0)+.52,cells=[];
  for(let q=0;q<n*n;q++)if(P.reg[q]===g)cells.push([q%n,q/n|0]);
  /* where the drawing really sits inside its 100x100 box: the cat lies on the middle of that, not of the empty box */
  let bb={x:0,y:0,width:100,height:100};
  try{const r=f.querySelector('svg').getBBox();if(r.width>20&&r.height>20)bb=r}catch(e){}
  const ax=(bb.x+bb.width/2)/100,ay=(bb.y+bb.height/2)/100,fw=bb.width/100*kk*side,fh=bb.height/100*kk*side;
  const ov=(lo,hi,c)=>Math.max(0,Math.min(hi,c+1)-Math.max(lo,c));
  /* centred on the cat; it only slides toward more of its own area when centring would crop a good part of the
     picture, and if that still crops it the picture shrinks a little more so it fits inside its own area */
  let best=null;
  for(const m of[1,.85,.72,.6,.5]){const fw2=fw*m,fh2=fh*m;best=null;
    for(const dy of[0,-.25,.25,-.5,.5])for(const dx of[0,-.25,.25,-.5,.5]){if(Math.abs(dx)>.4*fw2||Math.abs(dy)>.4*fh2)continue;
      const x=cx+dx,y=cy+dy;let cov=0;for(const[c,r]of cells)cov+=ov(x-fw2/2,x+fw2/2,c)*ov(y-fh2/2,y+fh2/2,r);cov/=fw2*fh2;
      const sc=cov-.08*(Math.abs(dx)+Math.abs(dy))/.25;if(!best||sc>best.sc)best={sc,x,y,cov,m}}
    if(best&&best.cov>=.94)break}
  const sd=side*best.m;
  return[best.x-sd*(off+kk*ax),best.y-sd*(off+kk*ay),sd,sd]}
function nap(P,f,k){f.dataset.napk=k;f.classList.add('nap');setBox(f,P.n,napBox(P,f,k))}
function unnap(P,f){delete f.dataset.napk;f.classList.remove('nap');setBox(f,P.n,f.dataset.box.split(',').map(Number))}
/* jump a furniture box straight back to its place, no animation (before a cat plans its walk past it) */
function settle(f){const P=S.puzzle;if(!f||!P||!f.classList.contains('nap'))return;
  f.style.transition='none';unnap(P,f);void f.offsetWidth;f.style.transition=''}
function syncNap(){const P=S.puzzle,board=document.getElementById('board');if(!P||!board)return;
  const on=new Map();board.querySelectorAll('.cell.cat:not(.cat-arriving)').forEach(c=>{if(c.querySelector('svg')){const k=+c.dataset.k;on.set(P.reg[k],k)}});
  board.querySelectorAll('.furn').forEach(f=>{const k=on.get(+f.dataset.g);
    if(k==null){if(f.classList.contains('nap'))unnap(P,f)}
    else if(!f.classList.contains('nap')||+f.dataset.napk!==k)nap(P,f,k)})}
{const board=document.getElementById('board');let pend=0;
  if(board&&window.MutationObserver)new MutationObserver(()=>{if(!pend)pend=requestAnimationFrame(()=>{pend=0;syncNap()})})
    .observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
window.NapMapArt={ART,bestRect,outline,innerRect,settle,syncNap};
})();
