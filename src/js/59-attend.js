/* ════════════════════════════════════════════
   근태 관리 — 출퇴근 기록 · 주간 근무시간 · 월간 현황 · 연차
   기록: store "att_<user>" = {"YYYY-MM-DD": {in:ms, out:ms}}
   지난 평일 중 기록이 없는 날은 사번 기준으로 고정된 기록을 보여줌 (보기용, 저장 안 함)
   ════════════════════════════════════════════ */
const attKey=()=>"att_"+S.user;
const ANNUAL_LEAVE=15, WORK_START="09:00", DAY_MIN=8*60;
const hm=ms=>{const d=new Date(ms);return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
const dur=min=>min>0?`${Math.floor(min/60)}시간 ${pad(Math.round(min%60))}분`:"—";
function leaveSet(){ const L=leaveDays(), out=new Set(); for(const k in L) if(L[k].some(e=>!/결재 중/.test(e.t))) out.add(k); return out }
function attDay(key){
  const real=store.get(attKey(),{})[key];
  if(real) return {...real, real:true};
  const d=new Date(key+"T00:00"), wd=d.getDay();
  if(key>=today() || wd===0 || wd===6 || leaveSet().has(key)) return null;
  // 보기용 과거 기록 (입사 이후 평일)
  const inMin=8*60+srnd(S.user+key+"i",20,62), outMin=17*60+srnd(S.user+key+"o",55,140);
  return {in:d.getTime()+inMin*60000, out:d.getTime()+outMin*60000, seed:true};
}
function workedMin(r, key){
  if(!r||!r.in) return 0;
  const end=r.out||(key===today()?Date.now():r.in);
  return Math.max(0,(end-r.in)/60000-60); // 점심 1시간 제외
}
function isLate(r){ return r&&r.in&&hm(r.in)>WORK_START }
function clockIn(){
  const A=store.get(attKey(),{}), k=today();
  if(A[k]&&A[k].in){ toast(`이미 ${hm(A[k].in)}에 출근 처리되었습니다.`); return }
  A[k]={in:Date.now()}; store.set(attKey(),A);
  feedPush(`출근 — ${S.user} ${hm(Date.now())}`,""); toast(`출근 처리되었습니다 · ${hm(Date.now())}${isLate(A[k])?' <span class="amber">(지각)</span>':""}`); attRefresh();
}
function clockOut(){
  const A=store.get(attKey(),{}), k=today();
  if(!A[k]||!A[k].in){ toast("출근 기록이 없습니다. 먼저 출근 처리하십시오.","danger"); return }
  const go=()=>{ A[k].out=Date.now(); store.set(attKey(),A); feedPush(`퇴근 — ${S.user} ${hm(Date.now())}`,""); toast(`퇴근 처리되었습니다 · 오늘 근무 ${dur(workedMin(A[k],k))}`); attRefresh() };
  if(A[k].out){ modal({title:"퇴근 시각 수정",html:`<p>이미 ${hm(A[k].out)}에 퇴근 처리되었습니다. 지금 시각으로 바꿀까요?</p>`,buttons:[{label:"취소",act:c=>c()},{label:"퇴근 시각 바꾸기",primary:true,act:c=>{c();go()}}]}); return }
  go();
}
function attRefresh(){ if(S.view==="attendance"||S.view==="dashboard") route() }
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-att]"); if(!b) return;
  if(b.dataset.att==="in") clockIn(); if(b.dataset.att==="out") clockOut();
});
/* 대시보드 카드 */
function attWidget(){
  const r=store.get(attKey(),{})[today()]||{};
  return `<div class="card w att"><div class="k"><a href="#attendance" class="rowlink">근태 · 오늘 ›</a></div>
    <div class="attrow"><span>출근</span><b>${r.in?hm(r.in):"—"}</b>${isLate(r)?'<span class="amber">지각</span>':""}</div>
    <div class="attrow"><span>퇴근</span><b>${r.out?hm(r.out):"—"}</b></div>
    <div class="attrow"><span>근무</span><b>${dur(workedMin(r,today()))}</b></div>
    <div style="margin-top:8px;display:flex;gap:6px">${!r.in?`<button type="button" class="btn primary" data-att="in">출근</button>`:`<button type="button" class="btn" data-att="out">${r.out?"퇴근 수정":"퇴근"}</button>`}</div></div>`;
}
function weekKeys(base){
  const d=new Date(base+"T00:00"), mon=new Date(d.getTime()-((d.getDay()+6)%7)*86400000);
  return [...Array(7)].map((_,i)=>ymd(new Date(mon.getTime()+i*86400000)));
}
function attendance(qs){
  const base=(qs&&qs.get("w"))||today(), keys=weekKeys(base), lv=leaveSet();
  const prevW=ymd(new Date(new Date(keys[0]+"T00:00").getTime()-7*86400000)), nextW=ymd(new Date(new Date(keys[0]+"T00:00").getTime()+7*86400000));
  let total=0, late=0;
  const rows=keys.map(k=>{
    const r=attDay(k), d=new Date(k+"T00:00"), wd=d.getDay(), w=workedMin(r,k); total+=w; if(isLate(r)) late++;
    let st=r?(r.out||k!==today()?"정상":"근무 중"):lv.has(k)?"연차":(wd===0||wd===6)?"휴일":k>today()?"":k===today()?"미출근":"—";
    if(isLate(r)) st="지각"; if(r&&w>DAY_MIN+60) st+=" · 연장";
    return `<tr class="${k===today()?"tday":""} ${wd===0||wd===6?"wkend":""}"><td>${k.slice(5)} (${["일","월","화","수","목","금","토"][wd]})</td><td>${r?hm(r.in):"—"}</td><td>${r&&r.out?hm(r.out):"—"}</td><td>${dur(w)}</td>
      <td class="hm"><span class="bar"><i style="width:${Math.min(100,w/(DAY_MIN+120)*100)}%" class="${w>DAY_MIN+60?"ot":""}"></i></span></td><td class="${st.startsWith("지각")?"amber":st==="연차"?"cyan":st==="미출근"?"red":"dim"}">${st}${r&&r.seed?' <span class="dim2" title="단말 로그 기준 자동 집계">·</span>':""}</td></tr>`;
  }).join("");
  const year=today().slice(0,4), used=[...lv].filter(k=>k.startsWith(year)).length;
  const r=store.get(attKey(),{})[today()]||{};
  return `<h2 class="ph">근태 <span>관리</span></h2>
  <div class="grid attsum">
    <div class="card"><div class="k">오늘</div><div class="v">${r.in?hm(r.in):"--:--"}<small>${r.out?"퇴근 "+hm(r.out):r.in?"근무 중":"출근 전"}</small></div>
      <div style="margin-top:10px;display:flex;gap:6px">${!r.in?`<button type="button" class="btn primary" data-att="in">출근</button>`:""}${r.in?`<button type="button" class="btn" data-att="out">${r.out?"퇴근 시각 수정":"퇴근"}</button>`:""}</div></div>
    <div class="card"><div class="k">이번 주 근무</div><div class="v">${Math.floor(total/60)}<small>/ 40시간 ${total>40*60?`<span class="amber">초과 ${dur(total-40*60)}</span>`:""}</small></div><div class="bar big"><i style="width:${Math.min(100,total/(52*60)*100)}%" class="${total>40*60?"ot":""}"></i></div><div class="dim2" style="font-size:11px;margin-top:4px">주 52시간 한도</div></div>
    <div class="card"><div class="k">${year}년 연차</div><div class="v">${ANNUAL_LEAVE-used}<small>일 남음 · 사용 ${used}일 / ${ANNUAL_LEAVE}일</small></div><a class="xref" href="#approval?new=leave" style="font-size:12px">휴가 신청 →</a></div>
    <div class="card"><div class="k">이번 주 지각</div><div class="v ${late?"amber":""}">${late}<small>회 · 기준 ${WORK_START}</small></div></div>
  </div>
  <div class="calbar" style="margin-top:18px"><a class="btn" href="#attendance?w=${prevW}" aria-label="이전 주">‹</a><b>${keys[0].slice(5)} ~ ${keys[6].slice(5)}</b><a class="btn" href="#attendance?w=${nextW}" aria-label="다음 주">›</a><a class="btn" href="#attendance">이번 주</a></div>
  <table class="atttab"><tr><th>날짜</th><th>출근</th><th>퇴근</th><th>근무시간</th><th class="hm">점심 1시간 제외</th><th>상태</th></tr>${rows}</table>
  <p class="dim2" style="font-size:11px;margin-top:10px">· 표시가 있는 날은 출입 게이트·단말 로그로 자동 집계된 기록입니다. 기록 정정은 인사관리과(4-1100)에 요청하십시오.</p>`;
}
