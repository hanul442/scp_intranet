/* ════════════════════════════════════════════
   데이터 — scpko.wikidot.com, CC BY-SA 3.0
   (build.py 가 normalize.py 로 등급·잔여물을 정리한 뒤 인라인)
   ════════════════════════════════════════════ */
const SCP = /*__SCP_DATA__*/;

/* 등급 → 배지 색 / 요구 보안 등급 (등급 문자열은 normalize.py 가 표준화) */
function classKey(c){
  switch(c){
    case "케테르": return "keter";
    case "유클리드": return "euclid";
    case "안전": return "safe";
    case "아폴리온": case "타우미엘": return "apollyon";
    case "무효": case "해명": return "neutral";
    default: return "unknown";
  }
}
function reqLevel(c){
  switch(c){
    case "안전": case "무효": case "해명": return 1;
    case "유클리드": case "대기": return 2;
    case "케테르": return 3;
    default: return 4; // 아폴리온·타우미엘·[데이터 말소]·미상 — 가장 높게
  }
}
/* 문서 ID: SCP-173, SCP-001-KO 등 */
function normId(num, suffix){ return "SCP-"+String(num).padStart(3,"0")+(suffix?"-"+suffix.replace(/^-/,"").toUpperCase():"") }
function idNum(id){ const m=id.match(/^SCP-(\d+)(?:-([A-Z]+))?/); return m?[+m[1],m[2]||""]:[1e9,""] }
function byId(a,b){ const [x,xs]=idNum(a),[y,ys]=idNum(b); return x-y || xs.localeCompare(ys) }
/* 표시용 이름: 시리즈 목록의 별칭 → 없으면 제목에서 번호를 뗀 것 */
function docName(d){ const t=(d.nickname||(d.title||"").replace(/^SCP-[\w-]+\s*[-–—:]?\s*/,"")).trim(); return t&&t!==d.id?t:"" }
const CLASS_FILTERS = [["all","전체"],["safe","안전"],["euclid","유클리드"],["keter","케테르"],["apollyon","아폴리온·타우미엘"],["other","기타"],["fav","★ 즐겨찾기"]];

/* ════ 상태 ════ */
const S = { user:"", level:2, view:"dashboard", doc:null, denied:0, booted:false, sid:0,
            recent:[], readMsgs:[], timers:[], listeners:[] };
const LVL_NAME = {1:"Level 1 — 비밀",2:"Level 2 — 제한",3:"Level 3 — 기밀",4:"Level 4 — 극비",5:"Level 5 — 타우미엘"};
const $ = s=>document.querySelector(s);
const esc = s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rnd = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick = a=>a[rnd(0,a.length-1)];
const pad=n=>String(n).padStart(2,"0");
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
/* 같은 키 → 항상 같은 값 (새로고침해도 기록이 바뀌지 않도록) */
const srnd = (key,a,b)=>a+hash(key)%(b-a+1);
const spick = (key,a)=>a[hash(key)%a.length];
const today = ()=>now().slice(0,10);
function now(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}
function hms(){const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}
function daysAgo(n){const d=new Date(Date.now()-n*86400000);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}

/* ════ 저장소 (localStorage — 실패해도 동작) ════ */
const store = {
  get(k,def){ try{ const v=localStorage.getItem("scipnet_"+k); return v==null?def:JSON.parse(v) }catch(_){ return def } },
  set(k,v){ try{ localStorage.setItem("scipnet_"+k,JSON.stringify(v)) }catch(_){} },
};
/* 사용자별 세션 기록: 권한 상향, 위반 횟수, 최근 열람, 읽은 메시지 */
function saveSession(){
  if(!S.user) return;
  const all=store.get("sessions",{});
  all[S.user]={level:S.level, denied:S.denied, recent:S.recent.slice(0,8), readMsgs:S.readMsgs, seen:Date.now()};
  store.set("sessions",all);
  if(S.booted) updateUnread();
}
function loadSession(user){ return store.get("sessions",{})[user]||null }
function noteRecent(id){ S.recent=[id,...S.recent.filter(x=>x!==id)].slice(0,8); saveSession() }

/* ════ 효과 설정: 모션 줄이기 설정을 기본값으로 따름 ════ */
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const FX = { on: store.get("fx", !reduceMotion) };
function applyFx(){
  document.body.classList.toggle("flicker",FX.on);
  document.body.classList.toggle("nofx",!FX.on);
  const b=$("#fxbtn"); if(b){ b.textContent=FX.on?"FX ON":"FX OFF"; b.classList.toggle("on",FX.on); b.setAttribute("aria-pressed",FX.on) }
}
function toggleFx(){ FX.on=!FX.on; store.set("fx",FX.on); applyFx() }
