/* Past-dailies archive: a month calendar in a <dialog> for replaying missed daily puzzles.
   The calendar math (ArchiveCal) is pure and local-time only, so it also runs in Node for tests. */
(function(root){
'use strict';

/* ---------- pure calendar math ---------- */
const ARCHIVE_START=20260101; // first playable daily (yyyymmdd)
const keyOf=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const dateOf=k=>new Date(k/10000|0,(k/100|0)%100-1,k%100);
const ymOf=k=>({y:k/10000|0,m:(k/100|0)%100-1}); // m is 0-based like Date
const keyFor=(y,m,d)=>y*10000+(m+1)*100+d;
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const firstWeekday=(y,m)=>new Date(y,m,1).getDay(); // 0 = Sunday
const addDays=(k,n)=>{const d=dateOf(k);d.setDate(d.getDate()+n);return keyOf(d)};
const shiftMonth=(y,m,dm)=>{const d=new Date(y,m+dm,1);return {y:d.getFullYear(),m:d.getMonth()}};
const monthIndex=(y,m)=>y*12+m;
const isPlayable=(k,todayKey,start=ARCHIVE_START)=>k>=start&&k<=todayKey;

/* Weeks (Sunday first) of a month: each week is 7 entries, a date key or null for padding. */
function monthGrid(y,m){
  const cells=[],lead=firstWeekday(y,m),dim=daysInMonth(y,m);
  for(let i=0;i<lead;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(keyFor(y,m,d));
  while(cells.length%7)cells.push(null);
  const weeks=[];for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  return weeks;
}
/* Months the archive can show: from the start month to the current month. */
function monthRange(todayKey,start=ARCHIVE_START){return {min:ymOf(start),max:ymOf(todayKey)}}
function clampMonth(y,m,todayKey,start=ARCHIVE_START){
  const {min,max}=monthRange(todayKey,start),i=monthIndex(y,m);
  if(i<monthIndex(min.y,min.m))return {...min};
  if(i>monthIndex(max.y,max.m))return {...max};
  return {y,m};
}
function canShift(y,m,dm,todayKey,start=ARCHIVE_START){
  const t=shiftMonth(y,m,dm),{min,max}=monthRange(todayKey,start),i=monthIndex(t.y,t.m);
  return i>=monthIndex(min.y,min.m)&&i<=monthIndex(max.y,max.m);
}
/* Playable keys in a month, in order. */
function playableDays(y,m,todayKey,start=ARCHIVE_START){
  const out=[],dim=daysInMonth(y,m);
  for(let d=1;d<=dim;d++){const k=keyFor(y,m,d);if(isPlayable(k,todayKey,start))out.push(k)}
  return out;
}
/* {solved, playable} for a month; getRecord(key) returns the stored result or null. */
function monthSummary(y,m,todayKey,getRecord,start=ARCHIVE_START){
  const days=playableDays(y,m,todayKey,start);
  return {solved:days.filter(k=>!!getRecord(k)).length,playable:days.length};
}
/* Day to focus in a month: `prefer` if it is a playable day of that month, otherwise the same
   day-of-month clamped into the month's playable range (null if nothing is playable). */
function pickFocus(y,m,prefer,todayKey,start=ARCHIVE_START){
  const days=playableDays(y,m,todayKey,start);if(!days.length)return null;
  if(prefer&&days.includes(prefer))return prefer;
  const want=keyFor(y,m,Math.min(prefer?prefer%100:1,daysInMonth(y,m)));
  return want<days[0]?days[0]:want>days[days.length-1]?days[days.length-1]:want;
}

const Cal={ARCHIVE_START,keyOf,dateOf,ymOf,keyFor,daysInMonth,firstWeekday,addDays,shiftMonth,
  isPlayable,monthGrid,monthRange,clampMonth,canShift,playableDays,monthSummary,pickFocus};
if(typeof module!=='undefined'&&module.exports)module.exports=Cal;
root.ArchiveCal=Cal;

/* ---------- UI ---------- */
if(typeof document==='undefined'||!root.Sunspots)return;
const S=root.Sunspots,btn=document.getElementById('archive-btn');
if(!btn)return;

const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const dlg=document.createElement('dialog');
dlg.className='archive';dlg.id='archive';dlg.setAttribute('aria-labelledby','arc-title');
dlg.innerHTML=`<div class="arc-inner">
  <div class="arc-quilt" aria-hidden="true">${Array.from({length:10},(_,i)=>`<i style="background:var(--r${i})"></i>`).join('')}</div>
  <div class="arc-head">
    <h2 id="arc-title">Past dailies</h2>
    <button type="button" class="arc-icon" id="arc-close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>
  </div>
  <div class="arc-nav">
    <button type="button" class="arc-icon" id="arc-prev" aria-label="Previous month">${svg('<path d="M15 5l-7 7 7 7"/>')}</button>
    <div class="arc-month" id="arc-month" aria-live="polite"></div>
    <button type="button" class="arc-icon" id="arc-next" aria-label="Next month">${svg('<path d="M9 5l7 7-7 7"/>')}</button>
  </div>
  <p class="arc-sum" id="arc-sum"></p>
  <div class="arc-week" aria-hidden="true"></div>
  <div class="arc-grid" id="arc-grid" role="group" aria-labelledby="arc-month"></div>
</div>`;
document.body.appendChild(dlg);
const $=id=>dlg.querySelector('#'+id);
const grid=$('arc-grid'),prev=$('arc-prev'),next=$('arc-next');
// Weekday header, Sunday first (Jan 4 2026 is a Sunday).
dlg.querySelector('.arc-week').innerHTML=Array.from({length:7},(_,i)=>
  `<span>${new Date(2026,0,4+i).toLocaleDateString(undefined,{weekday:'narrow'})}</span>`).join('');

let view={y:0,m:0},focusKey=null;
const rec=k=>S.store.get('daily:'+k,null);
const loadedKey=()=>S.mode==='daily'&&S.puzzle?S.puzzle.dateKey:null;
const longDate=k=>dateOf(k).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});

function render(){
  const td=S.today(),{y,m}=view,cur=loadedKey();
  $('arc-month').textContent=new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  prev.disabled=!canShift(y,m,-1,td);next.disabled=!canShift(y,m,1,td);
  const s=monthSummary(y,m,td,rec);
  $('arc-sum').textContent=s.playable?`${s.solved} of ${s.playable} solved`:'No naps to catch up on this month';
  if(!isPlayable(focusKey,td)||ymOf(focusKey).m!==m||ymOf(focusKey).y!==y)focusKey=pickFocus(y,m,focusKey,td);
  let h='';
  monthGrid(y,m).forEach(week=>week.forEach(k=>{
    if(k==null){h+='<span class="arc-day arc-pad" aria-hidden="true"></span>';return}
    const d=k%100,ok=isPlayable(k,td),r=ok?rec(k):null,cls=['arc-day'],bits=[longDate(k)];
    let inner=`<span class="arc-num">${d}</span>`;
    if(!ok){cls.push('off');bits.push('not available')}
    if(k===td){cls.push('today');bits.push('today')}
    if(k===cur){cls.push('cur');bits.push('now playing')}
    if(r){
      const lost=r.heartsLost|0,t=S.fmt(r.timeMs||0);
      cls.push('solved');bits.push(`solved in ${t}`+(lost?`, ${lost} heart${lost>1?'s':''} lost`:''));
      inner+=(lost?`<span class="arc-lost">${'<svg><use href="#heart"/></svg>'.repeat(Math.min(lost,3))}</span>`:'')
        +`<svg class="arc-cat"><use href="#cat"/></svg><span class="arc-time">${t}</span>`;
    }else if(ok)bits.push('not played');
    h+=`<button type="button" class="${cls.join(' ')}" data-key="${k}" tabindex="${k===focusKey?0:-1}"`
      +(r?` style="--q:var(--r${d%10})"`:'')+(k===td?' aria-current="date"':'')+(ok?'':' disabled')
      +` aria-label="${bits.join(', ')}">${inner}</button>`;
  }));
  grid.innerHTML=h;
}
const dayBtn=k=>grid.querySelector(`[data-key="${k}"]`);
function focusDay(){const b=focusKey&&dayBtn(focusKey);if(b)b.focus()}

function open(){
  const td=S.today(),cur=loadedKey(),base=cur&&isPlayable(cur,td)?cur:td,ym=ymOf(base);
  view=clampMonth(ym.y,ym.m,td);focusKey=base;render();
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  focusDay();
}
function close(){if(typeof dlg.close==='function')dlg.close();else dlg.removeAttribute('open')}
function go(dm){
  const td=S.today();if(!canShift(view.y,view.m,dm,td))return;
  view=shiftMonth(view.y,view.m,dm);focusKey=pickFocus(view.y,view.m,focusKey,td);render();
  const b=dm<0?prev:next;if(b.disabled)focusDay();
}

btn.addEventListener('click',open);
$('arc-close').addEventListener('click',close);
prev.addEventListener('click',()=>go(-1));
next.addEventListener('click',()=>go(1));
dlg.addEventListener('click',e=>{if(e.target===dlg)close()}); // backdrop
grid.addEventListener('click',e=>{
  const b=e.target.closest('.arc-day[data-key]');if(!b||b.disabled)return;
  const k=+b.dataset.key;close();S.newPuzzle('daily',null,{dateKey:k});
});
grid.addEventListener('keydown',e=>{
  const b=e.target.closest('.arc-day[data-key]');if(!b)return;
  const k=+b.dataset.key,wd=dateOf(k).getDay(),td=S.today();
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-wd,End:6-wd}[e.key];
  let t=null;
  if(step!=null)t=addDays(k,step);
  else if(e.key==='PageUp'||e.key==='PageDown'){
    const ym=shiftMonth(view.y,view.m,e.key==='PageUp'?-1:1);
    if(canShift(view.y,view.m,e.key==='PageUp'?-1:1,td))t=pickFocus(ym.y,ym.m,k,td);
    e.preventDefault();
  }else return;
  e.preventDefault();
  if(t==null||!isPlayable(t,td))return;
  focusKey=t;const ym=ymOf(t);
  if(ym.y!==view.y||ym.m!==view.m){view=ym;render()}
  else{b.tabIndex=-1;dayBtn(t).tabIndex=0}
  focusDay();
});
S.on('win',()=>{if(dlg.open)render()});
S.on('newPuzzle',()=>{if(dlg.open)render()});
root.SunArchive={open,close,render};
})(typeof window!=='undefined'?window:globalThis);
