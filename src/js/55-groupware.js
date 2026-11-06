/* ════════════════════════════════════════════
   그룹웨어 — 실제 사내 인트라넷의 관례를 빌려온 껍데기
   공지 게시판 · 접속 팝업 · 보안 서약서 · 워터마크 · 복사 차단 · 세션 만료 경고 · 개인정보 마스킹
   ════════════════════════════════════════════ */

/* ─── 공통 UI: 토스트 · 모달 ─── */
function toast(text, cls=""){
  const box=$("#toasts"); if(!box) return;
  const el=document.createElement("div"); el.className="toast "+cls; el.setAttribute("role","status"); el.innerHTML=text;
  box.appendChild(el);
  setTimeout(()=>el.classList.add("out"),4200); setTimeout(()=>el.remove(),4700);
}
/* 모달 하나만 띄움. buttons: [{label, primary, act(close)}] · dismiss=false 면 Esc로 닫을 수 없음 */
const GW = { modal:null, idleMs:5*60*1000, lastAct:Date.now(), copyTries:0 };
function modal({title, html, buttons=[], dismiss=true, cls="", onOpen}){
  closeModal();
  const back=document.createElement("div"); back.className="mback";
  back.innerHTML=`<div class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="mtitle">
    <div class="mh" id="mtitle">${title}</div><div class="mb">${html}</div>
    <div class="mf">${buttons.map((b,i)=>`<button type="button" class="btn ${b.primary?"primary":""}" data-i="${i}">${b.label}</button>`).join("")}</div></div>`;
  document.body.appendChild(back);
  const prevFocus=document.activeElement;
  const close=()=>{ if(GW.modal!==m) return; back.remove(); document.removeEventListener("keydown",key,true); GW.modal=null; if(prevFocus&&prevFocus.focus) prevFocus.focus() };
  const key=e=>{
    if(e.key==="Escape"){ e.stopPropagation(); e.preventDefault(); if(dismiss) close() }
    if(e.key==="Tab"){ // 포커스를 모달 안에 가둠
      const f=[...back.querySelectorAll("button:not([disabled]),input,a[href]")]; if(!f.length) return;
      const i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus() }
      else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus() }
    }
  };
  document.addEventListener("keydown",key,true);
  back.querySelectorAll(".mf button").forEach(b=>b.addEventListener("click",()=>buttons[+b.dataset.i].act(close)));
  const m={back,close}; GW.modal=m;
  if(onOpen) onOpen(back,close);
  const first=back.querySelector("input,.mf button.primary,.mf button"); if(first) first.focus();
  return m;
}
function closeModal(){ if(GW.modal) GW.modal.close() }

/* ─── 보안 서약서 (처음 접속하는 식별번호만) ─── */
function pledge(){
  const items=[
    "본인은 SCiPNET에서 열람한 모든 정보를 재단 외부에 누설하지 않을 것을 서약합니다.",
    "본인은 열람 권한을 초과하는 정보에 접근할 경우 기억소거 조치에 동의합니다.",
    "본인은 이 서약서에 이전에 서명한 적이 없음을 기억합니다.",
  ];
  return new Promise(res=>{
    modal({title:"정보 보안 서약서 <span class='dim2'>· RAISA 양식 SEC-19-04</span>", dismiss:false, cls:"wide",
      html:`<p class="dim" style="margin-bottom:12px">SCiPNET 최초 접속 시 아래 서약에 모두 동의해야 합니다. 서약 내용은 귀하의 인사 파일에 영구 보관됩니다.</p>
        ${items.map((t,i)=>`<label class="chk"><input type="checkbox" data-pl="${i}"> <span>${i+1}. ${t}</span></label>`).join("")}
        <p class="dim2" style="margin-top:12px;font-size:11px">서명자: ${esc(S.user)} · ${now()} · 단말 NODE 0x3F1A</p>`,
      buttons:[{label:"서약하고 접속",primary:true,act:c=>{ c(); feedPush(`보안 서약서 서명 — ${S.user} (서명 이력 ${srnd(S.user+"pl",2,7)}건 발견)`,"amber"); res() }}],
      onOpen(back){
        const btn=back.querySelector(".mf button"); const boxes=[...back.querySelectorAll("[data-pl]")];
        const sync=()=>{ btn.disabled=!boxes.every(b=>b.checked) }; boxes.forEach(b=>b.addEventListener("change",sync)); sync();
      }});
  });
}

/* ─── 접속 시 팝업 공지 · 오늘 하루 보지 않기 ─── */
function popupNotice(){
  const key="popup_"+S.user, st=store.get(key,{hide:"",n:0});
  if(st.hide===today()) return;
  st.n=(st.n||0)+1; store.set(key,st);
  modal({title:"[필독] 11월 정기 기억소거 검진 일정 변경 안내", cls:"popup",
    html:`<div class="pop">
      <p>11월 정기 기억소거 검진 일정이 아래와 같이 변경되었습니다. 대상 인원은 반드시 확인 바랍니다.</p>
      <table><tr><th>구분</th><th>변경 전</th><th>변경 후</th></tr>
        <tr><td>Level 1~2</td><td class="dim2"><span class="redact">11월 12일</span></td><td>11월 ${srnd(today()+"m",13,20)}일 (해당일 기억 없음)</td></tr>
        <tr><td>Level 3 이상</td><td class="dim2">—</td><td>개별 통보</td></tr></table>
      <p class="dim" style="margin-top:10px">변경 전 일정으로 안내받은 인원은 변경 전 일정이 존재하지 않았음을 유념하십시오.</p>
      ${st.n>1?`<p class="amber" style="margin-top:10px;font-size:11px">본 공지는 귀하에게 ${st.n}번째로 표시됩니다. 이전에 확인하신 기억이 없다면 정상입니다.</p>`:""}
      <a class="xref" href="#board?no=1251">게시판에서 자세히 보기 →</a>
    </div>
    <label class="chk today"><input type="checkbox" id="pophide"> 오늘 하루 보지 않기</label>`,
    buttons:[{label:"닫기",primary:true,act:c=>{ if($("#pophide").checked){ st.hide=today(); store.set(key,st) } c() }}],
    onOpen(back,close){ back.querySelector(".xref").addEventListener("click",()=>{ if($("#pophide").checked){ st.hide=today(); store.set(key,st) } close() }) }
  });
}

/* ─── 화면 워터마크 (식별번호 + 접속 시각 반복) ─── */
function drawWatermark(){
  const wm=$("#wm"); if(!wm) return;
  const t=`${S.user} · ${now().slice(0,16)} · 열람 기록됨`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200"><text x="10" y="120" transform="rotate(-22 210 100)" font-family="monospace" font-size="13" fill="#c8d2d6">${esc(t)}</text></svg>`;
  wm.style.backgroundImage=`url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  const ph=$("#printhdr"); if(ph) ph.textContent=`대외비 — SCP 재단 SITE-19 · 출력자 ${S.user} · ${now()} · 무단 반출 시 B등급 기억소거 대상`;
}

/* ─── 복사 · 우클릭 차단 (입력란·출처 표기는 허용) ─── */
document.addEventListener("copy",e=>{
  if(!S.booted || e.target.closest && (e.target.closest("input,textarea,.attrib"))) return;
  const sel=String(window.getSelection()); if(!sel.trim()) return;
  e.preventDefault();
  e.clipboardData.setData("text/plain",`[SCiPNET DLP] 보안 정책에 의해 복사가 제한된 정보입니다. — ${S.user} ${now()}`);
  GW.copyTries++;
  toast(GW.copyTries>=3?"<b class='red'>반복된 반출 시도.</b> 관리자에게 통보되었습니다.":"보안 정책(DLP-19)에 의해 복사할 수 없습니다.<br><span class='dim2'>본 시도는 RAISA에 기록되었습니다.</span>", GW.copyTries>=3?"danger":"");
  feedPush(`정보 반출 시도 — ${S.user} (${sel.length}자)`, GW.copyTries>=3?"red":"amber");
});
document.addEventListener("contextmenu",e=>{
  if(!S.booted || !e.target.closest("#content") || e.target.closest("a,input,.attrib")) return;
  e.preventDefault(); toast("우클릭이 제한된 페이지입니다.");
});
window.addEventListener("beforeprint",()=>{ if(S.booted) feedPush(`문서 출력 — ${S.user} · 출력물 회수 대상`,"amber") });

/* ─── 세션 만료 경고 (유휴 5분 → 60초 카운트다운) ─── */
["mousemove","keydown","click","scroll","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ if(!GW.expiring) GW.lastAct=Date.now() },{capture:true,passive:true}));
function startIdleWatch(){
  GW.lastAct=Date.now(); GW.expiring=false;
  sessionLoop(()=>{ if(!GW.modal && !GW.expiring && Date.now()-GW.lastAct>GW.idleMs) expiryWarning() }, 1000);
}
function expiryWarning(){
  GW.expiring=true; let n=60, warped=false; const sid=S.sid;
  const m=modal({title:"세션 만료 예정", cls:"expire",
    html:`<p>보안 정책에 따라 <b class="hi" id="expn">60</b>초 후 자동으로 로그아웃됩니다.</p><p class="dim" style="margin-top:6px">계속 사용하시려면 [연장]을 누르십시오.</p>`,
    buttons:[
      {label:"로그아웃",act:c=>{ GW.expiring=false; c(); logout() }},
      {label:"연장",primary:true,act:c=>{ GW.expiring=false; GW.lastAct=Date.now(); c(); toast("세션이 60분 연장되었습니다.") }},
    ]});
  (function tick(){
    if(sid!==S.sid || GW.modal!==m || !GW.expiring) return;
    const el=$("#expn"); if(!el) return;
    if(!warped && n===srnd(S.user+today(),14,24) && hash(S.user+now().slice(0,13))%3===0){ // 가끔 시간이 거꾸로 감
      warped=true; n+=7; el.classList.add("red"); feedPush("세션 타이머 역행 감지 — 원인 불명","amber");
    }
    el.textContent=n;
    if(n<=0){ GW.expiring=false; m.close(); logout(); const lm=$("#loginmsg"); lm.textContent="보안 정책에 따라 자동 로그아웃되었습니다 (유휴 5분)."; lm.style.color="var(--amber)"; return }
    n--; setTimeout(tick,1000);
  })();
}

/* ─── 로그인 직후 그룹웨어 시작 ─── */
function groupwareStart(returning){
  GW.copyTries=0; drawWatermark(); startIdleWatch(); apprWatch(); apprBadge();
  sessionLoop(drawWatermark, 60000);
  sessionLater(popupNotice, 700);
  if(returning){
    const k="pwnote_"+S.user;
    if(store.get(k,"")!==today()){ store.set(k,today()); sessionLater(()=>toast(`인증 코드 변경 후 <b class="amber">${srnd(S.user,91,412)}일</b>이 경과했습니다.<br><span class="dim2">보안을 위해 90일마다 변경하십시오.</span>`),2400) }
  }
}

/* ════ 뷰: 공지사항 게시판 ════
   [번호, 말머리, 제목, 작성 부서, 며칠 전, 첨부, 본문, 댓글[[작성자, 내용]]] */
const BOARD=[
 [1251,"필독","11월 정기 기억소거 검진 일정 변경 안내","인사관리과",0,true,
  "11월 정기 기억소거 검진 일정이 변경되었습니다.\n\n· Level 1~2 인원: 11월 셋째 주 중 개별 지정일\n· Level 3 이상: 개별 통보\n\n검진 당일에는 금식할 필요가 없습니다. 검진 다음 날 금식했는지 기억하지 못하는 것은 정상입니다.\n\n변경 전 일정으로 안내받은 인원은 변경 전 일정이 존재하지 않았음을 유념하십시오.\n\n문의: 인사관리과 내선 4-1100",
  []],
 [1250,"보안","SCiPNET 화면 워터마크 및 복사 제한 정책 시행","RAISA",1,false,
  "금일부로 모든 SCiPNET 단말 화면에 열람자 식별번호와 접속 시각이 워터마크로 표시됩니다.\n\n· 화면 촬영, 복사, 출력 시 워터마크로 열람자를 추적합니다.\n· 문서 본문 복사는 차단되며, 시도 내역은 RAISA에 기록됩니다.\n· 출력물은 사용 후 24시간 이내 파쇄하십시오.\n\n워터마크에 본인 것이 아닌 식별번호가 보이는 경우, 화면에서 눈을 떼지 말고 보안팀(내선 4-0119)에 연락하십시오.",
  [["문세아 (A-19-0051)","확인했습니다. 격리동 B 단말 전수 점검하겠습니다."],["R-19-1177","워터마크에 제 번호랑 다른 번호가 같이 보이는데 이것도 정상인가요?"],["RAISA","<span class='redact'>정상입니다. 해당 번호는 귀하의 이전 식별번호입니다.</span>"]]],
 [1249,"","지하 2층 주차장 도색 작업에 따른 주차 제한","시설관리과",2,false,
  "지하 2층 주차장 바닥 도색 작업으로 11월 둘째 주 동안 B2 구역 주차가 제한됩니다.\n\n작업 중 바닥에서 검은 얼룩이 번지는 것이 보이면 도색이 아니므로 즉시 위층으로 이동하십시오. 해당 구역은 구역 7 바로 위에 있습니다.",
  [["한지호 (R-19-0893)","106 점검 때 B2 바닥 쪽도 같이 봐야겠네요."]]],
 [1248,"","2026년 하반기 소방·대피 훈련 실시 (격리동 B)","안전관리과",3,true,
  "하반기 소방·대피 훈련을 아래와 같이 실시합니다.\n\n· 일시: 이번 주 중 예고 없음\n· 대상: 격리동 B 전 인원\n\n훈련 경보는 실제 경보와 구분되지 않습니다. 훈련 경보가 울리면 실제 상황으로 간주하십시오.\n실제 경보가 울리면 훈련으로 간주하지 마십시오.\n\n대피 경로에서 복도 B-4는 제외되었습니다.",
  []],
 [1247,"","복도 B-4 계단 관련 문의는 받지 않습니다","시설관리과",4,false,
  "복도 B-4 계단 관련 문의가 계속 접수되고 있습니다.\n\n해당 위치에 계단은 없습니다. 도면에도 없고, 시공 기록에도 없습니다.\n\n계단을 내려간 기억이 있는 인원은 문의하지 말고 의무실로 가십시오.",
  [["(탈퇴한 사용자)","몇 층까지 내려가 보셨어요?"],["(탈퇴한 사용자)","저는 열네 층이요"],["(탈퇴한 사용자)","올라오는 계단은 없던데"]]],
 [1246,"","카페테리아 C 구역 운영 재개 안내","복리후생팀",5,false,
  "SCP-999 노출로 정리 중이던 카페테리아 C 구역이 운영을 재개합니다.\n\n식사 중 이유 없이 기분이 좋아지는 것은 정상입니다. 기분이 지나치게 좋아져 격리실로 돌아가고 싶지 않다면 복리후생팀에 상담을 신청하십시오.",
  [["서하윤 (R-19-0412)","999 오늘 진짜 기분 좋아 보였어요 ㅎㅎ"]]],
 [1245,"필독","연말정산 간소화 자료 제출 안내 (사망 처리 인원 포함)","재무과",6,true,
  "2026년 귀속 연말정산 자료를 기한 내 제출하십시오.\n\n· 동일 연도 내 사망 처리 후 복귀한 인원은 중복 공제를 받을 수 없습니다.\n· D계급 인원은 월말 계약 종료로 대상에서 제외됩니다.\n\nD-9341 인원은 개별 안내를 확인하십시오. (3건)",
  []],
 [1244,"","사내 동호회 '격리실 밖 산책회' 회원 모집","서하윤",8,false,
  "점심시간에 지상 정원을 같이 걸으실 분 모집합니다!\n\n· 매주 수요일 12:30, 지상 출입구 앞\n· 준비물: 사원증, 햇빛\n\n격리동에만 있으면 하늘 색깔 잊어버려요. 편하게 오세요.",
  [["정우진 (R-19-1177)","저요"],["한지호 (R-19-0893)","다음 주 106 점검 끝나면 갈게요"],["이성민 (R-19-2204)","<span class='dim2'>[이 댓글은 작성자의 인사 기록이 정리되어 표시할 수 없습니다]</span>"]]],
 [1243,"","분실물 습득 — 사원증 (R-19-2204)","보안팀",10,false,
  "아래 사원증을 습득하여 보안팀에서 보관 중입니다.\n\n· 식별번호: R-19-2204\n· 습득 장소: 외부 조달 차량 화물칸, 대형 가구 매장 쇼핑백 안\n· 특이사항: 사원증 뒷면에 '출구 없음'이라고 적혀 있음\n\n본인은 보안팀으로 수령하러 오십시오.",
  [["보안팀","수령 기한이 지났습니다. 사원증은 SCP-3008 관련 증거물로 이관합니다."]]],
 [1242,"보안","인증 코드 변경 주기(90일) 준수 안내","RAISA",12,false,
  "SCiPNET 인증 코드는 90일마다 변경해야 합니다.\n\n· 이전 3회 이내 사용한 코드는 재사용할 수 없습니다.\n· 코드를 기억하지 못하는 경우 기억소거 이력을 먼저 확인하십시오.\n· 재정의(override) 코드를 메모해 두지 마십시오. 특히 05로 시작하는 코드는 더욱 그렇습니다.",
  []],
 [1241,"","SCP-173 격리실 청소 당번표 (11월)","격리동 B 관리",14,true,
  "SCP-173 격리실 청소는 반드시 3인 1조로 진행합니다.\n\n· 1주차: D-1120 · D-4471 · D-9341\n· 2주차: D-2087 · D-5530 · D-9341\n· 3주차: D-3318 · D-7702 · D-9341\n· 4주차: (배정 대기) · (배정 대기) · D-9341\n\n깜빡이기 전에 반드시 \"깜빡임\"이라고 외치십시오. 당번표가 매주 바뀌는 이유는 묻지 마십시오.",
  [["D-9341","왜 저만 매주"]]],
];
const BOARD_TAG={ "필독":"red", "보안":"amber" };
function boardViews(no){ return no===1247?0:srnd("v"+no,38,612)+(store.get("bread_"+S.user,[]).includes(no)?1:0) }
function board(qs){
  const no=+(qs&&qs.get("no"));
  if(no) return boardPost(no);
  return `<h2 class="ph">공지사항 <span>게시판</span> · 전 직원</h2>
  <div class="bbar"><span class="dim2">전체 ${BOARD.length+1239}건 · 1 / 104 페이지</span><span class="sp"></span><button type="button" class="btn" data-gw="write">글쓰기</button></div>
  <table class="board"><tr><th class="c">번호</th><th>제목</th><th>작성자</th><th class="c">등록일</th><th class="c">조회</th></tr>
  ${BOARD.map(([n,tag,t,who,ago,att,,cm])=>`<tr class="row" data-href="#board?no=${n}"><td class="c dim2">${tag==="필독"?`<span class="red">공지</span>`:n}</td>
    <td>${tag?`<span class="tag ${BOARD_TAG[tag]}">[${tag}]</span> `:""}${rowLink("#board?no="+n,esc(t),"")}${cm.length?` <span class="amber cmn">[${cm.length}]</span>`:""}${att?` <span class="att" title="첨부파일">📎</span>`:""}${ago<2?` <span class="new">N</span>`:""}</td>
    <td class="dim">${esc(who)}</td><td class="c dim">${daysAgo(ago).slice(5)}</td><td class="c dim2">${boardViews(n)}</td></tr>`).join("")}
  <tr class="del"><td class="c dim2">1240</td><td class="dim2">삭제된 게시물입니다.</td><td class="dim2">—</td><td class="c dim2">${daysAgo(15).slice(5)}</td><td class="c dim2">—</td></tr>
  </table>
  <div class="pager"><b>1</b>${[2,3,4,5].map(p=>`<button type="button" data-gw="page">${p}</button>`).join("")}<button type="button" data-gw="page">다음 ›</button></div>`;
}
function boardPost(no){
  const p=BOARD.find(b=>b[0]===no);
  if(!p) return `<a class="back" href="#board">← 목록</a><div class="empty">존재하지 않거나 삭제된 게시물입니다.</div>`;
  const [n,tag,t,who,ago,att,body,cm]=p;
  const read=store.get("bread_"+S.user,[]); if(!read.includes(n)) store.set("bread_"+S.user,[...read,n]);
  return `<a class="back" href="#board">← 목록</a>
  <div class="post">
    <div class="ptitle">${tag?`<span class="tag ${BOARD_TAG[tag]}">[${tag}]</span> `:""}${esc(t)}</div>
    <div class="pmeta"><span>${esc(who)}</span><span>${daysAgo(ago)} ${pad(srnd("h"+n,8,18))}:${pad(srnd("m"+n,0,59))}</span><span>조회 ${boardViews(n)}${n===1247?" <span class='dim2'>(조회수가 증가하지 않습니다)</span>":""}</span></div>
    ${att?`<div class="patt">첨부 <button type="button" class="xref" data-gw="att">${esc(t.replace(/[^0-9A-Za-z가-힣]+/g,"_").replace(/_+$/,"").slice(0,24))}_최종.hwp</button> <span class="dim2">(${srnd("a"+n,48,920)}KB)</span></div>`:""}
    <div class="pbody">${linkRefs(esc(body),"")}</div>
    <div class="cmts"><div class="ch">댓글 ${cm.length}</div>
      ${cm.map(([a,c])=>`<div class="cm"><b>${esc(a)}</b><span class="dim2">${daysAgo(Math.max(0,ago-1)).slice(5)}</span><div>${c}</div></div>`).join("")||`<div class="dim2 cm">등록된 댓글이 없습니다.</div>`}
      <form class="cform" data-gw="cmt"><label for="cin" class="sr">댓글 입력</label><input id="cin" placeholder="댓글을 입력하십시오. 모든 댓글은 RAISA 검열 후 게시됩니다." autocomplete="off"><button class="btn" type="submit">등록</button></form>
    </div>
  </div>`;
}
/* 게시판 버튼들 (위임) */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-gw]"); if(!b || b.tagName==="FORM") return;
  const k=b.dataset.gw;
  if(k==="att") toast("보안 정책에 따라 첨부파일은 지정된 보안 USB에서만 열람할 수 있습니다.");
  if(k==="page") toast("이전 게시물은 보존 기한이 지나 보관함으로 이관되었습니다. <span class='dim2'>(Level 3)</span>");
  if(k==="write") toast("게시판 쓰기 권한이 없습니다. 소속 부서장에게 승인을 요청하십시오.");
  if(k==="ext") revealExt(b);
});
document.addEventListener("submit",e=>{
  const f=e.target.closest("[data-gw=cmt]"); if(!f) return; e.preventDefault();
  const v=f.querySelector("input").value.trim(); if(!v) return;
  f.querySelector("input").value="";
  const el=document.createElement("div"); el.className="cm"; el.innerHTML=`<b>${esc(S.user)}</b><span class="amber">검열 대기</span><div>${esc(v)}</div>`;
  f.before(el); feedPush(`게시판 댓글 검열 요청 — ${S.user}`,"");
  sessionLater(()=>{ el.querySelector("span").className="red"; el.querySelector("span").textContent="검열됨"; el.querySelector("div").innerHTML=blackBars(Math.min(8,1+Math.ceil(v.length/6))) },2600);
});

/* ─── 개인정보 마스킹: 내선번호는 열람 사유를 적어야 보임 ─── */
function maskedExt(id){ return `<button type="button" class="mask" data-gw="ext" data-id="${esc(id)}" title="열람 사유 입력 후 표시">4-${srnd(id+"e",1,9)}**</button>` }
function revealExt(btn){
  const id=btn.dataset.id;
  modal({title:"개인정보 열람 사유", html:`<p class="dim" style="margin-bottom:10px">${esc(id)} 의 연락처를 열람합니다. 열람 사유는 개인정보 접근 기록에 보관됩니다.</p>
    <div class="field"><label for="why">열람 사유</label><input id="why" placeholder="예: 업무 협조 요청" autocomplete="off"></div>`,
    buttons:[{label:"취소",act:c=>c()},{label:"열람",primary:true,act:c=>{
      const why=$("#why").value.trim(); if(!why){ $("#why").focus(); return }
      c(); btn.outerHTML=`<span class="hi">4-${srnd(id+"e",1,9)}${pad(srnd(id+"x",0,99))}</span>`;
      feedPush(`개인정보 열람 — ${id} · 사유: ${why.slice(0,20)}`,"");
      if(/R-19-0666|R-19-2204/.test(id)) sessionLater(()=>toast("해당 내선은 결번입니다. <span class='dim2'>마지막 통화: 오늘</span>","danger"),900);
    }}]});
}

/* ─── 대시보드 사내 위젯: 식단 · 일정 · 생일 · 설문 ─── */
function gwWidgets(){
  const day=today();
  const MENU=[["백미밥","미역국","제육볶음","정체불명 단백질 (정체 명확)"],["잡곡밥","된장찌개","고등어구이","SCP-999 젤리 (무해)"],["카레라이스","단무지","샐러드","D계급 배식 동일"],["비빔밥","콩나물국","김치","오늘의 디저트 [편집됨]"]];
  const vote=store.get("vote_"+day,null);
  return `<div class="widgets">
    <div class="card w"><div class="k">오늘의 식단 · 카페테리아 A</div>${spick(day+"menu",MENU).map(x=>`<div>${x}</div>`).join("")}</div>
    <div class="card w"><div class="k"><a href="#calendar" class="rowlink">다가오는 일정 ›</a></div>
      ${upcoming(4).map(e=>{const d=new Date(e.date+"T00:00");return `<div><span class="dim2">${e.date===today()?"오늘":["일","월","화","수","목","금","토"][d.getDay()]+" "+(d.getMonth()+1)+"/"+d.getDate()}</span> ${esc(e.t)}</div>`}).join("")}</div>
    <div class="card w"><div class="k">오늘의 생일</div><div>D-9341 <span class="dim2">— ${srnd(day+"bd",3,5)}번째 생일 (올해)</span></div><div>${spick(day+"bd2",["서하윤 (R-19-0412)","문세아 (A-19-0051)","정우진 (R-19-1177)"])}</div><div class="dim2" style="margin-top:6px;font-size:11px">축하 메시지는 검열 후 전달됩니다.</div></div>
    <div class="card w"><div class="k">사내 설문</div><div>SCP-999 면회 시간 연장에 찬성하십니까?</div>
      ${vote?`<div class="dim" style="margin-top:6px">찬성 100% · 반대 0%<br><span class="dim2" style="font-size:11px">귀하는 찬성하셨습니다.${vote==="no"?" (반대 의견은 집계되지 않았습니다)":""}</span></div>`
        :`<div style="margin-top:8px;display:flex;gap:8px"><button type="button" class="btn" onclick="store.set('vote_'+today(),'yes');route()">찬성</button><button type="button" class="btn" onclick="store.set('vote_'+today(),'no');route()">반대</button></div>`}</div>
  </div>`;
}
