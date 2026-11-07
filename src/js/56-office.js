/* ════════════════════════════════════════════
   업무 메뉴 — 전자결재 · 일정 · 자료실
   모두 사용자별로 localStorage 에 저장 (store.get/set)
   ════════════════════════════════════════════ */

/* ════ 전자결재 ════
   결재 문서: {no, type:"access"|"leave", at(ms), reason, id(문서), level(기안 당시 권한), denied, from, to, days}
   진행 상황은 저장하지 않고 기안 시각으로부터 경과 시간으로 계산 → 로그아웃해도 결재는 진행됨 */
const APPR_LINES={
  access:[["기안","",0],["팀장","정우진 선임 연구원",15],["보안책임자","강도윤 보안팀장",25],["최종 승인","RAISA 심사관",30]],
  leave:[["기안","",0],["팀장","정우진 선임 연구원",12],["인사 확인","인사관리과",18]],
};
const APPR_TYPE={access:"문서 열람 권한 신청", leave:"연차 휴가 신청"};
const apprKey=()=>"appr_"+S.user;
function apprList(){ return store.get(apprKey(),[]) }
/* 어느 단계에서 반려되는지(없으면 -1)와 사유 */
function apprVerdict(a){
  if(a.type==="leave") return [-1,""];
  const need=SCP[a.id]?reqLevel(SCP[a.id].object_class):4;
  if((a.reason||"").replace(/\s/g,"").length<10) return [1,"열람 사유를 업무와 연관 지어 구체적으로(10자 이상) 기재하십시오."];
  if(need>=4) return [3,"Level 4 이상 문서의 임시 열람은 O5 평의회 승인 사항입니다. RAISA 단계에서 처리할 수 없습니다."];
  if(need-a.level>=2) return [2,`요청 권한(Level ${need})과 현재 권한(Level ${a.level})의 차이가 2단계 이상입니다. 상위 부서를 통해 재기안하십시오.`];
  if((a.denied||0)>=3) return [3,`최근 보안 위반 이력(${a.denied}회)으로 임시 권한을 부여할 수 없습니다.`];
  return [-1,""];
}
/* 현재 상태: steps[i] = {role, who, st:"done"|"rej"|"now"|"wait", t(ms)} */
function apprState(a){
  const line=APPR_LINES[a.type], [rejAt,why]=apprVerdict(a);
  let t=a.at, status="진행", steps=[];
  line.forEach(([role,who,sec],i)=>{
    t+=sec*1000;
    const prev=steps[i-1];
    let st;
    if(i===0) st="done";
    else if(prev.st==="rej"||prev.st==="now"||prev.st==="wait") st="wait";
    else if(Date.now()>=t) st=(i===rejAt?"rej":"done");
    else st="now";
    steps.push({role, who:i===0?S.user:who, st, t});
  });
  if(steps.some(s=>s.st==="rej")) status="반려";
  else if(steps.every(s=>s.st==="done")) status="완료";
  return {steps, status, why, end:steps[steps.length-1].t};
}
/* 승인된 열람 권한: 승인 시각부터 24시간 */
/* 목록·통계에서 문서마다 불리므로, 결재 기록을 읽어 만든 표를 잠깐(1초) 재사용 */
let GRANTS={at:0,user:"",map:null};
function grantMap(){
  const now=Date.now();
  if(GRANTS.map && GRANTS.user===S.user && now-GRANTS.at<1000) return GRANTS.map;
  const map={};
  for(const a of apprList()){ if(a.type!=="access") continue;
    const s=apprState(a); if(s.status==="완료") map[a.id]=Math.max(map[a.id]||0, s.end+86400000) }
  GRANTS={at:now,user:S.user,map}; return map;
}
function grantUntil(id){ const best=grantMap()[id]||0; return best>Date.now()?best:0 }
/* 문서 열람에 쓰이는 실제 권한 (임시 권한 포함) */
function lvlFor(id){ const d=SCP[id]; if(!d) return S.level; return grantUntil(id)?Math.max(S.level,reqLevel(d.object_class)):S.level }

/* 결재 상태가 바뀌면 알림 — 로그인 중 2초마다 확인 */
function apprWatch(){
  const seenKey="apprseen_"+S.user;
  const snap=()=>Object.fromEntries(apprList().map(a=>[a.no,apprState(a).status]));
  let last=store.get(seenKey,null)||snap();
  sessionLoop(()=>{
    const cur=snap(); let changed=false;
    for(const [no,st] of Object.entries(cur)){
      if(last[no] && last[no]!==st){ changed=true;
        const a=apprList().find(x=>String(x.no)===no);
        const what=a.type==="access"?`${a.id} 열람 권한 신청`:"연차 휴가 신청";
        toast(st==="완료"?`<b class="green">결재 완료</b> — ${what}<br><span class="dim2">${a.type==="access"?"24시간 동안 열람할 수 있습니다.":"일정에 등록되었습니다."}</span>`:`<b class="red">반려</b> — ${what}<br><a class="xref" href="#approval?no=${no}">사유 확인 →</a>`, st==="완료"?"":"danger");
        feedPush(`전자결재 ${st} — ${S.user} · ${what}`, st==="완료"?"":"amber");
      }
    }
    last=cur; store.set(seenKey,cur); apprBadge();
    if(changed && S.view==="approval" && !S.doc && !/new=/.test(location.hash)) route();
  }, 2000);
}
function apprBadge(){ const el=$("#apprn"); if(!el) return; const n=apprList().filter(a=>apprState(a).status==="진행").length; el.textContent=n?`(${n})`:"" }

function approval(qs){
  const no=+(qs&&qs.get("no")), nw=qs&&qs.get("new");
  if(nw) return apprForm(nw, qs.get("id")||"");
  if(no) return apprDoc(no);
  const tab=(qs&&qs.get("t"))||"all";
  const L=apprList().map(a=>({a,s:apprState(a)})).reverse();
  const cnt=k=>L.filter(x=>k==="all"||x.s.status===k).length;
  const rows=L.filter(x=>tab==="all"||x.s.status===tab);
  const stCls={진행:"amber",완료:"green",반려:"red"};
  return `<h2 class="ph">전자<span>결재</span></h2>
  <div class="bbar"><span class="dim2">결재 문서는 기안 후 수정·회수할 수 없습니다.</span><span class="sp"></span>
    <a class="btn" href="#approval?new=access">+ 열람 권한 신청</a> <a class="btn" href="#approval?new=leave" style="margin-left:6px">+ 휴가 신청</a></div>
  <div class="filters" role="group" aria-label="결재 상태">${[["all","전체"],["진행","진행 중"],["완료","완료"],["반려","반려"]].map(([k,l])=>`<a class="chip ${k===tab?"on":""}" href="#approval${k==="all"?"":"?t="+encodeURIComponent(k)}" ${k===tab?'aria-current="true"':""}>${l} ${cnt(k)}</a>`).join("")}</div>
  ${rows.length?`<table><tr><th>문서 번호</th><th>양식</th><th>제목</th><th class="hm">기안일</th><th>상태</th></tr>
  ${rows.map(({a,s})=>`<tr class="row" data-href="#approval?no=${a.no}"><td class="dim">${rowLink("#approval?no="+a.no,apprNo(a),"")}</td><td class="dim">${APPR_TYPE[a.type]}</td><td class="hi">${esc(apprTitle(a))}</td><td class="dim hm">${fmtDate(a.at)}</td>
    <td class="${stCls[s.status]}">${s.status==="진행"?`${s.steps.find(x=>x.st==="now").role} 결재 중`:s.status}</td></tr>`).join("")}</table>`
  :`<div class="empty">${tab==="all"?"기안한 문서가 없습니다.":`${tab} 상태인 문서가 없습니다.`}<br><span class="dim2">권한이 부족한 문서는 [열람 권한 신청]으로 24시간 임시 열람을 요청할 수 있습니다.</span></div>`}
  <div class="notice" style="margin-top:22px"><b class="amber">결재 처리 기준</b><br>
  · 열람 권한 신청: 현재 권한보다 <b>한 단계 위</b> 문서까지 승인됩니다. 승인 후 24시간 동안 열람할 수 있습니다.<br>
  · Level 4 문서는 O5 승인 사항으로 전자결재로 처리되지 않습니다.<br>
  · 연차 휴가: 팀장 결재 후 인사관리과 확인으로 완료되며, 일정에 자동 등록됩니다.</div>`;
}
const fmtDate=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const apprNo=a=>`S19-${new Date(a.at).getFullYear()}-${String(a.no).padStart(4,"0")}`;
const apprTitle=a=>a.type==="access"?`${a.id} 임시 열람 권한 요청`:`연차 휴가 (${a.from}${a.days>1?` ~ ${a.to}`:""}, ${a.days}일)`;

function apprForm(type, id){
  if(!APPR_TYPE[type]) return approval(new URLSearchParams());
  const head=`<a class="back" href="#approval">← 결재함</a><h2 class="ph">기안 <span>${APPR_TYPE[type]}</span></h2>`;
  const meta=`<tr><th>기안자</th><td>${esc(S.user)}</td><th>소속</th><td>SITE-19 격리동 B</td></tr><tr><th>기안일</th><td>${today()}</td><th>보존 기한</th><td>${type==="access"?"영구":"5년"}</td></tr>`;
  if(type==="access"){
    const locked=Object.values(SCP).filter(d=>!SPECIAL[d.id] && lvlFor(d.id)<reqLevel(d.object_class)).sort((a,b)=>byId(a.id,b.id));
    if(!locked.length) return head+`<div class="empty">현재 권한으로 열람할 수 없는 문서가 없습니다.</div>`;
    return head+`<form class="aform" data-of="access"><table class="ftab">${meta}
      <tr><th><label for="af-id">대상 문서</label></th><td colspan="3"><select id="af-id" name="id">${locked.map(d=>`<option value="${d.id}" ${d.id===id?"selected":""}>${d.id}${docName(d)?" — "+esc(docName(d)):""} (${esc(d.object_class||"미상")} · Level ${reqLevel(d.object_class)})</option>`).join("")}</select></td></tr>
      <tr><th>현재 권한</th><td colspan="3">${LVL_NAME[S.level]}</td></tr>
      <tr><th><label for="af-why">열람 사유</label></th><td colspan="3"><textarea id="af-why" name="reason" rows="4" placeholder="업무와의 연관성을 구체적으로 기재하십시오. (10자 이상)"></textarea></td></tr>
      <tr><th>결재선</th><td colspan="3" class="dim">${APPR_LINES.access.slice(1).map(l=>l[1]).join(" → ")}</td></tr></table>
      <div class="factions"><a class="btn" href="#approval">취소</a><button class="btn primary" type="submit">상신</button></div></form>`;
  }
  return head+`<form class="aform" data-of="leave"><table class="ftab">${meta}
    <tr><th><label for="af-from">시작일</label></th><td><input type="date" id="af-from" name="from" value="${daysAgo(-1)}" min="${today()}" required></td>
        <th><label for="af-days">일수</label></th><td><select id="af-days" name="days">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join("")}</select></td></tr>
    <tr><th><label for="af-why">사유</label></th><td colspan="3"><input id="af-why" name="reason" placeholder="예: 개인 사유" autocomplete="off"></td></tr>
    <tr><th>결재선</th><td colspan="3" class="dim">${APPR_LINES.leave.slice(1).map(l=>l[1]).join(" → ")}</td></tr></table>
    <div class="factions"><a class="btn" href="#approval">취소</a><button class="btn primary" type="submit">상신</button></div></form>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-of]"); if(!f) return; e.preventDefault();
  const v=Object.fromEntries(new FormData(f)), L=apprList();
  const a={no:(L.reduce((m,x)=>Math.max(m,x.no),0)||srnd(S.user+"ap",120,480))+1, type:f.dataset.of, at:Date.now(), reason:(v.reason||"").trim(), level:S.level, denied:S.denied};
  if(a.type==="access") a.id=v.id;
  else {
    const days=+v.days||1, st=new Date(v.from+"T00:00");
    if(!v.from || isNaN(st) || v.from<today()){ toast("시작일을 오늘 이후로 지정하십시오.","danger"); return }
    const end=new Date(st.getTime()+(days-1)*86400000);
    a.from=v.from; a.days=days; a.to=`${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`;
  }
  store.set(apprKey(),[...L,a]); apprBadge();
  feedPush(`전자결재 상신 — ${S.user} · ${APPR_TYPE[a.type]}`,"");
  toast(`상신되었습니다. 문서 번호 ${apprNo(a)}`);
  go("#approval?no="+a.no);
});
function apprDoc(no){
  const a=apprList().find(x=>x.no===no);
  if(!a) return `<a class="back" href="#approval">← 결재함</a><div class="empty">존재하지 않는 결재 문서입니다.</div>`;
  const s=apprState(a), stamp={done:"승인",rej:"반려",now:"검토 중",wait:"대기"};
  const until=a.type==="access"&&s.status==="완료"?s.end+86400000:0;
  return `<a class="back" href="#approval">← 결재함</a>
  <div class="adoc">
    <div class="ahead"><div><div class="dim2" style="font-size:11px;letter-spacing:.15em">${APPR_TYPE[a.type]}</div><h3>${esc(apprTitle(a))}</h3></div>
      <table class="aline" aria-label="결재란"><tr>${s.steps.map(x=>`<th>${x.role}</th>`).join("")}</tr>
      <tr>${s.steps.map(x=>`<td class="${x.st}"><span class="seal">${x.st==="done"&&x===s.steps[0]?"상신":stamp[x.st]}</span><small>${esc(x.who.replace(/ .*/,""))}</small><small>${x.st==="done"||x.st==="rej"?fmtDate(x.t).slice(5):"—"}</small></td>`).join("")}</tr></table></div>
    <table class="ftab"><tr><th>문서 번호</th><td>${apprNo(a)}</td><th>기안일</th><td>${fmtDate(a.at)}</td></tr>
      <tr><th>기안자</th><td>${esc(S.user)}</td><th>상태</th><td class="${{진행:"amber",완료:"green",반려:"red"}[s.status]}">${s.status}</td></tr>
      ${a.type==="access"?`<tr><th>대상 문서</th><td colspan="3"><a class="xref" href="#${a.id.toLowerCase()}">${a.id}</a> ${SCP[a.id]?`<span class="dim">${esc(docName(SCP[a.id]))} · ${esc(SCP[a.id].object_class||"")} · Level ${reqLevel(SCP[a.id].object_class)}</span>`:""}</td></tr>
        <tr><th>기안 시 권한</th><td colspan="3">Level ${a.level}</td></tr>`
      :`<tr><th>기간</th><td colspan="3">${a.from}${a.days>1?` ~ ${a.to}`:""} (${a.days}일)</td></tr>`}
      <tr><th>사유</th><td colspan="3" style="white-space:pre-wrap">${esc(a.reason)||'<span class="dim2">(미기재)</span>'}</td></tr></table>
    ${s.status==="반려"?`<div class="denied"><b>반려 의견 — ${s.steps.find(x=>x.st==="rej").who}</b>${esc(s.why)}</div>`:""}
    ${s.status==="진행"?`<p class="dim" style="margin-top:14px">${s.steps.find(x=>x.st==="now").who} 검토 중입니다. 결과는 알림으로 안내됩니다.</p>`:""}
    ${until?`<div class="notice"><b class="green">임시 열람 권한 부여됨</b><br>${a.id} · ${fmtDate(until)}까지 ${until>Date.now()?`<a class="xref" href="#${a.id.toLowerCase()}">지금 열람 →</a>`:'<span class="dim2">(만료)</span>'}</div>`:""}
    ${a.type==="leave"&&s.status==="완료"?`<div class="notice"><b class="green">일정 등록 완료</b><br><a class="xref" href="#calendar?m=${a.from.slice(0,7)}&d=${a.from}">일정에서 보기 →</a></div>`:""}
  </div>`;
}

/* ════ 일정 ════
   기지 공통 일정(요일·주차 규칙) + 개인 일정(저장) + 승인된 휴가 */
const calKey=()=>"cal_"+S.user;
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function baseEvents(d){
  const wd=d.getDay(), dd=d.getDate(), wk=Math.ceil(dd/7), last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(), E=[];
  if(dd===1) E.push(["09:00","월간 보안 교육 (온라인 이수)","sec"]);
  if(wd===1) E.push(["10:00","SCP-682 산성 용액 교체","op"]);
  if(wd===2 && wk===1) E.push(["14:00","격리동 B 월간 안전 점검","op"]);
  if(wd===3) E.push(["12:30","격리실 밖 산책회 (지상 출입구)","club"]);
  if(wd===4 && wk===3) E.push(["09:00","정기 기억소거 검진 (Level 1~2)","hr"]);
  if(wd===5) E.push(["15:00","SCP-173 격리실 청소 (3인 1조)","op"]);
  if(wd===5 && wk===2) E.push(["16:00","부서 주간 회의 (격리동 B)","op"]);
  if(dd===last) E.push(["18:00","D계급 월말 계약 종료","hr"]);
  if(dd===25) E.push(["—","급여일","hr"]);
  return E.map(([time,t,k])=>({time,t,k,base:true}));
}
function leaveDays(){
  const out={};
  for(const a of apprList()){ if(a.type!=="leave") continue; const st=apprState(a).status; if(st==="반려") continue;
    for(let i=0;i<a.days;i++){ const k=ymd(new Date(new Date(a.from+"T00:00").getTime()+i*86400000)); (out[k]=out[k]||[]).push({time:"종일",t:`연차${st==="진행"?" (결재 중)":""}`,k:"leave",appr:a.no}) } }
  return out;
}
function eventsOn(key, leave=leaveDays()){
  const d=new Date(key+"T00:00");
  const mine=store.get(calKey(),[]).filter(e=>e.date===key).map(e=>({...e,k:"mine"}));
  return [...(leave[key]||[]), ...baseEvents(d), ...mine].sort((a,b)=>(a.time==="종일"?-1:0)-(b.time==="종일"?-1:0) || String(a.time).localeCompare(String(b.time)));
}
function upcoming(n){
  const out=[], leave=leaveDays();
  for(let i=0;i<21 && out.length<n;i++){ const k=daysAgo(-i); for(const e of eventsOn(k,leave)){ if(out.length<n) out.push({...e,date:k}) } }
  return out;
}
function calendar(qs){
  const sel=(qs&&qs.get("d"))||today();
  const m=(qs&&qs.get("m"))||sel.slice(0,7);
  const [y,mo]=m.split("-").map(Number);
  if(!y||!mo) return calendar(new URLSearchParams());
  const first=new Date(y,mo-1,1), days=new Date(y,mo,0).getDate(), lead=first.getDay();
  const prev=ymd(new Date(y,mo-2,1)).slice(0,7), next=ymd(new Date(y,mo,1)).slice(0,7);
  const leave=leaveDays(), cells=[];
  for(let i=0;i<lead;i++) cells.push(`<div class="cd out"></div>`);
  for(let dd=1;dd<=days;dd++){
    const k=`${m}-${pad(dd)}`, ev=eventsOn(k,leave), wd=(lead+dd-1)%7;
    cells.push(`<a class="cd ${k===today()?"today":""} ${k===sel?"sel":""} ${wd===0?"sun":wd===6?"sat":""}" href="#calendar?m=${m}&d=${k}" aria-label="${mo}월 ${dd}일, 일정 ${ev.length}건">
      <span class="dn">${dd}</span>${ev.slice(0,3).map(e=>`<span class="ev ${e.k}">${esc(e.t)}</span>`).join("")}${ev.length>3?`<span class="more">+${ev.length-3}</span>`:""}
      ${ev.length?`<span class="dots">${ev.slice(0,4).map(e=>`<i class="${e.k}"></i>`).join("")}</span>`:""}</a>`);
  }
  while(cells.length%7) cells.push(`<div class="cd out"></div>`);
  const sev=eventsOn(sel,leave), sd=new Date(sel+"T00:00");
  return `<h2 class="ph">일정 <span>관리</span></h2>
  <div class="calbar"><a class="btn" href="#calendar?m=${prev}" aria-label="이전 달">‹</a><b>${y}년 ${mo}월</b><a class="btn" href="#calendar?m=${next}" aria-label="다음 달">›</a>
    <a class="btn" href="#calendar">오늘</a><span class="sp"></span>
    <span class="legend"><i class="op"></i>격리 업무 <i class="hr"></i>인사·총무 <i class="sec"></i>보안 <i class="club"></i>동호회 <i class="mine"></i>내 일정 <i class="leave"></i>휴가</span></div>
  <div class="calwrap">
    <div class="cal"><div class="cw">${["일","월","화","수","목","금","토"].map(w=>`<span>${w}</span>`).join("")}</div><div class="cg">${cells.join("")}</div></div>
    <div class="cday">
      <h4>${sd.getMonth()+1}월 ${sd.getDate()}일 (${["일","월","화","수","목","금","토"][sd.getDay()]})${sel===today()?' <span class="amber">오늘</span>':""}</h4>
      ${sev.length?sev.map(e=>`<div class="ce ${e.k}"><span class="tm">${esc(e.time)}</span><span class="tt">${e.appr?`<a class="xref" href="#approval?no=${e.appr}">${esc(e.t)}</a>`:esc(e.t)}</span>${e.k==="mine"?`<button type="button" class="x" data-cal-del="${e.id}" aria-label="${esc(e.t)} 삭제" title="삭제">✕</button>`:""}</div>`).join(""):`<div class="dim2" style="padding:8px 0">등록된 일정이 없습니다.</div>`}
      <form class="cadd" data-cal="${sel}">
        <label for="ca-t" class="sr">일정 내용</label><input id="ca-t" name="t" placeholder="새 일정 (예: SCP-999 면회)" maxlength="40" autocomplete="off" required>
        <label for="ca-time" class="sr">시각</label><input id="ca-time" name="time" type="time" value="09:00">
        <button class="btn" type="submit">추가</button>
      </form>
      <p class="dim2" style="font-size:11px;margin-top:10px">연차는 <a class="xref" href="#approval?new=leave">전자결재 휴가 신청</a>으로 등록됩니다.</p>
    </div>
  </div>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-cal]"); if(!f) return; e.preventDefault();
  const t=f.t.value.trim(); if(!t) return;
  const L=store.get(calKey(),[]); L.push({id:Date.now().toString(36),date:f.dataset.cal,time:f.time.value||"—",t});
  store.set(calKey(),L); route(); toast("일정이 등록되었습니다.");
  const inp=$("#ca-t"); if(inp) inp.focus();
});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-cal-del]"); if(!b) return;
  store.set(calKey(),store.get(calKey(),[]).filter(x=>x.id!==b.dataset.calDel)); route(); toast("일정이 삭제되었습니다.");
});

/* ════ 자료실 ════
   [분류, 제목, 부서, 며칠 전, 본문] — 본문 미리보기 · 텍스트 사본 내려받기 */
const ARCHIVE=[
 ["규정","보안 등급 및 문서 열람 권한 기준","RAISA",40,
  "1. 보안 인가 등급 (재단 규정)\n  · Level 0 (공무 한정 사용) — 격리 정보가 필요 없는 비보안 사무·잡무 인원\n  · Level 1 (신임) — 격리 시설의 사무·물류·잡무 인원 · 본 기지에서는 D계급 인원(D-)\n  · Level 2 (제한) — 대부분의 연구원·현장 요원·격리 전문가\n  · Level 3 (비밀) — 선임 연구원·프로젝트 책임자·보안 담당관 (DR-, MD-, R4-, L4-)\n  · Level 4 (극비) — 기지 이사관·보안 책임자·기동특무부대 사령관\n  · Level 5 (타우미엘) — O5 평의원 (본 단말 사용 불가)\n  · 인가 등급이 있어도 업무상 '알 필요가 있는' 정보에만 접근할 수 있음\n\n   인원 계급: A(전략 필수 인원) · B(국지 필수 인원) · C(변칙 개체 직접 취급) · D(소모성 인원) · E(노출 의심 임시 계급)\n\n2. 문서 요구 권한\n  · 안전 · 무효 · 해명 등급 문서 — Level 1\n  · 유클리드 등급 문서 — Level 2\n  · 케테르 등급 문서 — Level 3\n  · 아폴리온 · 타우미엘 · 미상 — Level 4\n  · 일부 부록은 상위 문서보다 한 단계 높은 권한을 요구할 수 있음\n\n3. 열람 권한 초과 시도\n  · 모든 시도는 RAISA에 기록되며 누적 3회 시 기억소거 검토 대상\n\n4. 임시 열람\n  · 전자결재 '문서 열람 권한 신청'으로 한 단계 위 문서를 24시간 열람 가능"],
 ["규정","격리 등급 분류 기준","격리 절차 위원회",120,
  "안전 (Safe)\n  충분히 이해되어 있어 신뢰성 있게 격리할 수 있는 개체. 위험하지 않다는 뜻이 아니다.\n\n유클리드 (Euclid)\n  충분히 이해되지 않았거나 본질적으로 예측할 수 없는 개체. 격리가 항상 신뢰할 수 있는 것은 아니다.\n\n케테르 (Keter)\n  지속적으로 격리하기 극도로 어렵거나, 격리 절차가 광범위하고 복잡한 개체.\n\n아폴리온 (Apollyon)\n  격리할 수 없으며, 격리 실패가 임박했거나 이미 진행 중인 개체.\n\n타우미엘 (Thaumiel)\n  다른 변칙 개체를 격리하거나 대응하는 데 재단이 사용하는 개체. 존재 자체가 극비.\n\n무효 (Neutralized) · 해명 (Explained)\n  변칙성을 잃었거나 과학적으로 완전히 설명된 개체."],
 ["안내","SCiPNET 단말 이용 안내 (명령어 · 단축키)","전산팀",25,
  "명령어 (화면 하단 커맨드라인)\n  open <번호>      문서 열람 (예: open 173, open 012-ko)\n  search <검색어>  데이터베이스 검색 (본문 포함)\n  list             색인된 항목 목록\n  history          최근 열람 기록\n  whoami           현재 세션 정보\n  fx               화면 효과 켜기/끄기\n  clear            화면 정리\n  logout           세션 종료\n\n단축키\n  /    커맨드라인으로 이동\n  Esc  한 단계 위로\n  ↑↓   이전 명령\n\n문서 화면\n  ★ 즐겨찾기 — 대시보드와 데이터베이스 '★ 즐겨찾기' 필터에 표시\n  가- / 가+ — 본문 글자 크기 (단말에 저장)\n  ‹ › — 번호 순 이전·다음 문서"],
 ["안내","전자결재 이용 안내","전산팀",18,
  "1. 기안: 전자결재 → [열람 권한 신청] 또는 [휴가 신청]\n2. 상신 후에는 수정·회수할 수 없습니다.\n3. 결재선\n  · 열람 권한 신청: 팀장 → 보안책임자 → RAISA\n  · 연차 휴가: 팀장 → 인사관리과\n4. 결과는 화면 알림으로 안내되며, 결재함에서 반려 의견을 확인할 수 있습니다.\n5. 자주 반려되는 사유\n  · 열람 사유가 10자 미만이거나 업무 연관성이 없음\n  · 요청 권한이 현재 권한보다 2단계 이상 높음\n  · 최근 보안 위반 이력 있음"],
 ["서식","정보 보안 서약서 (양식 SEC-19-04)","RAISA",200,
  "정보 보안 서약서\n\n소속:              식별번호:              성명:\n\n1. 본인은 SCiPNET에서 열람한 모든 정보를 재단 외부에 누설하지 않을 것을 서약합니다.\n2. 본인은 열람 권한을 초과하는 정보에 접근할 경우 기억소거 조치에 동의합니다.\n3. 본인은 이 서약서에 이전에 서명한 적이 없음을 기억합니다.\n\n          년    월    일\n\n서약자:                (서명)\n확인자: RAISA 담당관     (서명)"],
 ["서식","격리 위반 사건 보고서 (양식 CON-07)","격리 절차 위원회",90,
  "격리 위반 사건 보고서\n\n1. 사건 번호:\n2. 관련 항목: SCP-\n3. 발생 일시:            장소: 격리동  구역\n4. 등급: □ 경미  □ 중대  □ 심각\n5. 경위 (시간순):\n\n6. 인명 피해:  사망 __명 / 부상 __명 / 실종 __명\n7. 대응 부대: MTF\n8. 재격리 완료 일시:\n9. 격리 절차 개정 필요 여부: □ 예  □ 아니오\n\n보고자:              확인자(격리 책임자):"],
 ["서식","D계급 인원 실험 배정 요청서 (양식 EXP-02)","인사관리과",60,
  "D계급 인원 실험 배정 요청서\n\n요청 부서:\n담당 연구원:              보안 등급: Level\n관련 항목: SCP-\n필요 인원:   명\n실험 예정 일시:\n실험 개요 (예상 위험도 포함):\n\n※ 월말 계약 종료 예정 인원을 우선 배정합니다.\n※ 동일 인원의 반복 배정은 사유를 별도 기재하십시오."],
 ["업무","사내 주요 연락처","총무과",8,
  "보안팀 (상황실)        4-0119\n의무실                4-0200\n의무실 C-2 (기억소거)  4-0233\n인사관리과            4-1100\n시설관리과            4-1300\n전산팀 (헬프데스크)     4-1500\n카페테리아 A           4-2010\n격리동 B 관리          4-3100\n\n※ 개인 내선은 조직도에서 열람 사유 입력 후 확인하십시오."],
 ["업무","2026년 하반기 교육 이수 현황표","인사관리과",30,
  "필수 교육 (미이수 시 인사 고과 반영)\n  · 정보 보안 교육 (분기)      — 11월 1일 온라인\n  · 밈적 위해 대응 기초         — 연 1회\n  · 격리 위반 시 대피 요령       — 연 2회\n  · 기억소거 후 업무 복귀 안내   — 해당자\n\n이수 현황은 인사 파일에 자동 반영됩니다."],
];
const ARC_CAT=["전체","규정","안내","서식","업무"];
function archive(qs){
  const cat=(qs&&qs.get("c"))||"전체", q=((qs&&qs.get("q"))||"").trim();
  const rows=ARCHIVE.map((r,i)=>[i,...r]).filter(([,c,t,,,body])=>(cat==="전체"||c===cat)&&(!q||(t+body).includes(q)));
  return `<h2 class="ph">자료<span>실</span> · 규정 · 서식 · 안내</h2>
  <form class="search" data-arcq><label for="arq" class="sr">자료 검색</label><input id="arq" name="q" type="search" placeholder="제목·내용 검색" value="${esc(q)}" autocomplete="off"><button class="btn" type="submit">검색</button></form>
  <div class="filters" role="group" aria-label="분류">${ARC_CAT.map(c=>`<a class="chip ${c===cat?"on":""}" href="#archive${c==="전체"?"":"?c="+encodeURIComponent(c)}">${c}</a>`).join("")}</div>
  ${rows.length?`<table class="board"><tr><th class="c">분류</th><th>제목</th><th class="hm">등록 부서</th><th class="c hm">등록일</th><th class="c">파일</th></tr>
  ${rows.map(([i,c,t,dept,ago])=>`<tr class="row" data-arc="${i}"><td class="c dim">${c}</td><td><a href="#archive" class="rowlink hi" data-arc="${i}">${esc(t)}</a></td><td class="dim hm">${esc(dept)}</td><td class="c dim hm">${daysAgo(ago)}</td><td class="c"><button type="button" class="xref" data-arcdl="${i}">TXT</button></td></tr>`).join("")}</table>`
  :`<div class="empty">"${esc(q)}"에 해당하는 자료가 없습니다.<br><span class="dim2">분류를 '전체'로 바꾸거나 검색어를 줄여 보십시오.</span></div>`}`;
}
function arcText(i){ const [c,t,dept,ago,body]=ARCHIVE[i]; return `[대외비] SCP 재단 SITE-19 자료실 — ${c}\n${t}\n등록: ${dept} · ${daysAgo(ago)}\n내려받은 사람: ${S.user} · ${now()}\n${"─".repeat(40)}\n\n${body}\n` }
function arcDownload(i){
  const blob=new Blob([arcText(i)],{type:"text/plain;charset=utf-8"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=ARCHIVE[i][1].replace(/[\\/:*?"<>|()]/g,"").replace(/\s+/g,"_")+".txt";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  feedPush(`자료 내려받기 — ${S.user} · ${ARCHIVE[i][1]}`,"");
}
document.addEventListener("click",e=>{
  const dl=e.target.closest("[data-arcdl]");
  if(dl){ e.preventDefault(); e.stopPropagation(); arcDownload(+dl.dataset.arcdl); return }
  const r=e.target.closest("[data-arc]"); if(!r) return; e.preventDefault();
  const i=+r.dataset.arc, [c,t,dept,ago,body]=ARCHIVE[i];
  modal({title:`${esc(t)} <span class="dim2">· ${c}</span>`, cls:"wide",
    html:`<div class="dim2" style="font-size:11px;margin-bottom:10px">${esc(dept)} · ${daysAgo(ago)}</div><pre class="arcbody">${linkRefs(esc(body),"")}</pre>`,
    buttons:[{label:"텍스트로 내려받기",act:()=>arcDownload(i)},{label:"닫기",primary:true,act:x=>x()}],
    onOpen(back,close){ back.querySelectorAll(".xref").forEach(a=>a.addEventListener("click",close)) }});
});
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-arcq]"); if(!f) return; e.preventDefault();
  const p=new URLSearchParams(location.hash.split("?")[1]||""); const q=f.q.value.trim();
  q?p.set("q",q):p.delete("q"); go("#archive"+(p.toString()?"?"+p:""));
});
