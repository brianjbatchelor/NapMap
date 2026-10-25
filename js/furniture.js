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
function draw(){const P=S.puzzle,board=document.getElementById('board');if(!P||!board)return;
  board.querySelectorAll('.furn').forEach(e=>e.remove());const n=P.n;
  for(let g=0;g<n;g++){const b=bestRect(P,g),bed=P.colors[g];if(!b)continue;const d=document.createElement('div');
    d.className='furn';d.dataset.bed=bed;
    d.style.left=b.c0/n*100+'%';d.style.top=b.r0/n*100+'%';d.style.width=b.w/n*100+'%';d.style.height=b.h/n*100+'%';
    d.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ART[bed]}</svg>`;
    board.appendChild(d)}}
S.on('newPuzzle',draw);
draw();
window.NapMapArt={ART,bestRect};
})();
