/* ════════════════════════════════════════════
   업무 요청 (헬프데스크) — 전산 · 시설 · 보안 · 총무
   티켓: store "tk_<user>" = [{no, cat, sub, loc, title, body, pri, at, rate}]
   진행 단계는 접수 시각으로부터 계산 (접수 → 배정 → 처리 중 → 완료)
   ════════════════════════════════════════════ */
const TK_CAT={
  it:["전산","전산팀",["단말 고장","계정·권한","프린터","네트워크","소프트웨어 설치"],"A-19-0517"],
  fac:["시설","시설관리과",["전기·조명","냉난방","누수","출입문","청소"],"A-19-0402"],
  sec:["보안","보안부",["출입카드 재발급","CCTV 확인 요청","보안 USB","방문객 등록"],"A-19-0051"],
  ga:["총무","복리후생팀",["사무용품","가구","명함","택배·우편"],"A-19-0620"],
};
const TK_PRI={low:["낮음",1],mid:["보통",0.7],high:["긴급",0.4]};
const TK_STEPS=[["접수",0],["담당자 배정",20],["처리 중",45],["완료",90]];
const tkKey=()=>"tk_"+S.user, tkList=()=>store.get(tkKey(),[]);
const TK_DONE={it:["원격으로 점검 후 조치했습니다. 같은 문제가 반복되면 이 요청에 다시 남겨 주세요.","재부팅 후 정상 동작을 확인했습니다."],fac:["현장 확인 후 수리 완료했습니다.","부품 교체 완료했습니다. 불편을 드려 죄송합니다."],sec:["처리 완료했습니다. 보안팀에서 수령하시면 됩니다.","요청하신 내용 확인 후 처리했습니다."],ga:["요청 물품을 부서로 전달했습니다.","처리 완료했습니다."]};
function tkState(t){
  const k=TK_PRI[t.pri][1]; let i=0;
  TK_STEPS.forEach(([,sec],j)=>{ if(Date.now()>=t.at+sec*k*1000) i=j });
  return {i, name:TK_STEPS[i][0], when:j=>t.at+TK_STEPS[j][1]*k*1000, who:dirById(TK_CAT[t.cat][3])};
}
const tkNo=t=>`REQ-${new Date(t.at).getFullYear()}-${String(t.no).padStart(5,"0")}`;
function tkWatch(){
  let last=Object.fromEntries(tkList().map(t=>[t.no,tkState(t).i]));
  sessionLoop(()=>{ for(const t of tkList()){ const i=tkState(t).i; if(last[t.no]==null) last[t.no]=0; if(i>last[t.no]){
      toast(`업무 요청 <b>${tkNo(t)}</b> — ${TK_STEPS[i][0]}<br><a class="xref" href="#helpdesk?no=${t.no}">${esc(t.title)}</a>`);
      if(S.view==="helpdesk" && !/new=/.test(location.hash)) route() } last[t.no]=i } }, 2500);
}
function helpdesk(qs){
  const no=+(qs&&qs.get("no")); if(no) return tkDoc(no);
  if(qs&&qs.get("new")) return tkForm(qs.get("new"));
  const f=(qs&&qs.get("f"))||"open", L=tkList().slice().reverse();
  const rows=L.filter(t=>f==="all"||(f==="open"?tkState(t).i<3:tkState(t).i===3));
  return `<h2 class="ph">업무 <span>요청</span> · 헬프데스크</h2>
  <div class="tkcats">${Object.entries(TK_CAT).map(([k,[n,dept,subs]])=>`<a class="card tkcat" href="#helpdesk?new=${k}"><b>${n}</b><span class="dim2">${dept}</span><small>${subs.slice(0,3).join(" · ")}</small></a>`).join("")}</div>
  <div class="filters" style="margin-top:18px">${[["open","진행 중"],["done","완료"],["all","전체"]].map(([k,l])=>`<a class="chip ${k===f?"on":""}" href="#helpdesk?f=${k}">${l}</a>`).join("")}</div>
  ${rows.length?`<table><tr><th>요청 번호</th><th>분류</th><th>제목</th><th class="hm">요청일</th><th>상태</th></tr>${rows.map(t=>{const s=tkState(t);return `<tr class="row" data-href="#helpdesk?no=${t.no}"><td class="dim">${rowLink("#helpdesk?no="+t.no,tkNo(t),"")}</td><td class="dim">${TK_CAT[t.cat][0]} · ${esc(t.sub)}</td><td class="hi">${t.pri==="high"?'<span class="red">[긴급]</span> ':""}${esc(t.title)}</td><td class="dim hm">${fmtDate(t.at).slice(5)}</td><td><span class="tkst s${s.i}">${s.name}</span></td></tr>`}).join("")}</table>`
  :`<div class="empty">${f==="open"?"진행 중인 요청이 없습니다.":"요청 내역이 없습니다."}<br><span class="dim2">위에서 분류를 골라 요청을 접수하십시오.</span></div>`}`;
}
function tkForm(cat){
  const C=TK_CAT[cat]; if(!C) return helpdesk(new URLSearchParams());
  return `<a class="back" href="#helpdesk">← 업무 요청</a><h2 class="ph">${C[0]} <span>요청 접수</span> · ${C[1]}</h2>
  <form class="aform" data-tk="${cat}"><table class="ftab">
    <tr><th><label for="tk-sub">세부 분류</label></th><td><select id="tk-sub" name="sub">${C[2].map(x=>`<option>${x}</option>`).join("")}</select></td></tr>
    <tr><th><label for="tk-loc">위치</label></th><td><input id="tk-loc" name="loc" placeholder="예: B동 2층 연구실 3, 단말 NODE 0x3F1A" autocomplete="off"></td></tr>
    <tr><th><label for="tk-t">제목</label></th><td><input id="tk-t" name="title" maxlength="60" required autocomplete="off"></td></tr>
    <tr><th><label for="tk-b">내용</label></th><td><textarea id="tk-b" name="body" rows="6" placeholder="증상, 발생 시각, 연락 가능한 시간을 적어 주세요."></textarea></td></tr>
    <tr><th>긴급도</th><td>${Object.entries(TK_PRI).map(([k,[l]])=>`<label class="chk" style="display:inline-flex;margin-right:14px"><input type="radio" name="pri" value="${k}" ${k==="mid"?"checked":""}> ${l}</label>`).join("")}</td></tr>
  </table><div class="factions"><a class="btn" href="#helpdesk">취소</a><button class="btn primary" type="submit">접수</button></div></form>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-tk]"); if(!f) return; e.preventDefault();
  const v=Object.fromEntries(new FormData(f)); if(!v.title.trim()){ f.title.focus(); return }
  const L=tkList(), t={no:(L.reduce((m,x)=>Math.max(m,x.no),0)||srnd(S.user+"tk",4000,9000))+1, cat:f.dataset.tk, sub:v.sub, loc:v.loc.trim(), title:v.title.trim(), body:v.body.trim(), pri:v.pri||"mid", at:Date.now()};
  store.set(tkKey(),[...L,t]); feedPush(`업무 요청 접수 — ${S.user} · ${TK_CAT[t.cat][0]}`,""); toast(`접수되었습니다 · ${tkNo(t)}`); go("#helpdesk?no="+t.no);
});
function tkDoc(no){
  const t=tkList().find(x=>x.no===no); if(!t) return `<a class="back" href="#helpdesk">← 업무 요청</a><div class="empty">존재하지 않는 요청입니다.</div>`;
  const s=tkState(t), C=TK_CAT[t.cat], who=s.who?`${s.who[1]} (${s.who[0]})`:C[1];
  const log=[[0,`${esc(S.user)} 님이 요청을 접수했습니다.`],[1,`${C[1]} ${who} 님이 담당자로 배정되었습니다.`],[2,"담당자가 처리를 시작했습니다."],[3,spick(t.no+"d",TK_DONE[t.cat])]];
  return `<a class="back" href="#helpdesk">← 업무 요청</a>
  <div class="adoc"><div class="ahead"><div><div class="dim2" style="font-size:11px">${tkNo(t)} · ${C[0]} · ${esc(t.sub)}</div><h3>${t.pri==="high"?'<span class="red">[긴급]</span> ':""}${esc(t.title)}</h3></div><span class="tkst s${s.i} big">${s.name}</span></div>
  <ol class="tksteps">${TK_STEPS.map(([n],j)=>`<li class="${j<=s.i?"on":""} ${j===s.i?"cur":""}"><b>${n}</b><small>${j<=s.i?fmtDate(s.when(j)).slice(5):"—"}</small></li>`).join("")}</ol>
  <table class="ftab"><tr><th>요청자</th><td>${esc(S.user)}</td><th>담당</th><td>${s.i>=1?esc(who):'<span class="dim2">배정 전</span>'}</td></tr>
    <tr><th>위치</th><td colspan="3">${esc(t.loc)||'<span class="dim2">—</span>'}</td></tr><tr><th>내용</th><td colspan="3" style="white-space:pre-wrap">${esc(t.body)||'<span class="dim2">(없음)</span>'}</td></tr></table>
  <div class="tklog"><h4>처리 기록</h4>${log.filter(([j])=>j<=s.i).map(([j,m])=>`<div class="cm"><b>${j===0?esc(S.user):j===3?esc(who):C[1]}</b><span class="dim2">${fmtDate(s.when(j)).slice(5)}</span><div>${m}</div></div>`).join("")}</div>
  ${s.i===3?`<div class="notice"><b>처리 만족도</b><div class="stars" role="radiogroup" aria-label="만족도">${[1,2,3,4,5].map(n=>`<button type="button" class="${(t.rate||0)>=n?"on":""}" data-tkrate="${n}" data-no="${t.no}" aria-label="${n}점">★</button>`).join("")}</div>${t.rate?`<span class="dim2" style="font-size:11px">평가해 주셔서 감사합니다.</span>`:""}</div>`:""}
  </div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-tkrate]"); if(!b) return;
  store.set(tkKey(),tkList().map(t=>t.no===+b.dataset.no?{...t,rate:+b.dataset.tkrate}:t)); route();
});
