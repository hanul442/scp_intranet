/* ════════════════════════════════════════════
   문서 읽기 도구 — 목차 · 읽던 위치 · 진행 표시 · 열람 이력 · 비슷한 문서
   ════════════════════════════════════════════ */
const histKey=()=>"hist_"+S.user, posKey=()=>"pos_"+S.user;
/* 열람 이력: 같은 문서를 10분 안에 다시 열면 한 번으로 침 */
function logHistory(key){
  const L=store.get(histKey(),[]);
  if(L[0] && L[0].id===key && Date.now()-L[0].t<600000) return;
  L.unshift({id:key,t:Date.now()}); store.set(histKey(),L.slice(0,300));
}
/* 목차: 섹션 제목 + 부록 */
function docToc(sections, d){
  const subs=splitDoc(d).subs;
  if(sections.length+subs.length<3) return "";
  return `<nav class="toc" aria-label="목차"><b>목차</b><ol>${sections.map(([h],i)=>`<li><button type="button" data-toc="${i}">${esc(h)}</button></li>`).join("")}${subs.length?`<li><button type="button" data-toc="subs">부록 ${subs.length}건</button></li>`:""}<li><button type="button" data-toc="similar">관련 문서</button></li></ol></nav>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-toc]"); if(!b) return;
  const k=b.dataset.toc, el=k==="subs"?$("#content .subs"):k==="similar"?$("#content .similar"):document.querySelectorAll("#content .doc .sec")[+k];
  if(el) el.scrollIntoView({behavior:FX.on?"smooth":"auto",block:"start"});
});
/* 비슷한 문서: 등급 태그를 뺀 태그가 많이 겹치는 순 */
const CLASS_TAGS=new Set(["안전","유클리드","케테르","아폴리온","타우미엘","무효","해명","대기","특집"]);
function similarDocs(d, n=6){
  const mine=new Set((d.tags||[]).filter(t=>!CLASS_TAGS.has(t))); if(!mine.size) return [];
  const out=[];
  for(const o of Object.values(SCP)){ if(o.id===d.id||SPECIAL[o.id]) continue;
    let sc=0; for(const t of o.tags||[]) if(mine.has(t)) sc++;
    if(sc) out.push([sc+(o.rating||0)/1000,o]) }
  return out.sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1]);
}
function similarBox(d){
  const L=similarDocs(d); if(!L.length) return "";
  const mine=new Set(d.tags||[]);
  return `<div class="similar"><h4>비슷한 문서 <span class="dim2">· 태그 기준</span></h4><div class="simgrid">${L.map(o=>`<a class="sim k-${classKey(o.object_class)}" href="#${o.id.toLowerCase()}"><span>${badge(o)} <b>${o.id}</b></span><span class="dim">${esc(docName(o)||"")}</span><span class="dim2">${(o.tags||[]).filter(t=>mine.has(t)&&!CLASS_TAGS.has(t)).slice(0,3).map(t=>"#"+esc(t)).join(" ")}</span></a>`).join("")}</div></div>`;
}
/* 읽던 위치: 문서별 스크롤 비율 저장 → 다시 열면 '이어 읽기' */
function resumeBar(key){
  const r=(store.get(posKey(),{})[key]||0);
  if(r<0.08||r>0.95) return "";
  return `<div class="resume" role="status">지난번 이 문서의 ${Math.round(r*100)}%까지 읽었습니다. <button type="button" class="xref" data-resume="${r}">이어 읽기</button> <button type="button" class="xref dim2" data-resume="x">닫기</button></div>`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-resume]"); if(!b) return;
  const c=$("#content"), v=b.dataset.resume;
  if(v!=="x") c.scrollTop=(+v)*(c.scrollHeight-c.clientHeight);
  b.closest(".resume").remove();
});
let posT=0;
function docKey(){ return S.doc && /^SCP-/.test(S.doc) ? S.doc : null }
function onDocScroll(){
  const c=$("#content"), key=docKey(), bar=$("#readbar");
  if(!key){ if(bar) bar.style.width="0"; return }
  const max=c.scrollHeight-c.clientHeight, r=max>0?c.scrollTop/max:0;
  if(bar) bar.style.width=(r*100).toFixed(1)+"%";
  clearTimeout(posT); posT=setTimeout(()=>{ if(docKey()!==key) return; const P=store.get(posKey(),{}); P[key]=+r.toFixed(3); const ks=Object.keys(P); if(ks.length>200) delete P[ks[0]]; store.set(posKey(),P) },400);
}
$("#content").addEventListener("scroll",onDocScroll,{passive:true});
/* 문서를 그린 뒤 호출 */
function afterDocRender(key){ logHistory(key); docPhotos(key); amFx(key); const b=$("#readbar"); if(b) b.style.width="0" }

/* ════ 열람 이력 ════ */
function histView(qs){
  const L=store.get(histKey(),[]), q=((qs&&qs.get("q"))||"").trim().toUpperCase();
  const rows=L.filter(h=>!q||h.id.includes(q));
  const byDay={}; for(const h of rows){ const k=fmtDate(h.t).slice(0,10); (byDay[k]=byDay[k]||[]).push(h) }
  const label=k=>k===today()?"오늘":k===daysAgo(1)?"어제":k;
  const P=store.get(posKey(),{});
  return `<h2 class="ph">열람 <span>이력</span> · ${esc(S.user)}</h2>
  <div class="bbar"><span class="dim2">최근 ${L.length}건 · 같은 문서를 10분 안에 다시 연 기록은 합쳐집니다.</span><span class="sp"></span>${L.length?`<button type="button" class="btn" data-hist="clear">이력 지우기…</button>`:""}</div>
  ${rows.length?Object.entries(byDay).map(([k,hs])=>`<div class="hday"><h4>${label(k)}</h4><table>${hs.map(h=>{const [id,sub]=h.id.split("/"),d=SCP[id];
    const t=d&&sub!=null?(splitDoc(d).subs[+sub]||{}).title:"";
    return `<tr class="row" data-href="#${h.id.toLowerCase()}"><td class="dim c" style="width:70px">${fmtDate(h.t).slice(11)}</td><td>${rowLink("#"+h.id.toLowerCase(),id,"hi")}${t?` <span class="dim">/ ${esc(t)}</span>`:""}${d&&docName(d)?`<div class="dim2 ttl">${esc(docName(d))}</div>`:""}</td><td class="hm">${d?badge(d):""}</td><td class="dim2 c">${P[h.id]?Math.round(P[h.id]*100)+"%":"—"}</td></tr>`}).join("")}</table></div>`).join("")
  :`<div class="empty">열람한 문서가 없습니다.<br><a class="xref" href="#database">격리 데이터베이스로 →</a></div>`}`;
}
document.addEventListener("click",e=>{
  if(!e.target.closest("[data-hist=clear]")) return;
  modal({title:"열람 이력 지우기",html:"<p>이 단말에 저장된 열람 이력과 읽던 위치를 모두 지웁니다. RAISA 감사 기록은 지워지지 않습니다.</p>",
    buttons:[{label:"취소",act:c=>c()},{label:"이력 지우기",primary:true,act:c=>{ store.set(histKey(),[]); store.set(posKey(),{}); c(); route(); toast("열람 이력을 지웠습니다.") }}]});
});
