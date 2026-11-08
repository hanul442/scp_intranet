/* ════════════════════════════════════════════
   항밈 문서 연출 — '항밈적'·'항밈학과' 태그가 붙은 문서 전부
   · 읽고 지나간 문단이 흐려지며 기억에서 지워짐 (누르면 다시 떠올림)
   · 읽는 도중 단어가 한 글자씩 증발
   · 검열 칸이 잠깐 다른 말로 바뀜
   · 문서 번호를 잊음 · '귀하는 잊었습니다' 기록 안내
   · 기억보강제 투여 버튼: 3분 동안 연출을 멈추고 지워진 내용을 되돌림
   SCP-055 는 40-effects.js 의 전용 연출을 씀
   ════════════════════════════════════════════ */
const AM_TAGS=new Set(["항밈적","항밈학과","항밈"]);
const AM_OWN=new Set(["SCP-055"]);
const isAntimeme=d=>!!d && (d.tags||[]).some(t=>AM_TAGS.has(t));
const AM_GAP=[
  "귀하는 이 문단을 읽었습니다. 무엇이었는지 기억하십니까?",
  "이 자리에 있던 내용은 귀하의 기억에서 제거되었습니다.",
  "내용 없음 — 처음부터 비어 있었을 수도 있습니다.",
  "여기에 무언가 적혀 있었습니다. 귀하는 방금 그것을 읽었습니다.",
  "이 문단은 열람 직후 망각되도록 처리되어 있습니다.",
  "귀하는 이 부분을 이미 세 번 읽었습니다.",
];
const AM_DM=["[기억 불가]","[항밈 처리됨]","[귀하는 이것을 알고 있었습니다]","[인지 불가 정보]","[잊으십시오]"];
const AM_GLYPH="▒░▓█·_ ";
const AM={key:null,until:0,gone:0,words:0,t0:0};

function amBanner(id){
  const v=hash(id)%3;
  const head=["항밈 성질 문서","인지 위해 — 항밈","반밈과 관리 문서"][v];
  return `<div class="notice am-ban" role="status"><b class="red">${head}</b> · 본 문서의 일부 정보는 열람 직후 망각됩니다. 귀하는 현재 <b>기억보강제 미투여</b> 상태입니다.
  <span class="am-dose"><button type="button" class="xref" data-amdose>기억보강제 투여 (Class-W)</button> <span class="dim2" id="amleft"></span></span></div>`;
}
/* 화면에 보이는 정도 (#content 기준) */
function amVis(el){ const c=$("#content").getBoundingClientRect(), r=el.getBoundingClientRect(); return {above:r.bottom<c.top+8, shown:r.bottom>c.top+30&&r.top<c.bottom-30} }
const amDosed=()=>Date.now()<AM.until;

/* 문단 망각 */
function amForget(el){
  if(el.dataset.amGone) return; el.dataset.amGone="1"; AM.gone++;
  if(!el._amHtml) el._amHtml=el.innerHTML;
  const msg=AM_GAP[(hash(AM.key)+AM.gone)%AM_GAP.length];
  el.classList.add("am-fading");
  later(()=>{ if(!el.isConnected) return;
    el.innerHTML=`<span class="am-gap" role="button" tabindex="0" title="눌러서 다시 떠올리기">[${msg}]</span>`;
    el.classList.remove("am-fading"); el.classList.add("am-gone");
    if(AM.gone===3) amNotice() },FX.on?1600:0);
}
function amRecall(el){
  if(!el._amHtml) return; el.innerHTML=el._amHtml; delete el.dataset.amGone; el.dataset.amBack="1";
  el.classList.remove("am-gone","am-fading"); el.classList.add("am-recall"); setTimeout(()=>el.classList.remove("am-recall"),1400);
}
/* 단어 한 개가 한 글자씩 증발 */
function amEvaporate(bodies){
  const nodes=[];
  for(const b of bodies){ if(!amVis(b).shown) continue;
    const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest("a,.dm,.redact,.am-gap,.am-word,h5,dt,b.who")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let n; while(n=w.nextNode()){ const p=n.parentElement.closest("p,li,dd,.say,.callout"); if(p && !p.dataset.amGone && amVis(p).shown && /[가-힣A-Za-z0-9]{2,}/.test(n.nodeValue)) nodes.push(n) } }
  if(!nodes.length) return;
  const n=pick(nodes), words=[...n.nodeValue.matchAll(/[가-힣A-Za-z0-9\-]{2,8}/g)]; if(!words.length) return;
  const m=pick(words), before=n.nodeValue.slice(0,m.index), after=n.nodeValue.slice(m.index+m[0].length);
  const sp=document.createElement("span"); sp.className="am-word"; sp.title="기억나지 않는 단어";
  sp.innerHTML=[...m[0]].map(ch=>`<i>${esc(ch)}</i>`).join("");
  const par=n.parentNode; par.insertBefore(document.createTextNode(before),n); par.insertBefore(sp,n); par.insertBefore(document.createTextNode(after),n); par.removeChild(n);
  AM.words++;
  [...sp.children].forEach((c,k)=>later(()=>c.classList.add("off"),FX.on?400+k*260:0));
  later(()=>{ sp.dataset.w=m[0]; sp.textContent="＿".repeat(Math.max(2,Math.ceil(m[0].length*0.8))); sp.classList.add("blank") },FX.on?600+m[0].length*260+500:0);
}
/* 검열 칸이 잠깐 다른 말로 */
function amDm(){
  const L=Array.from(document.querySelectorAll("#content .doc .body .dm")).filter(e=>amVis(e).shown && !e.dataset.amDm); if(!L.length) return;
  const e=pick(L), orig=e.textContent; e.dataset.amDm="1"; let k=0;
  const t=setInterval(()=>{ e.textContent=[...orig].map(()=>AM_GLYPH[rnd(0,AM_GLYPH.length-1)]).join(""); if(++k>6){ clearInterval(t); e.textContent=pick(AM_DM); e.classList.add("am-dmx");
    setTimeout(()=>{ e.textContent=orig; e.classList.remove("am-dmx"); delete e.dataset.amDm },2600) } },90);
  S.timers.push(t);
}
/* 제목(문서 번호) 망각 */
function amTitle(){
  const h=$("#content .doc h1"); if(!h) return; const tn=[...h.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim()); if(!tn||h.dataset.amT) return;
  h.dataset.amT=tn.nodeValue; h.classList.add("am-fading");
  later(()=>{ tn.nodeValue=tn.nodeValue.replace(/\d/g,"█"); h.classList.remove("am-fading"); h.classList.add("am-title"); h.title="이 항목의 번호가 기억나지 않습니다. 눌러서 다시 떠올리기" },FX.on?1500:0);
}
function amTitleBack(){ const h=$("#content .doc h1"); if(!h||!h.dataset.amT) return; const tn=[...h.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim()); if(tn) tn.nodeValue=h.dataset.amT; delete h.dataset.amT; h.classList.remove("am-title"); h.removeAttribute("title") }
/* '귀하는 잊었습니다' 안내 */
function amNotice(){
  if($("#content .am-forgot")) return;
  const id=AM.key.split("/")[0], n=store.get(histKey(),[]).filter(h=>h.id.split("/")[0]===id).length;
  const min=Math.max(1,Math.round((Date.now()-AM.t0)/60000));
  const txt=n>1?`단말 기록상 귀하는 이 문서를 <b class="hi">${n}회</b> 열람했습니다. 귀하는 지금이 처음이라고 생각하고 있습니다. <span class="dim2">이것은 정상입니다.</span>`
    :`귀하는 이 문서를 ${min}분째 열람하고 있습니다. 지금까지 읽은 내용을 한 문장으로 말할 수 있습니까? <span class="dim2">말할 수 없다면, 정상입니다.</span>`;
  const ban=$("#content .am-ban"); if(ban) ban.insertAdjacentHTML("afterend",`<div class="notice danger am-forgot">${txt}</div>`);
  feedPush(`${S.user} 열람 기록 — ${id} (내용 기억 없음)`,"");
}

function amFx(key){
  const id=String(key).split("/")[0], d=SCP[id];
  if(!isAntimeme(d) || AM_OWN.has(id) || SPECIAL[id]) return;
  const doc=$("#content .doc"); if(!doc) return;
  AM.key=key; AM.gone=0; AM.words=0; AM.t0=Date.now(); if(AM.dosedFor!==id) AM.until=0;
  const meta=doc.querySelector(".meta"); (meta||doc.firstElementChild).insertAdjacentHTML(meta?"afterend":"beforebegin",amBanner(id));
  amDoseTick();
  const blocks=()=>Array.from(doc.querySelectorAll(".body.fmt > p, .body.fmt > .callout, .body.fmt > ul, .body.fmt > ol"));
  const bodies=()=>Array.from(doc.querySelectorAll(".body.fmt"));
  const all=blocks(), seed=hash(key);
  /* 망각 대상: 문서마다 다르게 대략 3개 중 1개 (첫 문단은 남김) */
  all.forEach((b,i)=>{ if(i>0 && (seed>>>(i%24))%3===0 && (b.textContent||"").trim().length>20) b.dataset.amMark="1" });
  const seen=new Map(); // 문단 → 화면에 머문 시간
  let lastT=Date.now();
  const scan=()=>{ const now=Date.now(), dt=now-lastT; lastT=now; if(amDosed()) return;
    for(const b of blocks()){ if(!b.dataset.amMark||b.dataset.amGone||b.dataset.amBack) continue;
      const v=amVis(b); if(v.shown) seen.set(b,(seen.get(b)||0)+dt);
      else if(v.above && (seen.get(b)||0)>1500) amForget(b) } };
  listen("scroll",()=>scan(),true);
  every(scan,500);
  /* 읽는 중에 눈앞에서 사라지는 문단 — 오래 보고 있으면 */
  every(()=>{ if(amDosed()) return; const L=blocks().filter(b=>b.dataset.amMark&&!b.dataset.amGone&&!b.dataset.amBack&&(seen.get(b)||0)>9000&&amVis(b).shown); if(L.length) amForget(L[0]) },3000);
  every(()=>{ if(!amDosed() && AM.words<14) amEvaporate(bodies()) },rnd(4200,6200));
  every(()=>{ if(!amDosed()) amDm() },4800);
  later(()=>{ if(!amDosed()) amTitle() },32000);
  later(()=>{ if(!amDosed()) amNotice() },55000);
}

/* 기억보강제: 3분 동안 연출 정지 + 지워진 내용 복구 */
function amDoseTick(){
  const el=$("#amleft"), btn=$("[data-amdose]"); if(!el) return;
  const left=AM.until-Date.now();
  if(left>0){ el.textContent=`· 약효 ${Math.floor(left/60000)}:${String(Math.floor(left/1000)%60).padStart(2,"0")}`; if(btn) btn.disabled=true; later(amDoseTick,1000) }
  else{ if(el.textContent){ toast("기억보강제 약효가 떨어졌습니다. 읽은 내용이 다시 지워지기 시작합니다.") } el.textContent=""; if(btn) btn.disabled=false }
}
document.addEventListener("click",e=>{
  const g=e.target.closest(".am-gap"); if(g){ const p=g.closest("[data-am-gone]"); if(p) amRecall(p); return }
  if(e.target.closest("#content .doc h1.am-title")){ amTitleBack(); return }
  const w=e.target.closest(".am-word.blank"); if(w&&w.dataset.w){ w.textContent=w.dataset.w; w.classList.remove("blank"); w.classList.add("back"); return }
  if(!e.target.closest("[data-amdose]")) return;
  AM.until=Date.now()+180000; AM.dosedFor=AM.key&&AM.key.split("/")[0];
  document.querySelectorAll("#content [data-am-gone]").forEach(amRecall);
  document.querySelectorAll("#content .am-word.blank").forEach(w=>{ w.textContent=w.dataset.w; w.classList.remove("blank"); w.classList.add("back") });
  amTitleBack(); $("#content .am-forgot")?.remove();
  toast("기억보강제 Class-W 투여 완료 — 3분 동안 읽은 내용이 유지됩니다."); feedPush(`${S.user} — 기억보강제 Class-W 1회분 수령`,"amber");
  amDoseTick();
});
document.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ") && e.target.classList?.contains("am-gap")){ e.preventDefault(); e.target.click() } });
