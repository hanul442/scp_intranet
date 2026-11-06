/* ════ 부트 ════ */
const BOOT = [
"SCiPNET SECURE TERMINAL  //  BIOS 2.3.9  //  SITE-19 NODE 0x3F1A",
"메모리 점검 ........................ 65536K OK",
"격리 네트워크 핸드셰이크 ........... OK",
"RAISA 감사 모듈 로드 ............... OK",
"기억소거제 디스펜서 연결 ........... 대기",
"스크랜턴 현실 고정 장치 상태 ....... 정상 (휴즈 지수 1.00)",
"",
"경고: 구역 7 격리실 센서 응답 지연 (412ms)",
"경고: 마지막 세션이 정상 종료되지 않았습니다",
"",
"사용자 인증 모듈 시작 중 ..."
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){
  const el=$("#bootlog"); let out=""; let skip=false;
  // 아무 키나 클릭으로 건너뛰기. 재방문이면 두 배 빠르게
  const sk=()=>{skip=true}; document.addEventListener("keydown",sk); document.addEventListener("click",sk);
  const fast=store.get("booted",false)?0.5:1;
  for(const line of BOOT){
    if(skip) break;
    if(line===""){out+="\n";el.textContent=out;await sleep(160*fast);continue}
    for(const ch of line){ if(skip) break; out+=ch;el.textContent=out+"█";await sleep((line.startsWith("경고")?9:5)*fast)}
    out+="\n";el.textContent=out;await sleep((line.startsWith("경고")?420:110)*fast);
  }
  document.removeEventListener("keydown",sk); document.removeEventListener("click",sk);
  if(skip) el.textContent=BOOT.join("\n");
  store.set("booted",true);
  await sleep(skip?150:500); glitch(1); await sleep(skip?100:400);
  show("login"); ($("#u").value?$("#p"):$("#u")).focus();
}
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$("#"+id).classList.add("active")}

/* ════ 로그인 ════ */
$("#loginform").addEventListener("submit",async e=>{
  e.preventDefault();
  const u=$("#u").value.trim(), p=$("#p").value, msg=$("#loginmsg");
  if(!u||!p){msg.style.color="var(--red2)";msg.textContent="식별번호와 인증 코드를 모두 입력하십시오.";return}
  msg.style.color="var(--fg2)"; msg.textContent="RAISA 인증 서버 조회 중";
  for(let i=0;i<3;i++){await sleep(380);msg.textContent+=" ."}
  const lu=u.toLowerCase();
  if(/^o5/.test(lu)){ await sleep(500); glitch(2); msg.style.color="var(--red2)"; msg.textContent="O5 자격 증명은 이 단말에서 사용할 수 없습니다. 이 시도는 기록되었습니다."; $("#p").value=""; return }
  S.user=u.toUpperCase();
  const base = /^d-?\d/.test(lu)?1 : /^(dr|md|r4|l4)/.test(lu)?3 : 2;
  const prev = loadSession(S.user);
  S.level = prev ? Math.max(base, prev.level||base) : base;
  S.denied = prev ? prev.denied||0 : 0;
  S.recent = prev ? prev.recent||[] : [];
  S.readMsgs = prev ? prev.readMsgs||[] : [];
  store.set("user",S.user);
  msg.style.color="var(--green)";
  msg.textContent = prev ? `인증 완료. 이전 세션 기록을 복원합니다 (위반 ${S.denied}회)` : "인증 완료. 세션을 여는 중";
  await sleep(prev?900:600);
  if(!prev){ msg.textContent="최초 접속 — 보안 서약서 확인이 필요합니다"; await pledge() }
  enter(!!prev);
});

function enter(returning){
  show("main"); $("#emb").innerHTML=EMBLEM; S.booted=true; S.sid++;
  $("#who").textContent=S.user;
  $("#lvl").textContent=LVL_NAME[S.level];
  $("#sess").textContent="세션 "+hash(S.user+Date.now()).toString(16).toUpperCase().slice(0,8);
  $("#feed").innerHTML="";
  saveSession();
  route(); startFeed(returning); startClock(); scheduleGlitch(); scheduleAlert();
  updateUnread(); groupwareStart(returning);
}

/* 로그아웃: 세션 반복 작업(피드·시계·글리치·경보)은 S.sid 가 바뀌면 스스로 멈춤 */
function logout(){
  saveSession();
  S.sid++; S.booted=false; clearEffects(); closeModal(); GW.expiring=false;
  $("#topalert").classList.remove("on");
  history.replaceState(null,"",location.pathname+location.search);
  show("login"); $("#p").value="";
  const m=$("#loginmsg"); m.textContent="세션이 종료되었습니다. 기억소거 절차는 생략되었습니다."; m.style.color="var(--fg2)";
  $("#p").focus();
}
/* 세션 동안만 반복. 로그아웃(또는 재로그인)하면 이전 루프는 종료 */
function sessionLoop(fn, delay){
  const sid=S.sid;
  (function tick(){ if(sid!==S.sid) return; fn(); setTimeout(tick, typeof delay==="function"?delay():delay) })();
}
function sessionLater(fn, ms){ const sid=S.sid; setTimeout(()=>{ if(sid===S.sid) fn() }, ms) }

/* ════ 라우팅 ════
   #dashboard · #database · #scp-173 · #scp-173/2 (부록) · #incidents ... */
const VIEWS = {dashboard, database, incidents, personnel, messages, o5, board, approval, calendar, archive, org, search, settings, history:histView, attendance, rooms};
window.addEventListener("hashchange",route);
function route(){
  if(!S.booted) return;
  const h=decodeURIComponent((location.hash||"#dashboard").slice(1));
  const m=h.match(/^scp-(\d{1,4})(-[a-z]+)?(?:\/(\d+))?$/i);
  if(m){
    const id=normId(m[1],m[2]);
    setNav("database");
    if(!SCP[id]) return deadRef(id);
    if(!hasBody(id)){
      const at=location.hash;
      render(`<div class="doc"><div class="hdr"><h1>${id}</h1></div><div class="sec"><div class="body dim">문서 기록을 불러오는 중…</div></div></div>`);
      loadBody(id).then(()=>{ if(location.hash===at) route() },
        ()=>{ if(location.hash===at) render(`<a class="back" href="#database">← 데이터베이스</a><div class="doc"><div class="hdr"><h1>${id}</h1></div><div class="denied"><b>전송 실패</b>문서 기록 서버에 연결할 수 없습니다. 잠시 후 다시 시도하십시오.</div></div>`) });
      return;
    }
    if(m[3]!=null) return showSub(id, +m[3]);
    return showDoc(id);
  }
  let [v,qs]=h.split("?");
  if(!VIEWS[v]) v="dashboard";
  S.view=v; S.doc=null; setNav(v);
  render(viewCrumb(v)+VIEWS[v](new URLSearchParams(qs||"")));
  if(v==="database") bindDatabase();
}
function setNav(v){ document.querySelectorAll(".nav a,.gnb a").forEach(a=>{ const on=a.dataset.v===v; a.classList.toggle("on",on); on?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current") }) }
function go(hash){ if(location.hash===hash) route(); else location.hash=hash }
function openDoc(id){ go("#"+id.toLowerCase()) }
function openSub(id, idx){ go("#"+id.toLowerCase()+"/"+idx) }
/* 페이지 위치 표시 (홈 › 메뉴 › 화면) */
const VIEW_META={dashboard:["홈","운영 현황"],database:["격리 업무","격리 데이터베이스"],incidents:["격리 업무","사건 기록"],personnel:["격리 업무","인사 파일"],
  messages:["커뮤니케이션","메일"],board:["커뮤니케이션","게시판"],approval:["업무","전자결재"],calendar:["업무","일정 관리"],archive:["업무","자료실"],
  org:["커뮤니케이션","조직도"],search:["홈","통합 검색"],settings:["개인","환경 설정"],o5:["제한","O5 평의회 기록"],history:["격리 업무","열람 이력"],attendance:["업무","근태 관리"],rooms:["업무","회의실 예약"]};
function viewCrumb(v){ const m=VIEW_META[v]; if(!m||v==="dashboard") return ""; return `<nav class="crumb pcrumb" aria-label="경로"><a href="#dashboard">홈</a><span aria-hidden="true">›</span>${m[0]}<span aria-hidden="true">›</span><b class="hi" style="font-weight:500">${m[1]}</b></nav>` }
const PFOOT=`<footer class="pfoot"><span>© SCP 재단 · 제19기지 정보통신팀</span><span>헬프데스크 4-1500</span><span>보안 상황실 4-0119</span><a href="#archive">이용 안내</a><span class="dim2">본 시스템은 인가된 인원만 사용할 수 있으며 모든 접속은 기록됩니다.</span></footer>`;
function render(html){clearEffects();const c=$("#content");c.innerHTML=html+PFOOT;c.scrollTop=0}
function later(fn,ms){const t=setTimeout(fn,ms);S.timers.push(t);return t}
function every(fn,ms){const t=setInterval(fn,ms);S.timers.push(t);return t}
function listen(ev,fn,capture=false){document.addEventListener(ev,fn,capture);S.listeners.push([ev,fn,capture])}
function clearEffects(){S.timers.forEach(t=>{clearTimeout(t);clearInterval(t)});S.timers=[];S.listeners.forEach(([e,f,c])=>document.removeEventListener(e,f,c));S.listeners=[];$("#eyes").classList.remove("on")}
