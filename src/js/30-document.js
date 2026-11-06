/* ════ 하위 문서(부록) 분해 ════ */
const HEAD_RE=/^(부록|문서 번호|실험 기록|탐사 기록|사건 기록|사건 보고서|면담 기록|회수된 기록|비망록)[^\n]{0,70}$/;
const SUBCACHE={};
function splitDoc(d){
  if(SUBCACHE[d.id]) return SUBCACHE[d.id];
  const clean=s=>(s||"").trim();
  const isHead=t=>HEAD_RE.test(t) && !/^(면담자|탐사조|면담 대상)/.test(t);
  // 설명이 부록까지 삼킨 경우 잘라냄
  let desc=clean(d.description), descTail="";
  { const ls=desc.split("\n"); const k=ls.findIndex(l=>isHead(l.trim())); if(k>=0){ descTail=ls.slice(k).join("\n"); desc=ls.slice(0,k).join("\n").trim() } }
  let rest=clean(d.full_text);
  if(d.description){const i=rest.indexOf(clean(d.description).slice(0,200)); if(i>=0) rest=rest.slice(i+clean(d.description).length)}
  rest=(descTail+"\n"+rest).replace(/^\s*(일련번호|등급)\s*[:：].*$/gm,"");
  const lines=rest.split("\n"); const subs=[]; let cur=null; const pre=[];
  for(const ln of lines){
    const t=ln.trim();
    if(isHead(t)){ if(cur) subs.push(cur); cur={title:t.replace(/[:：]\s*$/,""),lines:[]}; continue }
    (cur?cur.lines:pre).push(ln);
  }
  if(cur) subs.push(cur);
  const base=reqLevel(d.object_class);
  const out=subs.map((s,i)=>({idx:i,title:s.title,text:s.lines.join("\n").trim(),
     level: Math.min(4, base + ((hash(d.id+s.title)%3===0 && i>0)?1:0)) })).filter(s=>s.text.length>30);
  SUBCACHE[d.id]={pre:pre.join("\n").trim(), subs:out, description:desc, containment:clean(d.containment)};
  return SUBCACHE[d.id];
}
/* 본문 안의 SCP-XXXX 를 링크로 */
function linkRefs(html, selfId){
  return html.replace(/SCP-(\d{3,4})(-[A-Z]{2,3}(?![A-Za-z]))?(?!\d)/g,(m,n,sfx)=>{
    const id=normId(n,sfx);
    if(id===selfId) return m;
    return `<a class="xref ${SCP[id]?"":"dead"}" href="#${id.toLowerCase()}" title="${SCP[id]?id+" 열람":"색인되지 않음"}">${m}</a>`;
  });
}
function deadRef(id){
  S.doc=id; glitch(1); feedPush(`${S.user} 조회 — ${id} (색인 없음)`,"amber");
  render(`<a class="back" href="#database">← 데이터베이스</a>
  <div class="doc"><div class="hdr"><h1>${id}</h1><span class="badge unknown">미색인</span></div>
  <div class="denied"><b>항목 없음</b>${id} 는 이 노드에 색인되어 있지 않습니다. 해당 항목은 타 기지에 격리 중이거나, 재분류되었거나, 존재한 적이 없습니다.<br><span class="dim">이 조회는 기록되었습니다.</span></div>
  <div class="sec"><h4>격리 절차</h4><div class="body">${blackBars(rnd(12,24))}</div></div></div>`);
}
/* ─── 공문서 틀: 보안 등급 띠 · 표지 ─── */
function clsBanner(level, extra=""){
  const [t,c]=LVL_TAG[Math.min(5,level)]||LVL_TAG[4];
  return `<div class="clsbar ${c}" role="note"><b>LEVEL ${level} · ${t}</b><span>SCP 재단 내부 문서${extra?" · "+extra:""} · 무단 열람·복제·반출 금지</span></div>`;
}
const DEPT_OF=id=>spick(id+"dept",["연구부 · 격리동 B","연구부 · 격리동 A","생물학 연구과","변칙 물품 연구과","인간형 개체 연구과","외부 현상 조사과"]);
function docNo(d){ return `S19-${d.id.replace("SCP-","").replace(/-/g,"")}-R${srnd(d.id+"rev",2,14)}` }
function revDate(id){ return `${srnd(id+"y",2008,2024)}-${pad(srnd(id+"m",1,12))}-${pad(srnd(id+"d",1,28))}` }
function docCover(d, need, {masked=false, sub=null}={}){
  const k=classKey(d.object_class);
  const cell=(h,v)=>`<th>${h}</th><td>${v}</td>`;
  const lv=`Level ${need} · ${(LVL_TAG[need]||LVL_TAG[4])[0]}`;
  const rows=[
    [cell("항목 번호",`<b class="hi">${d.id}</b>`),cell("격리 등급",badge(d)+(d.class_note?` <span class="dim2">${esc(d.class_note)}</span>`:""))],
    [cell("보안 등급",`<span class="lvtag ${(LVL_TAG[need]||LVL_TAG[4])[1]}">${lv}</span>`),cell("분류",esc(seriesOf(d.id)))],
    [cell("문서 번호",masked?'<span class="redact">S19-0000-R0</span>':docNo(d)),cell("최종 개정",masked?'<span class="redact">0000-00-00</span>':`${revDate(d.id)} <span class="dim2">(제${srnd(d.id+"rev",2,14)}판)</span>`)],
    [cell("관리 부서",masked?'<span class="redact">████████</span>':DEPT_OF(d.id)),cell("평가",typeof d.rating==="number"?`${d.rating>0?"+":""}${d.rating}`:"—")],
  ];
  return `<div class="cover k-${k}">
    <div class="ctop">${EMBLEM}<div><b>SCP 재단</b><span>${sub?"부록 문서 · "+esc(sub):"특수 격리 절차 문서"}</span></div><div class="cicon ${k}" aria-hidden="true">${CLASS_ICON[k]}</div></div>
    <h1 class="ctitle">${sub?esc(sub):d.id}${!sub&&docName(d)?`<small>${esc(docName(d))}</small>`:sub?`<small>${d.id}${docName(d)?" · "+esc(docName(d)):""}</small>`:""}</h1>
    <table class="cinfo">${rows.map(r=>`<tr>${r.join("")}</tr>`).join("")}${(d.tags||[]).length&&!masked?`<tr><th>태그</th><td colspan="3" class="dim">${d.tags.filter(t=>t!==d.object_class).slice(0,8).map(t=>`<a class="tagl" href="#database?t=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(" ")}</td></tr>`:""}</table>
  </div>`;
}
function crumb(parts){ return `<nav class="crumb" aria-label="경로">${parts.map((p,i)=>p.href?`<a href="${p.href}">${esc(p.t)}</a>`:`<b class="hi" style="font-weight:500">${esc(p.t)}</b>`).join('<span aria-hidden="true">›</span>')}</nav>` }
function subsBox(d, cur=-1){
  const {subs}=splitDoc(d); if(!subs.length) return ""; const lv=lvlFor(d.id);
  return `<div class="subs"><h4>관련 문서 · ${subs.length}건</h4>${subs.map(s=>{const ok=lv>=s.level;
    return `<a class="${ok?"":"lock"} ${s.idx===cur?"hi":""}" href="#${d.id.toLowerCase()}/${s.idx}" ${s.idx===cur?'aria-current="page"':""}><span>${s.idx===cur?"▸ ":""}${esc(s.title)}</span><span class="r">${ok?`Level ${s.level}`:`🔒 Level ${s.level} 필요`}</span></a>`}).join("")}</div>`;
}
function showSub(id, idx){
  const d=SCP[id]; const {subs}=splitDoc(d); const s=subs[idx]; if(!s) return showDoc(id);
  S.doc=id+"/"+idx;
  const lv=lvlFor(id), ok=lv>=s.level;
  const nav=`<div class="pn"><span>${idx>0?`<a href="#${id.toLowerCase()}/${idx-1}">← ${esc(subs[idx-1].title)}</a>`:""}</span><span>${idx<subs.length-1?`<a href="#${id.toLowerCase()}/${idx+1}">${esc(subs[idx+1].title)} →</a>`:""}</span></div>`;
  if(!ok){ S.denied++; saveSession(); glitch(1); feedPush(`접근 거부 기록 — ${S.user} → ${id} / ${s.title}`,"red");
    render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id,href:"#"+id.toLowerCase()},{t:s.title}])}
    <div class="doc k-${classKey(d.object_class)}">${clsBanner(s.level,"부록")}${docCover(d,s.level,{masked:true,sub:s.title})}
    <div class="meta"><span>요구 권한 Level ${s.level}</span><span>현재 권한 Level ${S.level}</span></div>
    <div class="denied"><b>접근 거부</b>이 부록은 상위 문서보다 높은 권한을 요구합니다. 이 시도는 기록되었습니다.<br><span class="dim">누적 위반 ${S.denied}회</span>${reqBtn(id,s.level)}</div>
    ${clrNeedNote(s.level)}<div class="sec"><div class="body">${blackBars(rnd(30,70))}</div></div>${subsBox(d,idx)}${nav}</div>`); return }
  feedPush(`${S.user} 열람 — ${id} / ${s.title}`,""); noteRecent(id);
  const ratio = lv>s.level?0 : (s.level>=3?0.06:0.025);
  render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id,href:"#"+id.toLowerCase()},{t:s.title}])}
  <div class="doc k-${classKey(d.object_class)}">${clsBanner(s.level,"부록")}${docCover(d,s.level,{sub:s.title})}
  ${resumeBar(id+"/"+idx)}
  <div class="meta"><span>상위 문서 <a class="xref" href="#${id.toLowerCase()}">${id}</a></span><span>부록 ${idx+1} / ${subs.length}</span></div>
  <div class="sec"><h4 class="subt">${esc(s.title)}</h4><div class="body fmt">${fmtBody(linkRefs(markQuotes(markDM(redactWords(s.text,id+s.title,ratio))),id))}</div></div>
  ${subsBox(d,idx)}${nav}${clsBanner(s.level,"부록")}${attrib(d)}</div>`); afterDocRender(id+"/"+idx);
}

/* ════ 문서 열람 ════ */
function showDoc(id){
  const d=SCP[id]; if(!d) return deadRef(id);
  if(SPECIAL[id]){ S.doc=id; noteRecent(id); feedPush(`${S.user} 열람 — ${id}`,""); render(SPECIAL[id](d)); docEffects(id); return }
  const need=reqLevel(d.object_class), lv=lvlFor(id), until=grantUntil(id);
  S.doc=id;
  if(lv<need){ S.denied++; saveSession(); glitch(1); shake();
    feedPush(`접근 거부 기록 — ${S.user} → ${id}`, "red");
    render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id}])}
    <div class="doc k-${classKey(d.object_class)}">${clsBanner(need)}${docCover(d,need,{masked:true})}
      <div class="meta"><span>요구 권한 Level ${need}</span><span>현재 권한 Level ${S.level}</span><span>${now()}</span></div>
      <div class="denied"><b>접근 거부</b>귀하의 보안 등급은 이 문서를 열람하기에 충분하지 않습니다. 이 시도는 RAISA에 기록되었으며 담당 관리자에게 통보됩니다.<br><span class="dim">누적 위반 ${S.denied}회${S.denied>=3?' — <span class="red">기억소거 검토 대상</span>':''}</span>${reqBtn(id,need)}</div>
      <div class="sec"><h4><i>1.</i> 특수 격리 절차</h4><div class="body">${blackBars(rnd(18,30))}</div></div>
      <div class="sec"><h4><i>2.</i> 설명</h4><div class="body">${blackBars(rnd(30,60))}</div></div>
      ${clrNeedNote(need)}
      ${S.denied>=3?`<div class="notice danger">귀하의 단말에 기억소거 담당 인원이 배정되었습니다. 자리에서 이동하지 마십시오.</div>`:""}
    </div>`);
    return;
  }
  // 열람 가능 — 등급 차이가 작을수록 일부 단어 검열
  const ratio = lv>need?0 : (need>=3?0.07:0.03);
  const sections=[];
  const sd=splitDoc(d);
  if(sd.containment) sections.push(["특수 격리 절차", sd.containment]);
  if(sd.description) sections.push(["설명", sd.description]);
  if(!sd.containment && !sd.description) sections.push(["문서", d.full_text]);
  else if(sd.pre.length>40) sections.push(["추가 정보", sd.pre]);
  feedPush(`${S.user} 열람 — ${id}`, ""); noteRecent(id);
  render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id}])}
  <div class="doc k-${classKey(d.object_class)}">${clsBanner(need)}
    ${docCover(d,need)}
    ${docTools(id)}
    ${resumeBar(id)}
    ${until&&S.level<need?`<div class="notice grant">임시 열람 권한으로 열람 중 · ${fmtDate(until)}까지 <span class="dim2">(전자결재 승인)</span></div>`:""}
    <div class="meta"><span>분량 약 ${Math.max(1,Math.round((d.full_text||"").length/900))}분</span>${d.subs||splitDoc(d).subs.length?`<span>부록 ${splitDoc(d).subs.length}건</span>`:""}<span>열람자 ${esc(S.user)} · ${now().slice(0,16)}</span></div>
    ${docToc(sections,d)}
    ${sections.map(([h,t],i)=>`<div class="sec"><h4><i>${i+1}.</i> ${h}</h4><div class="body fmt">${fmtBody(linkRefs(markQuotes(markDM(redactWords(t,id+h,ratio))),id))}</div></div>`).join("")}
    ${subsBox(d)}
    ${docNoteBox(id)}
    ${similarBox(d)}
    ${clsBanner(need)}
    ${docPN(id)}
    <div class="attrib">출처: <a href="${d.source}" target="_blank" rel="noopener">${d.source}</a><br>
    ${d.author?`저자 ${esc(d.author)}`:""}${d.translator?` · 역자 ${esc(d.translator)}`:""} · SCP 재단 콘텐츠는 <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.ko" target="_blank" rel="noopener">CC BY-SA 3.0</a>으로 배포됩니다.</div>
  </div>`);
  afterDocRender(id); docEffects(id);
}
function attrib(d){return `<div class="attrib">출처: <a href="${d.source}" target="_blank" rel="noopener">${d.source}</a><br>${d.author?`저자 ${esc(d.author)}`:""}${d.translator?` · 역자 ${esc(d.translator)}`:""} · CC BY-SA 3.0</div>`}

/* ─── 문서 도구: 즐겨찾기 · 글자 크기 · 인쇄 · 이전/다음 ─── */
const favKey=()=>"fav_"+S.user;
const favs=()=>store.get(favKey(),[]);
const isFav=id=>favs().includes(id);
function docTools(id){
  const f=isFav(id);
  return `<div class="dtools" role="toolbar" aria-label="문서 도구">
    <button type="button" class="tb ${f?"on":""}" data-dt="fav" data-id="${id}" aria-pressed="${f}">${f?"★ 즐겨찾기됨":"☆ 즐겨찾기"}</button>
    <button type="button" class="tb" data-dt="fs-" aria-label="글자 작게" title="글자 작게">가-</button>
    <button type="button" class="tb" data-dt="fs+" aria-label="글자 크게" title="글자 크게">가+</button>
    <button type="button" class="tb" data-dt="print" title="인쇄 (출력 기록이 남습니다)">인쇄</button></div>`;
}
function docPN(id){
  const ids=Object.keys(SCP).sort(byId), i=ids.indexOf(id), p=ids[i-1], n=ids[i+1];
  const lab=k=>`${k}${docName(SCP[k])?" "+esc(docName(SCP[k])):""}`;
  return `<div class="pn docpn"><span>${p?`<a href="#${p.toLowerCase()}" title="이전 문서">‹ ${lab(p)}</a>`:""}</span><span>${n?`<a href="#${n.toLowerCase()}" title="다음 문서">${lab(n)} ›</a>`:""}</span></div>`;
}
function reqBtn(id, need){
  if(need>=4) return `<br><span class="dim2">Level 4 문서는 전자결재로 임시 열람을 신청할 수 없습니다.</span>`;
  return `<br><a class="btn" style="margin-top:12px;display:inline-block;text-decoration:none" href="#approval?new=access&id=${id}">열람 권한 신청 (전자결재)</a>`;
}
const FS={min:12,max:18};
function applyFs(){ document.documentElement.style.setProperty("--docfs",store.get("fs",13.5)+"px") }
applyFs();
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-dt]"); if(!b) return;
  const k=b.dataset.dt;
  if(k==="fav"){ const id=b.dataset.id, L=favs(), on=!L.includes(id);
    store.set(favKey(), on?[id,...L]:L.filter(x=>x!==id));
    b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); b.textContent=on?"★ 즐겨찾기됨":"☆ 즐겨찾기";
    toast(on?`${id} 을(를) 즐겨찾기에 추가했습니다.`:`${id} 을(를) 즐겨찾기에서 뺐습니다.`) }
  if(k==="fs-"||k==="fs+"){ const v=Math.min(FS.max,Math.max(FS.min,store.get("fs",13.5)+(k==="fs+"?1:-1))); store.set("fs",v); applyFs() }
  if(k==="print") window.print();
});

/* ════ 특수 문서 ════ */
const SPECIAL={
  "SCP-2521": d=>`<a class="back" href="#database">← 데이터베이스</a>
   <div class="doc">
    <div class="hdr"><h1>SCP-2521</h1><span class="badge keter">●●|●●●●●|●●|●</span></div>
    <div class="meta"><span>요구 권한 —</span><span>본 항목에 대한 문자 기반 정보는 보관할 수 없음</span></div>
    <div class="pict">●●|●●●●●|●●|●<small>PICTOGRAPHIC RECORD ONLY</small></div>
    <div class="notice danger" id="p2521">본 항목에 관한 <b>문자·음성 형태의 정보</b>는 항목에 의해 회수됩니다. 이 안내문은 문자로 작성되어 있습니다.</div>
    <div class="sec"><h4>격리 절차</h4><div class="body" id="t2521">이 문서의 원문은 전부 그림문자로 작성되어 있으며 SCiPNET 단말은 이를 렌더링하지 못합니다. 원문은 출처 링크에서 열람하십시오. 다음 문장을 작성한 연구원은 현재 </div></div>
    ${attrib(d)}</div>`,
  "SCP-3125": d=>`<a class="back" href="#database">← 데이터베이스</a>
   <div class="doc">
    <div class="hdr"><h1>SCP-3125</h1><span class="badge unknown">[반밈]</span></div>
    <div class="meta"><span>요구 권한 Level 4</span><span>반밈과 (Antimemetics Division)</span></div>
    <div class="sec"><h4>특수 격리 절차</h4><div class="body" id="t3125">이 페이지는 비어 있습니다.\n\n이 페이지는 처음부터 비어 있었습니다.\n\n귀하는 이 페이지에서 아무것도 읽지 않았고, 열람 기록에도 남지 않을 것입니다.\n\n</div></div>
    <div class="sec"><h4>설명</h4><div class="body dim2">— 기술 가능한 내용 없음 —</div></div>
    ${attrib(d)}</div>`,
};

