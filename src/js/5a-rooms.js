/* ════════════════════════════════════════════
   회의실 예약 — 날짜별 시간표 (09:00–18:00, 30분 단위)
   예약: store "rooms" = [{id, room, date, s, e, title, user, n}]  (s·e 는 30분 칸 번호, 0 = 09:00)
   이미 잡혀 있는 기지 회의는 날짜 기준으로 고정 생성 (저장 안 함)
   ════════════════════════════════════════════ */
const ROOMS=[["r1","대회의실","B동 3층 · 20인 · 빔프로젝터",1],["r2","소회의실 A","B동 2층 · 6인",1],["r3","소회의실 B","B동 2층 · 6인",1],["r4","화상회의실","A동 1층 · 8인 · 타 기지 연결",1],["r5","보안 브리핑룸","지하 1층 · 12인 · Level 3 이상",3]];
const SLOTS=18, slotT=i=>`${pad(9+Math.floor(i/2))}:${i%2?"30":"00"}`;
const BASE_MEET=["격리동 B 주간 회의","신규 인원 면접","MTF 연락 회의","격리 절차 개정 검토","D계급 배치 회의","예산 검토","보안 교육","외부 기관 화상 회의","시설 점검 회의","연구 결과 공유"];
function baseBookings(date){
  const d=new Date(date+"T00:00"), wd=d.getDay(); if(wd===0||wd===6) return [];
  const out=[];
  ROOMS.forEach(([id],ri)=>{
    const n=srnd(date+id+"n",0,ri===0?3:2); let at=srnd(date+id+"a",0,3);
    for(let k=0;k<n && at<SLOTS-1;k++){
      const len=srnd(date+id+k+"l",2,4), e=Math.min(SLOTS,at+len);
      out.push({id:"b"+id+k, room:id, date, s:at, e, title:id==="r5"?"비공개 회의":spick(date+id+k,BASE_MEET), user:spick(date+id+k+"u",DIR.filter(r=>r[4]==="근무 중"&&!r[1].includes("<")))[1], base:true});
      at=e+srnd(date+id+k+"g",1,5);
    }
  });
  return out;
}
const myRooms=()=>store.get("rooms",[]);
function bookingsOn(date){ return [...baseBookings(date), ...myRooms().filter(b=>b.date===date)] }
function rooms(qs){
  const date=(qs&&qs.get("d"))||today();
  const prev=ymd(new Date(new Date(date+"T00:00").getTime()-86400000)), next=ymd(new Date(new Date(date+"T00:00").getTime()+86400000));
  const B=bookingsOn(date), wd=new Date(date+"T00:00").getDay();
  const nowSlot=date===today()?Math.floor(((new Date().getHours()-9)*60+new Date().getMinutes())/30):-1;
  const mine=myRooms().filter(b=>b.user===S.user && b.date>=today()).sort((a,b)=>(a.date+pad(a.s)).localeCompare(b.date+pad(b.s)));
  const grid=ROOMS.map(([id,name,info,lv])=>{
    const cells=[]; for(let i=0;i<SLOTS;){
      const b=B.find(x=>x.room===id&&x.s===i);
      if(b){ cells.push(`<div class="rb ${b.user===S.user?"me":""} ${b.base?"":"mine"}" style="grid-column:span ${b.e-b.s}" title="${esc(slotT(b.s))}–${esc(slotT(b.e))} ${esc(b.title)}"><b>${esc(b.title)}</b><small>${slotT(b.s)}–${slotT(b.e)} · ${esc(b.user)}</small></div>`); i=b.e; continue }
      const busy=B.some(x=>x.room===id&&i>x.s&&i<x.e);
      if(!busy) cells.push(`<button type="button" class="rs ${i<=nowSlot?"past":""}" data-room="${id}" data-slot="${i}" aria-label="${name} ${slotT(i)} 예약" ${i<nowSlot||date<today()||wd===0||wd===6||S.level<lv?"disabled":""}></button>`);
      i++;
    }
    return `<div class="rname"><b>${name}</b><small>${info}</small></div><div class="rrow">${cells.join("")}</div>`;
  }).join("");
  return `<h2 class="ph">회의실 <span>예약</span></h2>
  <div class="calbar"><a class="btn" href="#rooms?d=${prev}" aria-label="전날">‹</a><b>${date} (${["일","월","화","수","목","금","토"][wd]})</b><a class="btn" href="#rooms?d=${next}" aria-label="다음날">›</a><a class="btn" href="#rooms">오늘</a>
    <span class="sp"></span><span class="dim2" style="font-size:11px">빈 칸을 눌러 예약 · 주말은 예약할 수 없습니다</span></div>
  <div class="rwrap"><div class="rgrid"><div class="rname head"></div><div class="rrow head">${[...Array(SLOTS/2)].map((_,h)=>`<span style="grid-column:span 2">${pad(9+h)}:00</span>`).join("")}</div>${grid}</div></div>
  <h2 class="ph" style="margin-top:26px">내 <span>예약</span></h2>
  ${mine.length?`<table><tr><th>날짜</th><th>시간</th><th>회의실</th><th>회의명</th><th class="hm">인원</th><th></th></tr>${mine.map(b=>`<tr><td>${b.date.slice(5)}</td><td>${slotT(b.s)}–${slotT(b.e)}</td><td class="dim">${ROOMS.find(r=>r[0]===b.room)[1]}</td><td class="hi">${esc(b.title)}</td><td class="dim hm">${b.n||"—"}명</td><td><button type="button" class="xref" data-rcancel="${b.id}">취소</button></td></tr>`).join("")}</table>`
  :`<div class="empty">예정된 예약이 없습니다.</div>`}`;
}
document.addEventListener("click",e=>{
  const c=e.target.closest("[data-rcancel]");
  if(c){ const b=myRooms().find(x=>x.id===c.dataset.rcancel);
    modal({title:"예약 취소",html:`<p>${b.date} ${slotT(b.s)}–${slotT(b.e)} <b>${esc(b.title)}</b> 예약을 취소합니다.</p>`,buttons:[{label:"닫기",act:x=>x()},{label:"예약 취소",primary:true,act:x=>{ store.set("rooms",myRooms().filter(y=>y.id!==b.id)); x(); toast("예약을 취소했습니다."); route() }}]}); return }
  const s=e.target.closest("button.rs[data-room]"); if(!s) return;
  const room=ROOMS.find(r=>r[0]===s.dataset.room), st=+s.dataset.slot, date=new URLSearchParams(location.hash.split("?")[1]||"").get("d")||today();
  const B=bookingsOn(date).filter(b=>b.room===room[0]);
  let maxE=SLOTS; for(const b of B) if(b.s>st) maxE=Math.min(maxE,b.s);
  modal({title:`${room[1]} 예약 <span class="dim2">· ${date}</span>`, html:`<div class="field"><label for="rt">회의명</label><input id="rt" maxlength="30" placeholder="예: 격리 절차 검토" autocomplete="off"></div>
    <div class="field"><label>시작</label><span class="hi">${slotT(st)}</span></div>
    <div class="field"><label for="re">종료</label><select id="re" class="selx">${[...Array(maxE-st)].map((_,k)=>`<option value="${st+k+1}" ${k===1?"selected":""}>${slotT(st+k+1)}</option>`).join("")}</select></div>
    <div class="field"><label for="rn">인원</label><input id="rn" type="number" min="1" max="20" value="4"></div><p class="dim2" style="font-size:11px">${room[2]}</p>`,
    buttons:[{label:"취소",act:x=>x()},{label:"예약하기",primary:true,act:x=>{
      const t=$("#rt").value.trim(); if(!t){ $("#rt").focus(); return }
      store.set("rooms",[...myRooms(),{id:Date.now().toString(36),room:room[0],date,s:st,e:+$("#re").value,title:t,user:S.user,n:+$("#rn").value||1}]);
      x(); feedPush(`회의실 예약 — ${S.user} · ${room[1]} ${slotT(st)}`,""); toast(`${room[1]} ${slotT(st)} 예약되었습니다.`); route() }}]});
});
