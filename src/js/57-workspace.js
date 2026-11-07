/* ════════════════════════════════════════════
   업무 도구 — 메일 쓰기 · 조직도 · 통합 검색 · 알림 센터 · 환경 설정 · 자유게시판 · 단축키
   ════════════════════════════════════════════ */

/* ════ 직원 주소록 ════ [식별번호, 이름, 부서, 직책, 상태] */
const DEPTS=["기지 관리부","연구부 · 격리동 B","보안부","RAISA 분소","인사관리과","시설관리과","전산팀","의무실","복리후생팀"];
const DIR=[
 ["A-19-0001","<span class='redact'>████</span>","기지 관리부","제19기지 이사관","근무 중"],
 ["A-19-0007","배유나","기지 관리부","관리자 비서실장","근무 중"],
 ["R-19-1177","정우진","연구부 · 격리동 B","선임 연구원 (팀장)","근무 중"],
 ["R-19-0412","서하윤","연구부 · 격리동 B","연구원","근무 중"],
 ["R-19-0893","한지호","연구부 · 격리동 B","격리 전문가","병가"],
 ["R-19-1530","임채원","연구부 · 격리동 B","연구원","출장"],
 ["R-19-1802","노경수","연구부 · 격리동 B","연구 보조","근무 중"],
 ["A-19-0120","강도윤","보안부","보안팀장","근무 중"],
 ["A-19-0051","문세아","보안부","보안 요원","근무 중"],
 ["A-19-0233","황보준","보안부","보안 요원 (야간)","휴무"],
 ["RA-07","RAISA 심사관","RAISA 분소","정보보안 심사","근무 중"],
 ["A-19-0310","박서연","인사관리과","과장","근무 중"],
 ["A-19-0344","조은비","인사관리과","주임","휴가"],
 ["A-19-0402","최민혁","시설관리과","주임","근무 중"],
 ["A-19-0517","윤태호","전산팀","헬프데스크","근무 중"],
 ["M-19-0021","김나래","의무실","의무관","근무 중"],
 ["M-19-0035","신동하","의무실","기억소거 담당","근무 중"],
 ["A-19-0620","오지민","복리후생팀","사원","근무 중"],
];
const dirById=id=>DIR.find(r=>r[0]===id);
const dirLabel=r=>`${r[1].replace(/<[^>]+>/g,"")} (${r[0]})`;
const STAT_CLS={"근무 중":"green","휴가":"amber","출장":"amber","병가":"amber","휴무":"dim2"};

/* ════ 조직도 ════
   #org            : 조직 체계도(관리자 → 본부 → 부서) + 전체 직원 표
   #org?d=부서      : 부서 소개(소속 본부·위치·대표 내선·업무) + 구성원 카드
   #org?q=검색어    : 직원 검색 · 이름을 누르면 인사 카드 */
const DEPT_INFO={
 "기지 관리부":     {hq:"관리 본부",loc:"관리동 3층",ext:"4-8000",job:"기지 운영 총괄, O5 평의회 보고, 부서 간 조정"},
 "인사관리과":     {hq:"관리 본부",loc:"관리동 2층",ext:"4-3100",job:"인사 기록, 채용·전보, 보안 등급 심사 지원, 근태"},
 "시설관리과":     {hq:"관리 본부",loc:"관리동 지하 1층",ext:"4-4100",job:"격리실 설비, 전력·공조, 회의실·시설 관리"},
 "전산팀":         {hq:"관리 본부",loc:"관리동 지하 2층 전산실",ext:"4-1500",job:"SCiPNET 운영, 단말·계정 관리, 헬프데스크"},
 "복리후생팀":     {hq:"관리 본부",loc:"생활동 1층",ext:"4-6200",job:"카페테리아, 숙소, 동호회, 사내 행사"},
 "연구부 · 격리동 B":{hq:"연구 본부",loc:"격리동 B 2층",ext:"4-1100",job:"격리동 B 개체 연구, 격리 절차 개정, 실험 기록"},
 "의무실":         {hq:"연구 본부",loc:"생활동 지하 1층",ext:"4-0200",job:"직원 진료, 기억소거제 투여, 밈적 노출 대응"},
 "보안부":         {hq:"보안 본부",loc:"보안동 1층 상황실",ext:"4-0119",job:"출입 통제, 격리 파기 대응, 기동특무부대 연락"},
 "RAISA 분소":     {hq:"보안 본부",loc:"관리동 3층",ext:"4-0700",job:"정보보안 심사, 열람 기록 감사, 문서 등급 관리",dot:"RAISA 본부 파견"},
};
const HQS=["관리 본부","연구 본부","보안 본부"];
const RANK=t=>/(관리자|이사관)$/.test(t)?0:/(팀장|과장|실장|장\)|의무관)/.test(t)?1:/(선임|주임|전문가|심사)/.test(t)?2:3;
const deptHead=d=>DIR.filter(r=>r[2]===d).sort((a,b)=>RANK(a[3])-RANK(b[3]))[0];
const pName=r=>r[1].replace(/<[^>]+>/g,"")||"[편집됨]";
const initials=r=>{const n=pName(r).replace(/[^가-힣A-Za-z]/g,"");return n?(/[가-힣]/.test(n)?n.slice(-2):n.slice(0,2).toUpperCase()):"?"};
const statDot=s=>`<span class="sdot ${STAT_CLS[s]||""}" aria-hidden="true"></span>${s}`;
const HQ_COLOR={"관리 본부":"hq-a","연구 본부":"hq-r","보안 본부":"hq-s"};
const DIRECTOR="A-19-0001";
/* 본부장: 소속 부서장 중 가장 높은 직급이 겸임 */
const hqHead=hq=>DEPTS.filter(d=>d!=="기지 관리부"&&(DEPT_INFO[d]||{}).hq===hq).map(deptHead).filter(Boolean).sort((a,b)=>RANK(a[3])-RANK(b[3]))[0];
const shortTitle=t=>t.replace(/\s*\(.*\)/,"");
function orgMem(r,head){
  return `<button type="button" class="omem${head?" head":""}" data-person="${r[0]}" title="${esc(pName(r)+" · "+r[3]+" · "+r[4])}">
    <span class="pav sm" aria-hidden="true">${initials(r)}</span><span class="omn"><b>${r[1]}</b><span class="dim2">${shortTitle(r[3])}</span></span>
    ${head?`<span class="ohtag">부서장</span>`:`<span class="sdot ${STAT_CLS[r[4]]||""}" aria-label="${r[4]}"></span>`}</button>`;
}
function orgUnit(d,cur,skip){
  const I=DEPT_INFO[d]||{}, ppl=DIR.filter(r=>r[2]===d&&r[0]!==skip).sort((a,b)=>RANK(a[3])-RANK(b[3])), h=ppl[0];
  return `<div class="ounit ${HQ_COLOR[I.hq]||""}${d===cur?" on":""}${I.dot?" dotted":""}">
    <a class="ouh" href="#org?d=${encodeURIComponent(d)}"><b>${d}</b><span>${ppl.length}명</span></a>
    ${I.dot?`<div class="ouno">${I.dot}</div>`:""}
    <div class="oub">${h?orgMem(h,true):""}<div class="omems">${ppl.slice(1).map(r=>orgMem(r)).join("")}</div></div></div>`;
}
function orgChart(){
  const top=dirById(DIRECTOR), compact=store.get("org_compact",false);
  const staff="기지 관리부";
  return `<div class="ochart${compact?" compact":""}" role="group" aria-label="SITE-19 조직도">
    <div class="ochead"><span class="dim2">SITE-19 조직도 · ${new Date().getFullYear()}년 기준 · 총 ${DIR.length}명</span>
      <span class="oclegend"><i class="hq-a"></i>관리 <i class="hq-r"></i>연구 <i class="hq-s"></i>보안 <i class="dot"></i>파견</span>
      <button type="button" class="btn sm" data-orgcompact>${compact?"구성원 모두 보기":"부서장만 보기"}</button></div>
    <div class="otop">
      <div class="oceo"><button type="button" class="ounit ceo" data-person="${DIRECTOR}">
        <span class="ouh"><b>제19기지 이사관</b><span>Site Director</span></span>
        <span class="oub"><span class="omem head"><span class="pav sm" aria-hidden="true">${top?initials(top):"?"}</span><span class="omn"><b>${top?top[1]:""}</b><span>${clrTag(DIRECTOR)}</span></span></span></span></button></div>
      <div class="ostaffrow"><div class="ostaff">${orgUnit(staff,"",DIRECTOR)}</div></div>
    </div>
    <div class="ohqs">${HQS.map(hq=>{const hh=hqHead(hq), ds=DEPTS.filter(d=>d!==staff&&(DEPT_INFO[d]||{}).hq===hq);
      const n=DIR.filter(r=>ds.includes(r[2])).length;
      return `<div class="ohq"><div class="ohqb ${HQ_COLOR[hq]}"><b>${hq}</b><span class="dim2">본부장(겸) ${hh?`${pName(hh)} · ${shortTitle(hh[3])}`:"공석"}</span><span class="dim2">${ds.length}개 부서 · ${n}명</span></div>
      <div class="odepts">${ds.map(d=>`<div class="od">${orgUnit(d)}</div>`).join("")}</div></div>`}).join("")}</div></div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-orgcompact]"); if(!b) return;
  const c=b.closest(".ochart"), on=!c.classList.contains("compact");
  c.classList.toggle("compact",on); store.set("org_compact",on); b.textContent=on?"구성원 모두 보기":"부서장만 보기";
});
function personCard(r){
  return `<button type="button" class="pcard" data-person="${r[0]}"><span class="pav" aria-hidden="true">${initials(r)}</span>
    <span class="pcm"><b>${r[1]}</b><span class="dim2">${r[3]}</span><span>${clrTag(r[0])}</span><span class="pst">${statDot(r[4])}</span></span></button>`;
}
function org(qs){
  const dept=(qs&&qs.get("d"))||"", q=((qs&&qs.get("q"))||"").trim();
  const count=d=>DIR.filter(r=>r[2]===d).length;
  const side=`<nav class="otree" aria-label="부서">
      <a href="#org" class="${!dept&&!q?"on":""}">SITE-19 전체 <span class="dim2">${DIR.length}</span></a>
      ${HQS.map(hq=>`<div class="ohqn">${hq}</div>${DEPTS.filter(d=>(DEPT_INFO[d]||{}).hq===hq).map(d=>`<a href="#org?d=${encodeURIComponent(d)}" class="sub ${d===dept?"on":""}">${d} <span class="dim2">${count(d)}</span></a>`).join("")}`).join("")}
    </nav>`;
  const form=`<form class="search" data-orgq><label for="oq" class="sr">직원 검색</label><input id="oq" name="q" type="search" placeholder="이름 · 식별번호 · 직책 검색" value="${esc(q)}" autocomplete="off"><button class="btn" type="submit">검색</button></form>`;
  let main;
  if(dept){
    const I=DEPT_INFO[dept]||{}, ppl=DIR.filter(r=>r[2]===dept).sort((a,b)=>RANK(a[3])-RANK(b[3])), h=ppl[0];
    const on=ppl.filter(r=>r[4]==="근무 중").length;
    main=`<div class="dhead card"><div class="dtitle"><span class="dim2">${I.hq||""}${I.dot?` · ${I.dot}`:""}</span><h3>${dept}</h3></div>
      <dl class="dkv"><dt>부서장</dt><dd>${h?`${h[1]} <span class="dim2">${h[3]}</span>`:"—"}</dd><dt>위치</dt><dd>${I.loc||"—"}</dd>
      <dt>대표 내선</dt><dd>${I.ext||"—"}</dd><dt>인원</dt><dd>${ppl.length}명 <span class="dim2">(근무 중 ${on})</span></dd><dt>주요 업무</dt><dd>${I.job||"—"}</dd></dl></div>
      <h4 class="osub">구성원</h4><div class="pgrid">${ppl.map(personCard).join("")}</div>`;
  } else if(q){
    const rows=DIR.filter(r=>r.join(" ").toLowerCase().includes(q.toLowerCase()));
    main=rows.length?`<div class="dim2" style="margin:4px 0 8px">"${esc(q)}" 검색 결과 ${rows.length}명</div><div class="pgrid">${rows.map(r=>personCard(r).replace('<span class="pst">',`<span class="dim2">${r[2]}</span><span class="pst">`)).join("")}</div>`
      :`<div class="empty">"${esc(q)}"에 해당하는 직원이 없습니다. 이름, 식별번호, 직책으로 검색할 수 있습니다.</div>`;
  } else {
    const rows=[...DIR].sort((a,b)=>DEPTS.indexOf(a[2])-DEPTS.indexOf(b[2])||RANK(a[3])-RANK(b[3]));
    main=`<h4 class="osub" style="margin-top:0">전체 직원 <span class="dim2">${DIR.length}명</span></h4>
      <table class="org"><tr><th>이름</th><th class="hm">식별번호</th><th>부서 · 직책</th><th>인가 · 계급</th><th>내선</th><th>상태</th></tr>
      ${rows.map(r=>`<tr><td><button type="button" class="plink" data-person="${r[0]}">${r[1]}</button></td><td class="dim hm" style="white-space:nowrap">${r[0]}</td><td class="dim">${r[2]}<br><span class="dim2">${r[3]}</span></td><td style="white-space:nowrap">${clrTag(r[0])}</td><td>${maskedExt(r[0])}</td><td class="${STAT_CLS[r[4]]||""}">${statDot(r[4])}</td></tr>`).join("")}</table>`;
  }
  return `<h2 class="ph">조직<span>도</span> · SITE-19</h2>
  ${!dept&&!q?orgChart():""}
  <div class="orgwrap">${side}<div>${form}${main}
    <p class="dim2" style="font-size:11px;margin-top:14px">내선 번호는 개인정보 보호를 위해 열람 사유를 입력해야 표시됩니다. 인사 기록 상세는 <a class="xref" href="#personnel">인사 파일</a>에서 확인하십시오.</p></div></div>`;
}
/* 인사 카드 */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-person]"); if(!b) return;
  const r=dirById(b.dataset.person); if(!r) return; const I=DEPT_INFO[r[2]]||{};
  modal({title:"인사 카드",html:`<div class="pfull"><span class="pav lg" aria-hidden="true">${initials(r)}</span><div><b class="pn2">${r[1]}</b><div class="dim">${r[3]}</div></div></div>
    <table class="kv" style="margin-top:12px"><tr><td class="dim2">식별번호</td><td>${r[0]}</td></tr><tr><td class="dim2">소속</td><td>${I.hq?I.hq+" › ":""}${r[2]}</td></tr>
    <tr><td class="dim2">근무지</td><td>${I.loc||"—"}</td></tr><tr><td class="dim2">재단 직함</td><td>${staffClr(r[0])[2]}</td></tr><tr><td class="dim2">보안 인가</td><td>${lvLabel(staffClr(r[0])[0])}</td></tr><tr><td class="dim2">인원 계급</td><td>${staffClr(r[0])[1]}계급 <div class="dim2" style="font-size:11.5px">${esc(clsBrief(staffClr(r[0])[1]))}</div></td></tr><tr><td class="dim2">상태</td><td class="${STAT_CLS[r[4]]||""}">${statDot(r[4])}</td></tr>
    <tr><td class="dim2">내선</td><td>4-${srnd(r[0]+"e",1,9)}** <span class="dim2">(조직도 표에서 사유 입력 후 열람)</span></td></tr></table>`,
    buttons:[{label:"부서 보기",act:c=>{c();go("#org?d="+encodeURIComponent(r[2]))}},{label:"메일 쓰기",primary:true,act:c=>{c();go("#messages?new=1&to="+encodeURIComponent(r[0]))}}]});
});
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-orgq]"); if(!f) return; e.preventDefault();
  const p=new URLSearchParams(location.hash.split("?")[1]||""); const q=f.q.value.trim();
  q?p.set("q",q):p.delete("q"); go("#org"+(p.toString()?"?"+p:""));
});

/* ════ 메일: 쓰기 · 보낸편지함 · 자동 회신 ════
   보낸 메일 {id, to, subj, body, at, re}. 회신은 저장하지 않고 보낸 시각 + 지연으로 계산 */
const sentKey=()=>"sent_"+S.user;
const sentList=()=>store.get(sentKey(),[]);
function replyFor(m){
  const r=dirById(m.to); if(!r) return null;
  const delay=srnd(m.id+"d",12,40)*1000, at=m.at+delay;
  if(Date.now()<at) return null;
  const nm=r[1].replace(/<[^>]+>/g,"");
  let body;
  if(r[4]!=="근무 중") body=`[자동 응답] 안녕하십니까, ${nm}입니다. 현재 ${r[4]}으로 부재 중이며 복귀 후 확인하겠습니다. 급한 업무는 ${r[2]} 대표 내선으로 연락 바랍니다.`;
  else if(r[0]==="A-19-0001") body="[자동 응답] 기지 관리자 앞 메일은 비서실에서 1차 검토 후 전달됩니다. 회신까지 영업일 기준 3~5일 소요됩니다.";
  else if(r[0]==="RA-07") body=`RAISA 접수 번호 RA-${srnd(m.id,10000,99999)} 로 등록되었습니다. 심사 결과는 별도 통보됩니다. 본 메일에 회신하지 마십시오.`;
  else if(r[2]==="전산팀") body=`헬프데스크 티켓 #${srnd(m.id,3000,9999)} 이 생성되었습니다. 단말 재부팅 후에도 동일하면 이 메일에 회신해 주세요.`;
  else body=spick(m.id,[`메일 잘 받았습니다. 확인 후 다시 연락드릴게요.`,`네, 확인했습니다. 내일 오전 중으로 정리해서 보내드리겠습니다.`,`검토해 보겠습니다. 관련 자료 있으면 같이 보내 주세요.`,`확인했습니다. 감사합니다.`]);
  return {id:"re_"+m.id, from:dirLabel(r), fromId:r[0], at:fmtDate(at), ts:at, subj:"RE: "+m.subj, body};
}
function mailReplies(){ return sentList().map(replyFor).filter(Boolean).sort((a,b)=>b.ts-a.ts) }
function mailWatch(){
  let seen=new Set(mailReplies().map(r=>r.id));
  sessionLoop(()=>{
    const R=mailReplies(); let fresh=R.filter(r=>!seen.has(r.id));
    fresh.forEach(r=>{ seen.add(r.id); toast(`<b>새 메일</b> — ${esc(r.from)}<br><a class="xref" href="#messages">${esc(r.subj)}</a>`); feedPush(`메일 수신 — ${S.user} ← ${r.fromId}`,"") });
    if(fresh.length){ updateUnread(); if(S.view==="messages" && !/new=|box=/.test(location.hash)) route() }
  }, 3000);
}
function mailTabs(cur){
  const unread=msgList().filter(m=>!m.draft && !S.readMsgs.includes(m.id)).length;
  return `<div class="filters" role="group" aria-label="편지함">
    <a class="chip ${cur==="in"?"on":""}" href="#messages">받은편지함${unread?` ${unread}`:""}</a>
    <a class="chip ${cur==="sent"?"on":""}" href="#messages?box=sent">보낸편지함 ${sentList().length}</a>
    <a class="chip ${cur==="new"?"on":""}" href="#messages?new=1">✎ 메일 쓰기</a></div>`;
}
function messages(qs){
  if(qs&&qs.get("new")) return mailCompose(qs.get("to")||"", qs.get("re")||"");
  if(qs&&qs.get("box")==="sent") return mailSent(qs.get("id"));
  const L=msgList();
  const who=m=>m.fromId||(DIR.find(r=>m.from.includes(r[0]))||[])[0];
  const html=`<h2 class="ph">내부 <span>통신</span></h2>${mailTabs("in")}
  <div class="msglist">${L.map(m=>{const rid=who(m);return `<div class="m ${!m.draft&&!S.readMsgs.includes(m.id)?"unread":""} ${m.cls||""}"><div class="f"><span>${esc(m.from)}</span><span class="${m.draft?"red":""}">${esc(m.at)}</span></div>${m.subj?`<div class="subj">${esc(m.subj)}</div>`:""}${m.html||linkRefs(esc(m.body),"")}
    ${rid&&!m.draft?`<div class="mact"><a class="xref" href="#messages?new=1&to=${encodeURIComponent(rid)}&re=${encodeURIComponent(m.id)}">답장</a></div>`:""}</div>`}).join("")}</div>`;
  S.readMsgs=[...new Set([...S.readMsgs,...L.map(m=>m.id)])]; saveSession(); updateUnread();
  return html;
}
function mailCompose(to, re){
  const orig=re?msgList().find(m=>m.id===re):null;
  const subj=orig?("RE: "+(orig.subj||orig.body.slice(0,20)+"…")).replace(/^(RE: )+/,"RE: "):"";
  const quote=orig?`\n\n-----원본 메일-----\n보낸 사람: ${orig.from}\n${orig.body||""}`:"";
  return `<h2 class="ph">내부 <span>통신</span></h2>${mailTabs("new")}
  <form class="aform" data-mail><table class="ftab">
    <tr><th><label for="mt">받는 사람</label></th><td><select id="mt" name="to" required>${DEPTS.map(d=>`<optgroup label="${d}">${DIR.filter(r=>r[2]===d).map(r=>`<option value="${r[0]}" ${r[0]===to?"selected":""}>${esc(dirLabel(r))} — ${r[3]}${r[4]!=="근무 중"?` [${r[4]}]`:""}</option>`).join("")}</optgroup>`).join("")}</select></td></tr>
    <tr><th><label for="ms">제목</label></th><td><input id="ms" name="subj" value="${esc(subj)}" maxlength="80" required autocomplete="off"></td></tr>
    <tr><th><label for="mb">내용</label></th><td><textarea id="mb" name="body" rows="9" required>${esc(quote)}</textarea></td></tr>
    <tr><th>보안 등급</th><td><select name="cls"><option>일반</option><option>대외비</option><option>기밀</option></select> <span class="dim2" style="font-size:11px">기밀 메일은 수신자 권한을 확인한 뒤 전달됩니다.</span></td></tr>
  </table><div class="factions"><a class="btn" href="#messages">취소</a><button class="btn primary" type="submit">보내기</button></div></form>`;
}
function mailSent(id){
  const L=sentList().slice().reverse();
  if(id){ const m=L.find(x=>x.id===id); if(m){ const r=dirById(m.to)||[m.to,m.to]; const rep=replyFor(m);
    return `<h2 class="ph">내부 <span>통신</span></h2>${mailTabs("sent")}<a class="back" href="#messages?box=sent">← 보낸편지함</a>
    <div class="post"><div class="ptitle">${esc(m.subj)}</div><div class="pmeta"><span>받는 사람 ${esc(dirLabel(r))}</span><span>${fmtDate(m.at)}</span><span>${esc(m.cls||"일반")}</span><span class="${rep?"green":"dim2"}">${rep?"회신 받음":"읽지 않음"}</span></div>
    <div class="pbody">${esc(m.body)}</div></div>` } }
  return `<h2 class="ph">내부 <span>통신</span></h2>${mailTabs("sent")}
  ${L.length?`<table class="board"><tr><th>받는 사람</th><th>제목</th><th class="c hm">보낸 시각</th><th class="c">상태</th></tr>
  ${L.map(m=>{const r=dirById(m.to); return `<tr class="row" data-href="#messages?box=sent&id=${m.id}"><td class="dim">${r?esc(r[1].replace(/<[^>]+>/g,"")):m.to}</td><td>${rowLink("#messages?box=sent&id="+m.id,esc(m.subj),"hi")}</td><td class="c dim hm">${fmtDate(m.at).slice(5)}</td><td class="c ${replyFor(m)?"green":"dim2"}">${replyFor(m)?"회신":"읽지 않음"}</td></tr>`}).join("")}</table>`
  :`<div class="empty">보낸 메일이 없습니다.<br><a class="xref" href="#messages?new=1">메일 쓰기 →</a></div>`}`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-mail]"); if(!f) return; e.preventDefault();
  const v=Object.fromEntries(new FormData(f));
  if(!v.subj.trim()||!v.body.trim()){ toast("제목과 내용을 입력하십시오.","danger"); return }
  const m={id:Date.now().toString(36), to:v.to, subj:v.subj.trim(), body:v.body.trim(), cls:v.cls, at:Date.now()};
  store.set(sentKey(),[...sentList(),m]);
  feedPush(`메일 발신 — ${S.user} → ${v.to}`,"");
  toast("메일을 보냈습니다."); go("#messages?box=sent");
});

/* ════ 알림 센터 ════ toast() 로 뜬 알림을 사용자별로 30건 보관 */
const notiKey=()=>"noti_"+S.user;
function notiLog(html, cls){
  if(!S.booted||!S.user) return;
  const L=store.get(notiKey(),[]); L.unshift({h:html,c:cls,t:Date.now(),r:0}); store.set(notiKey(),L.slice(0,30)); notiBadge();
}
function notiBadge(){ const n=store.get(notiKey(),[]).filter(x=>!x.r).length, b=$("#belln"); if(b) b.textContent=n?n:""; const bt=$("#bell"); if(bt) bt.setAttribute("aria-label",`알림 ${n}건`) }
function notiToggle(force){
  const p=$("#notipanel"), b=$("#bell"), open=force!=null?force:p.hidden;
  p.hidden=!open; b.setAttribute("aria-expanded",open);
  if(!open) return;
  const L=store.get(notiKey(),[]);
  p.innerHTML=`<div class="nh"><b>알림</b><button type="button" class="xref" data-noti="clear">모두 지우기</button></div>
    ${L.length?L.map(x=>`<div class="ni ${x.r?"":"unr"} ${x.c||""}"><div>${x.h}</div><small>${fmtDate(x.t).slice(5)}</small></div>`).join(""):`<div class="ni dim2">새 알림이 없습니다.</div>`}`;
  store.set(notiKey(),L.map(x=>({...x,r:1}))); notiBadge();
}
document.addEventListener("click",e=>{
  if(e.target.closest("#bell")){ notiToggle(); return }
  if(e.target.closest("[data-noti=clear]")){ store.set(notiKey(),[]); notiToggle(true); return }
  const p=$("#notipanel"); if(p && !p.hidden && !e.target.closest("#notipanel")) notiToggle(false);
  else if(p && !p.hidden && e.target.closest("#notipanel a")) notiToggle(false);
});

/* ════ 통합 검색 ════ 문서 · 게시판 · 자료실 · 직원 · 메일 */
function search(qs){
  const q=((qs&&qs.get("q"))||"").trim(), ql=q.toLowerCase();
  const head=`<h2 class="ph">통합 <span>검색</span></h2>
  <form class="search" data-gsq><label for="sq" class="sr">검색어</label><input id="sq" name="q" type="search" value="${esc(q)}" placeholder="문서 · 게시판 · 자료실 · 직원 · 메일" autocomplete="off"><button class="btn" type="submit">검색</button></form>`;
  if(!q) return head+`<div class="empty">검색어를 입력하십시오.<br><span class="dim2">상단 검색창이나 커맨드라인 <kbd>find 검색어</kbd> 로도 검색할 수 있습니다.</span></div>`;
  const has=s=>String(s||"").toLowerCase().includes(ql);
  const strip=s=>String(s).replace(/<[^>]+>/g,"");
  const docs=sortedIds().map(k=>SCP[k]).filter(d=>metaText(d).includes(ql)||(d.full_text&&textAt(d,ql)>=0&&lvlFor(d.id)>=reqLevel(d.object_class)));
  const posts=[...BOARD.map(b=>({href:`#board?no=${b[0]}`,t:b[2],s:b[6],m:`공지 · ${b[3]}`})),...freePosts().map(p=>({href:`#board?tab=free&no=${p.no}`,t:p.title,s:p.body,m:`자유게시판 · ${p.user}`}))].filter(p=>has(p.t)||has(p.s));
  const arcs=ARCHIVE.map((r,i)=>({i,r})).filter(({r})=>has(r[1])||has(r[4]));
  const ppl=DIR.filter(r=>has(strip(r.join(" "))));
  const mails=[...msgList().filter(m=>!m.draft&&(has(m.body)||has(m.from)||has(m.subj))).map(m=>({href:"#messages",t:m.subj||m.body.slice(0,40),m:m.from})),...sentList().filter(m=>has(m.subj)||has(m.body)).map(m=>({href:`#messages?box=sent&id=${m.id}`,t:m.subj,m:"보낸 메일"}))];
  const hl=s=>{ s=esc(strip(s)); const i=s.toLowerCase().indexOf(esc(ql)); return i<0?s:s.slice(0,i)+`<mark>${s.slice(i,i+esc(ql).length)}</mark>`+s.slice(i+esc(ql).length) };
  const sec=(title,n,items)=>`<div class="sgroup"><h4>${title} <span class="dim2">${n}건</span></h4>${n?items:`<div class="dim2 si">결과 없음</div>`}</div>`;
  const total=docs.length+posts.length+arcs.length+ppl.length+mails.length;
  return head+`<p class="dim" style="margin:-4px 0 14px;font-size:12px">"${esc(q)}" 검색 결과 ${total}건</p>
  ${sec("격리 데이터베이스",docs.length,docs.slice(0,10).map(d=>`<a class="si" href="#${d.id.toLowerCase()}">${badge(d)} <b>${hl(d.id)}</b> <span class="dim">${hl(docName(d))}</span></a>`).join("")+(docs.length>10?`<a class="si xref" href="#database?q=${encodeURIComponent(q)}">데이터베이스에서 ${docs.length}건 모두 보기 →</a>`:""))}
  ${sec("게시판",posts.length,posts.slice(0,8).map(p=>`<a class="si" href="${p.href}"><b>${hl(p.t)}</b> <span class="dim2">${esc(p.m)}</span></a>`).join(""))}
  ${sec("자료실",arcs.length,arcs.map(({i,r})=>`<a class="si" href="#archive" data-arc="${i}"><b>${hl(r[1])}</b> <span class="dim2">${r[0]} · ${esc(r[2])}</span></a>`).join(""))}
  ${sec("직원",ppl.length,ppl.map(r=>`<a class="si" href="#org?d=${encodeURIComponent(r[2])}"><b>${hl(r[1])}</b> <span class="dim">${r[0]}</span> <span class="dim2">${r[2]} · ${r[3]}</span></a>`).join(""))}
  ${sec("메일",mails.length,mails.slice(0,8).map(m=>`<a class="si" href="${m.href}"><b>${hl(m.t)}</b> <span class="dim2">${esc(m.m)}</span></a>`).join(""))}`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-gsq],#gsearch"); if(!f) return; e.preventDefault();
  const q=(f.q||f.querySelector("input")).value.trim(); if(!q) return;
  if(f.id==="gsearch") f.querySelector("input").blur();
  go("#search?q="+encodeURIComponent(q));
});

/* ════ 환경 설정 ════ 테마 · 글자 크기 · 효과 · 자동 로그아웃 · 데이터 */
const THEMES=[["default","기본 (회색)"],["green","녹색 단말"],["amber","호박색 단말"],["light","밝은 그룹웨어 (사내 표준)"]];
function applyTheme(){ const t=store.get("theme","default"); document.body.dataset.theme=t==="default"?"":t }
function applyIdle(){ GW.idleMs=store.get("idle",5)*60000 }
applyTheme(); applyIdle();
function settings(){
  const t=store.get("theme","default"), idle=store.get("idle",5), fs=store.get("fs",13.5);
  return `<h2 class="ph">환경 <span>설정</span> · ${esc(S.user)}</h2>
  <div class="setgrid">
    <section class="card"><div class="k">내 정보</div>
      <table class="kv"><tr><td class="dim2">식별번호</td><td>${esc(S.user)}</td></tr><tr><td class="dim2">보안 인가</td><td>${LVL_NAME[S.level]} <span class="dim2">(${LVL_EN[S.level]})</span></td></tr><tr><td class="dim2">인원 계급</td><td>${userClass(S.user)}계급</td></tr>
      <tr><td class="dim2">소속</td><td>SITE-19 격리동 B</td></tr><tr><td class="dim2">세션</td><td>${$("#sess").textContent}</td></tr>
      <tr><td class="dim2">누적 위반</td><td class="${S.denied?"amber":""}">${S.denied}회</td></tr><tr><td class="dim2">열람 기록</td><td>${S.recent.length}건 · 즐겨찾기 ${favs().length}건</td></tr></table></section>
    <section class="card"><div class="k">화면 테마</div>
      <div class="opts" role="radiogroup" aria-label="화면 테마">${THEMES.map(([k,l])=>`<label class="chk"><input type="radio" name="theme" value="${k}" data-set="theme" ${k===t?"checked":""}> ${l}</label>`).join("")}</div></section>
    <section class="card"><div class="k">읽기</div>
      <div class="srow"><span>문서 글자 크기</span><span><button type="button" class="tb" data-dt="fs-">가-</button> <b id="fsv">${fs}px</b> <button type="button" class="tb" data-dt="fs+">가+</button></span></div>
      <label class="chk"><input type="checkbox" data-set="fx" ${FX.on?"checked":""}> 깜빡임 · 글리치 · 흔들림 효과</label></section>
    <section class="card"><div class="k">보안</div>
      <div class="srow"><label for="idle">자동 로그아웃 (유휴)</label><select id="idle" data-set="idle">${[5,15,30,60].map(n=>`<option value="${n}" ${n===idle?"selected":""}>${n}분</option>`).join("")}</select></div>
      <div class="srow"><span>접속 팝업 공지</span><button type="button" class="btn" data-set="popup">다시 보기</button></div></section>
    <section class="card"><div class="k">데이터</div>
      <p class="dim" style="font-size:12px;margin-bottom:10px">이 단말(브라우저)에 저장된 ${esc(S.user)}의 기록: 결재 ${apprList().length}건, 일정 ${store.get(calKey(),[]).length}건, 보낸 메일 ${sentList().length}건, 알림 ${store.get(notiKey(),[]).length}건</p>
      <button type="button" class="btn" data-set="wipe">내 기록 초기화…</button></section>
    <section class="card"><div class="k">단축키</div><p class="dim" style="font-size:12px"><kbd>?</kbd> 를 누르면 전체 단축키를 볼 수 있습니다.</p><button type="button" class="btn" data-set="keys" style="margin-top:8px">단축키 보기</button></section>
  </div>`;
}
document.addEventListener("change",e=>{
  const el=e.target.closest("[data-set]"); if(!el) return; const k=el.dataset.set;
  if(k==="theme"){ store.set("theme",el.value); applyTheme(); drawWatermark() }
  if(k==="fx" && el.checked!==FX.on) toggleFx();
  if(k==="idle"){ store.set("idle",+el.value); applyIdle(); toast(`유휴 ${el.value}분 후 자동 로그아웃됩니다.`) }
});
document.addEventListener("click",e=>{
  const el=e.target.closest("button[data-set]"); if(!el) return; const k=el.dataset.set;
  if(k==="popup"){ store.set("popup_"+S.user,{hide:"",n:0}); popupNotice() }
  if(k==="keys") showKeys();
  if(k==="wipe") modal({title:"내 기록 초기화",html:`<p>${esc(S.user)}의 결재·일정·보낸 메일·알림·즐겨찾기·열람 기록·위반 횟수를 이 단말에서 지웁니다. 되돌릴 수 없습니다.</p>`,
    buttons:[{label:"취소",act:c=>c()},{label:`${esc(S.user)} 기록 지우기`,primary:true,act:c=>{
      ["appr_","apprseen_","cal_","sent_","noti_","fav_","bread_","popup_","pwnote_"].forEach(p=>{ try{localStorage.removeItem("scipnet_"+p+S.user)}catch(_){} });
      S.recent=[]; S.readMsgs=[]; S.denied=0; saveSession(); c(); notiBadge(); apprBadge(); route(); toast("기록을 초기화했습니다.") }}]});
});
/* 글자 크기를 설정 화면에서 바꾸면 숫자도 갱신 */
document.addEventListener("click",e=>{ if(e.target.closest("[data-dt^=fs]")){ const v=$("#fsv"); if(v) setTimeout(()=>v.textContent=store.get("fs",13.5)+"px") } });

/* ════ 자유게시판 ════ 이 단말의 모든 사용자가 공유 (store "freeboard") */
const FREE_SEED=[
 {no:312,user:"R-19-0412",title:"카페테리아 A 커피머신 고쳐졌어요",body:"오늘 아침부터 정상 작동합니다. 시설관리과 최민혁 주임님 감사합니다!\n\n에스프레소 버튼은 아직 아메리카노가 나와요.",at:1,cm:2},
 {no:311,user:"A-19-0402",title:"[시설] 격리동 B 2층 화장실 공사 안내",body:"이번 주 금요일 오후 2시~6시 2층 남자 화장실 배관 공사가 있습니다.\n3층을 이용해 주세요.",at:2,cm:0},
 {no:310,user:"A-19-0620",title:"사내 탁구 동호회 신입 회원 모집",body:"매주 화·목 18:30 지하 1층 체력단련실.\n라켓은 빌려드립니다. 초보 환영!",at:4,cm:5},
 {no:309,user:"A-19-0517",title:"[전산] 단말 화면이 깜빡일 때",body:"상단 FX 버튼을 눌러 효과를 끄면 대부분 해결됩니다.\n그래도 계속되면 헬프데스크(4-1500)로 연락 주세요.",at:6,cm:1},
 {no:308,user:"R-19-1802",title:"주차 스티커 재발급 어디서 하나요?",body:"차를 바꿨는데 새 스티커를 어디서 받는지 모르겠네요.",at:9,cm:3},
];
const freePosts=()=>[...store.get("freeboard",[]),...FREE_SEED].sort((a,b)=>b.no-a.no);
function boardTabs(cur){ return `<div class="filters" role="group" aria-label="게시판"><a class="chip ${cur==="notice"?"on":""}" href="#board">공지사항</a><a class="chip ${cur==="free"?"on":""}" href="#board?tab=free">자유게시판</a></div>` }
function freeBoard(qs){
  const no=+qs.get("no");
  if(qs.get("write")) return `<h2 class="ph">자유<span>게시판</span></h2>${boardTabs("free")}
    <form class="aform" data-free><table class="ftab"><tr><th>작성자</th><td>${esc(S.user)}</td></tr>
    <tr><th><label for="fw-t">제목</label></th><td><input id="fw-t" name="title" maxlength="60" required autocomplete="off"></td></tr>
    <tr><th><label for="fw-b">내용</label></th><td><textarea id="fw-b" name="body" rows="8" required></textarea></td></tr></table>
    <p class="dim2" style="font-size:11px;margin-top:8px">격리 대상·보안 등급 정보는 자유게시판에 쓰지 마십시오.</p>
    <div class="factions"><a class="btn" href="#board?tab=free">취소</a><button class="btn primary" type="submit">등록</button></div></form>`;
  const L=freePosts();
  if(no){ const p=L.find(x=>x.no===no);
    if(!p) return `<a class="back" href="#board?tab=free">← 목록</a><div class="empty">삭제된 게시물입니다.</div>`;
    const mine=p.user===S.user && !FREE_SEED.includes(p);
    return `<a class="back" href="#board?tab=free">← 자유게시판</a><div class="post"><div class="ptitle">${esc(p.title)}</div>
    <div class="pmeta"><span>${esc(p.user)}</span><span>${typeof p.at==="number"&&p.at<1e6?daysAgo(p.at):fmtDate(p.at)}</span>${mine?`<button type="button" class="xref" data-freedel="${p.no}">삭제</button>`:""}</div>
    <div class="pbody">${linkRefs(esc(p.body),"")}</div></div>`; }
  return `<h2 class="ph">자유<span>게시판</span> · 전 직원</h2>${boardTabs("free")}
  <div class="bbar"><span class="dim2">전체 ${L.length}건</span><span class="sp"></span><a class="btn" href="#board?tab=free&write=1">글쓰기</a></div>
  <table class="board"><tr><th class="c">번호</th><th>제목</th><th>작성자</th><th class="c">등록일</th></tr>
  ${L.map(p=>`<tr class="row" data-href="#board?tab=free&no=${p.no}"><td class="c dim2">${p.no}</td><td>${rowLink(`#board?tab=free&no=${p.no}`,esc(p.title),"")}${p.cm?` <span class="amber cmn">[${p.cm}]</span>`:""}${p.user===S.user?` <span class="new" style="background:var(--cyan)">내 글</span>`:""}</td><td class="dim">${esc(p.user)}</td><td class="c dim">${(p.at<1e6?daysAgo(p.at):fmtDate(p.at)).slice(5,10)}</td></tr>`).join("")}</table>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-free]"); if(!f) return; e.preventDefault();
  const v=Object.fromEntries(new FormData(f)); if(!v.title.trim()||!v.body.trim()) return;
  const mine=store.get("freeboard",[]), no=Math.max(...freePosts().map(p=>p.no))+1;
  store.set("freeboard",[{no,user:S.user,title:v.title.trim(),body:v.body.trim(),at:Date.now(),cm:0},...mine]);
  feedPush(`자유게시판 글 등록 — ${S.user}`,""); toast("게시물이 등록되었습니다."); go("#board?tab=free&no="+no);
});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-freedel]"); if(!b) return; const no=+b.dataset.freedel;
  modal({title:"게시물 삭제",html:"<p>이 게시물을 삭제합니다. 되돌릴 수 없습니다.</p>",buttons:[{label:"취소",act:c=>c()},{label:"게시물 삭제",primary:true,act:c=>{
    store.set("freeboard",store.get("freeboard",[]).filter(p=>p.no!==no)); c(); toast("삭제되었습니다."); go("#board?tab=free") }}]});
});

/* ════ 단축키 ════ ? 도움말 · g 다음 글자로 이동 */
const GOKEYS={x:["#stats","문서 통계"],n:["#notes","메모 · 할 일"],e:["#edu","온라인 교육"],v:["#survey","사내 설문"],q:["#helpdesk","업무 요청"],g:["#rooms","회의실 예약"],t:["#attendance","근태 관리"],h:["#dashboard","홈"],d:["#database","격리 데이터베이스"],m:["#messages","메일"],b:["#board","게시판"],a:["#approval","전자결재"],c:["#calendar","일정"],o:["#org","조직도"],r:["#archive","자료실"],i:["#incidents","사건 기록"],s:["#settings","환경 설정"]};
function showKeys(){
  modal({title:"단축키",cls:"wide",html:`<table class="keys">
    <tr><td><kbd>/</kbd></td><td>커맨드라인으로 이동</td></tr>
    <tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>통합 검색</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>한 단계 위로 · 창 닫기</td></tr>
    <tr><td><kbd>?</kbd></td><td>이 도움말</td></tr>
    ${Object.entries(GOKEYS).map(([k,[,l]])=>`<tr><td><kbd>g</kbd> <kbd>${k}</kbd></td><td>${l}</td></tr>`).join("")}</table>`,
    buttons:[{label:"닫기",primary:true,act:c=>c()}]});
}
let gPending=0;
document.addEventListener("keydown",e=>{
  if(!S.booted || GW.modal || e.altKey || e.metaKey) return;
  if(e.ctrlKey && e.key.toLowerCase()==="k"){ e.preventDefault(); const g=$("#gq"); if(g&&g.offsetParent) g.focus(); else go("#search"); return }
  if(e.ctrlKey) return;
  const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName); if(typing) return;
  if(e.key==="?"){ e.preventDefault(); showKeys(); return }
  if(e.key==="g"){ gPending=Date.now(); return }
  if(gPending && Date.now()-gPending<1200 && GOKEYS[e.key]){ e.preventDefault(); go(GOKEYS[e.key][0]) }
  gPending=0;
});

function workspaceStart(){ notiBadge(); mailWatch(); }
