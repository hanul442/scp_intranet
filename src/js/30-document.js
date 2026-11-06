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
function crumb(parts){ return `<nav class="crumb" aria-label="경로">${parts.map((p,i)=>p.href?`<a href="${p.href}">${esc(p.t)}</a>`:`<b class="hi" style="font-weight:500">${esc(p.t)}</b>`).join('<span aria-hidden="true">›</span>')}</nav>` }
function subsBox(d, cur=-1){
  const {subs}=splitDoc(d); if(!subs.length) return "";
  return `<div class="subs"><h4>관련 문서 · ${subs.length}건</h4>${subs.map(s=>{const ok=S.level>=s.level;
    return `<a class="${ok?"":"lock"} ${s.idx===cur?"hi":""}" href="#${d.id.toLowerCase()}/${s.idx}" ${s.idx===cur?'aria-current="page"':""}><span>${s.idx===cur?"▸ ":""}${esc(s.title)}</span><span class="r">${ok?`Level ${s.level}`:`🔒 Level ${s.level} 필요`}</span></a>`}).join("")}</div>`;
}
function showSub(id, idx){
  const d=SCP[id]; const {subs}=splitDoc(d); const s=subs[idx]; if(!s) return showDoc(id);
  S.doc=id+"/"+idx;
  const ok=S.level>=s.level;
  const nav=`<div class="pn"><span>${idx>0?`<a href="#${id.toLowerCase()}/${idx-1}">← ${esc(subs[idx-1].title)}</a>`:""}</span><span>${idx<subs.length-1?`<a href="#${id.toLowerCase()}/${idx+1}">${esc(subs[idx+1].title)} →</a>`:""}</span></div>`;
  if(!ok){ S.denied++; saveSession(); glitch(1); feedPush(`접근 거부 기록 — ${S.user} → ${id} / ${s.title}`,"red");
    render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id,href:"#"+id.toLowerCase()},{t:s.title}])}
    <div class="doc"><div class="hdr"><h1 style="font-size:20px">${esc(s.title)}</h1><span class="badge ${classKey(d.object_class)}">${id}</span></div>
    <div class="meta"><span>요구 권한 Level ${s.level}</span><span>현재 권한 Level ${S.level}</span></div>
    <div class="denied"><b>접근 거부</b>이 부록은 상위 문서보다 높은 권한을 요구합니다. 이 시도는 기록되었습니다.<br><span class="dim">누적 위반 ${S.denied}회</span></div>
    <div class="sec"><div class="body">${blackBars(rnd(30,70))}</div></div>${subsBox(d,idx)}${nav}</div>`); return }
  feedPush(`${S.user} 열람 — ${id} / ${s.title}`,""); noteRecent(id);
  const ratio = S.level>s.level?0 : (s.level>=3?0.06:0.025);
  render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id,href:"#"+id.toLowerCase()},{t:s.title}])}
  ${s.level>=3?`<div class="stamp">LEVEL ${s.level} // EYES ONLY</div>`:""}
  <div class="doc"><div class="hdr"><h1 style="font-size:20px">${esc(s.title)}</h1><span class="badge ${classKey(d.object_class)}">${id}</span></div>
  <div class="meta"><span>상위 문서 ${id}</span><span>요구 권한 Level ${s.level}</span><span>문서 ${idx+1} / ${subs.length}</span></div>
  <div class="sec"><div class="body">${linkRefs(markQuotes(markDM(redactWords(s.text,id+s.title,ratio))),id)}</div></div>
  ${subsBox(d,idx)}${nav}${attrib(d)}</div>`);
}

/* ════ 문서 열람 ════ */
function showDoc(id){
  const d=SCP[id]; if(!d) return deadRef(id);
  if(SPECIAL[id]){ S.doc=id; noteRecent(id); feedPush(`${S.user} 열람 — ${id}`,""); render(SPECIAL[id](d)); docEffects(id); return }
  const need=reqLevel(d.object_class);
  S.doc=id;
  if(S.level<need){ S.denied++; saveSession(); glitch(1); shake();
    feedPush(`접근 거부 기록 — ${S.user} → ${id}`, "red");
    render(`<a class="back" href="#database">← 데이터베이스</a>
    <div class="doc">
      <div class="hdr"><h1>${id}</h1><span class="badge ${classKey(d.object_class)}">${esc(d.object_class||"[데이터 말소]")}</span></div>
      <div class="meta"><span>요구 권한 Level ${need}</span><span>현재 권한 Level ${S.level}</span><span>${now()}</span></div>
      <div class="denied"><b>접근 거부</b>귀하의 보안 등급은 이 문서를 열람하기에 충분하지 않습니다. 이 시도는 RAISA에 기록되었으며 담당 관리자에게 통보됩니다.<br><span class="dim">누적 위반 ${S.denied}회${S.denied>=3?' — <span class="red">기억소거 검토 대상</span>':''}</span></div>
      <div class="sec"><h4>특수 격리 절차</h4><div class="body">${blackBars(rnd(18,30))}</div></div>
      <div class="sec"><h4>설명</h4><div class="body">${blackBars(rnd(30,60))}</div></div>
      ${S.denied>=3?`<div class="notice danger">귀하의 단말에 기억소거 담당 인원이 배정되었습니다. 자리에서 이동하지 마십시오.</div>`:""}
    </div>`);
    return;
  }
  // 열람 가능 — 등급 차이가 작을수록 일부 단어 검열
  const ratio = S.level>need?0 : (need>=3?0.07:0.03);
  const sections=[];
  const sd=splitDoc(d);
  if(sd.containment) sections.push(["특수 격리 절차", sd.containment]);
  if(sd.description) sections.push(["설명", sd.description]);
  if(!sd.containment && !sd.description) sections.push(["문서", d.full_text]);
  else if(sd.pre.length>40) sections.push(["추가 정보", sd.pre]);
  feedPush(`${S.user} 열람 — ${id}`, ""); noteRecent(id);
  render(`${crumb([{t:"격리 데이터베이스",href:"#database"},{t:id}])}
  ${need>=3?`<div class="stamp">LEVEL ${need} // EYES ONLY</div>`:""}
  <div class="doc">
    <div class="hdr"><h1>${id}${docName(d)?`<small class="nick">${esc(docName(d))}</small>`:""}</h1><span class="badge ${classKey(d.object_class)}">${esc(d.object_class||"[데이터 말소]")}</span></div>
    <div class="meta">${typeof d.rating==="number"?`<span>평가 ${d.rating>0?"+":""}${d.rating}</span>`:""}<span>등급 ${esc(d.object_class||"—")}${d.class_note?` (${esc(d.class_note)})`:""}</span><span>요구 권한 Level ${need}</span><span>${(d.tags||[]).slice(0,5).map(esc).join(" · ")}</span><span>최종 수정 ${srnd(id+"y",2008,2024)}-${pad(srnd(id+"m",1,12))}-${pad(srnd(id+"d",1,28))}</span></div>
    ${sections.map(([h,t])=>`<div class="sec"><h4>${h}</h4><div class="body">${linkRefs(markQuotes(markDM(redactWords(t,id+h,ratio))),id)}</div></div>`).join("")}
    ${subsBox(d)}
    <div class="attrib">출처: <a href="${d.source}" target="_blank" rel="noopener">${d.source}</a><br>
    ${d.author?`저자 ${esc(d.author)}`:""}${d.translator?` · 역자 ${esc(d.translator)}`:""} · SCP 재단 콘텐츠는 <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.ko" target="_blank" rel="noopener">CC BY-SA 3.0</a>으로 배포됩니다.</div>
  </div>`);
  docEffects(id);
}
function attrib(d){return `<div class="attrib">출처: <a href="${d.source}" target="_blank" rel="noopener">${d.source}</a><br>${d.author?`저자 ${esc(d.author)}`:""}${d.translator?` · 역자 ${esc(d.translator)}`:""} · CC BY-SA 3.0</div>`}

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

