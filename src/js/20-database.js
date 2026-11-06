/* ════ 검열 유틸 ════ */
function redactWords(text, docId, ratio){
  // 문서별로 결정적(deterministic)으로 일부 단어를 검열
  const seed=hash(docId); let i=0;
  return esc(text).replace(/[가-힣A-Za-z0-9]{2,}/g,w=>{
    i++; if(w==="SCP"||/^\d+$/.test(w)) return w; const r=((seed*31+i*7919)%1000)/1000;
    return r<ratio ? `<span class="redact">${w}</span>` : w;
  });
}
function blackBars(n){let s="";for(let i=0;i<n;i++){s+=`<span class="blk" style="width:${rnd(18,84)}px"></span>`}return s}
function markDM(html){ return html.replace(/\[(데이터 말소|편집됨|검열됨|삭제됨)\]/g,'<span class="dm">[$1]</span>').replace(/█+/g,m=>`<span class="dm">${m}</span>`) }
/* "> " 로 시작하는 줄(크롤러가 인용 블록을 이렇게 저장)을 인용 스타일로 */
function markQuotes(html){ return html.replace(/^&gt; ?(.*)$/gm,'<span class="quote">$1</span>')
  .replace(/^\[이미지: ?(.*)\]$/gm,'<span class="img">▣ 이미지 — $1</span>')
  .replace(/\[(\d{1,3})\](?!\()/g,'<sup class="fn">[$1]</sup>') }
function badge(d){ return `<span class="badge ${classKey(d.object_class)}">${esc(d.object_class||"[데이터 말소]")}</span>` }
/* 표의 한 행 전체를 클릭 가능하게: 첫 칸의 링크로 키보드 접근, 행 클릭은 위임 처리 */
function rowLink(href, label, cls="hi"){ return `<a href="${href}" class="rowlink ${cls}">${label}</a>` }

/* ════ 뷰: 대시보드 ════ */
function dashboard(){
  const docs=Object.values(SCP);
  const n=k=>docs.filter(d=>classKey(d.object_class)===k).length;
  const day=today();
  const recent=(S.recent.length?S.recent:["SCP-173","SCP-106","SCP-682","SCP-049","SCP-3008"]).filter(k=>SCP[k]).slice(0,6);
  const mine=S.recent.length>0;
  return `
  <h2 class="ph">SITE-19 <span>운영 현황</span> · ${now()}</h2>
  <div class="grid">
    <div class="card"><div class="k">격리 중 개체</div><div class="v">${docs.length}<small>+ ${srnd(day+"other",1800,1900)} (타 기지)</small></div></div>
    <div class="card"><div class="k">케테르 등급</div><div class="v red">${n("keter")}</div></div>
    <div class="card"><div class="k">유클리드 등급</div><div class="v amber">${n("euclid")}</div></div>
    <div class="card"><div class="k">안전 등급</div><div class="v green">${n("safe")}</div></div>
    <div class="card"><div class="k">현재 근무 인원</div><div class="v">${srnd(day+"staff",410,470)}<small>D계급 ${srnd(day+"dclass",60,90)}</small></div></div>
    <div class="card"><div class="k">기억소거제 재고 (B등급)</div><div class="v">${srnd(day+"amn",60,97)}%</div></div>
  </div>
  ${gwWidgets()}
  <div class="notice danger">
    <b class="red">RAISA 공지 · ${day}</b><br>
    구역 7 격리실(SCP-106) 하부 센서 어레이에서 지난 72시간 동안 ${srnd(day+"106",3,9)}건의 비정상 판독이 보고되었습니다. 해당 구역 접근은 Level 3 이상으로 제한되며, 바닥 재질 변화를 목격한 인원은 즉시 보고하십시오. <span class="redact">해당 보고를 한 인원 2명은 현재 의무실에 있습니다.</span>
  </div>
  <div class="notice">
    <b class="amber">기지 공지</b><br>
    · 11월 정기 기억소거 검진 일정이 변경되었습니다. 변경 전 일정으로 안내받은 인원은 <span class="redact">변경 전 일정이 존재하지 않았음을</span> 유념하십시오.<br>
    · 카페테리아 C 구역은 SCP-999 노출 이후 정리 중입니다. 기분이 좋아진 것은 정상입니다.<br>
    · 복도 B-4의 계단은 사용하지 마십시오. 해당 위치에 계단은 없습니다.
  </div>
  <h2 class="ph" style="margin-top:28px">${mine?"귀하의 최근 열람":"최근 열람"} <span>문서</span></h2>
  <table><tr><th>항목</th><th>등급</th><th>최종 열람</th><th>열람자</th></tr>
  ${recent.map((k,i)=>{const d=SCP[k];return `<tr class="row" data-href="#${k.toLowerCase()}"><td>${rowLink("#"+k.toLowerCase(),k)}</td><td>${badge(d)}</td>
    <td class="dim">${mine?(i===0?"방금 전":`${i}건 전`):srnd(day+k,1,23)+"시간 전"}</td>
    <td class="dim">${mine?esc(S.user):spick(day+k+"who",["R-19-"+srnd(k,1000,9999),"DR-"+spick(k,["GEARS","CLEF","BRIGHT","KONDRAKI","LIGHT"]),"<span class='redact'>D-9341</span>","(기록 없음)"])}</td></tr>`}).join("")}
  </table>`;
}

/* ════ 뷰: 데이터베이스 ════
   번호·제목·태그·등급 + 본문 검색, 등급 필터. 입력할 때는 표만 다시 그림 */
function database(params){
  const q=params?params.get("q")||"":"", c=params?params.get("c")||"all":"all";
  return `
  <h2 class="ph">격리 <span>데이터베이스</span> · ${Object.keys(SCP).length}건 색인됨</h2>
  <div class="search">
    <label for="dbq" class="sr">검색</label>
    <input id="dbq" type="search" placeholder="항목 번호, 제목, 태그, 본문 내용으로 검색" value="${esc(q)}" autocomplete="off">
    <span class="dim2" style="font-size:11px">열람 권한: ${LVL_NAME[S.level]}</span>
  </div>
  <div class="filters" role="group" aria-label="등급 필터">${CLASS_FILTERS.map(([k,l])=>`<button type="button" class="chip ${k===c?"on":""}" data-c="${k}" aria-pressed="${k===c}">${l}</button>`).join("")}</div>
  <div id="dbrows">${dbRows(q,c)}</div>
  <p class="dim2" style="margin-top:14px;font-size:11px">목록에 없는 항목은 존재하지 않거나, 귀하가 그 존재를 알 권한이 없습니다.</p>`;
}
function matchClass(d,c){
  if(c==="all") return true;
  const k=classKey(d.object_class);
  if(c==="other") return !["safe","euclid","keter","apollyon"].includes(k);
  return k===c;
}
function dbRows(q,c){
  const ql=q.trim().toLowerCase();
  const hits=[];
  for(const d of Object.values(SCP)){
    if(!matchClass(d,c)) continue;
    if(!ql){ hits.push({d}); continue }
    const meta=(d.id+" "+d.title+" "+(d.nickname||"")+" "+(d.tags||[]).join(" ")+" "+d.object_class).toLowerCase();
    if(meta.includes(ql) || meta.includes(ql.replace(/^(\d+)$/,"scp-$1"))){ hits.push({d}); continue }
    // 본문 검색: 권한이 있는 문서만 내용 일부를 보여줌
    const i=(d.full_text||"").toLowerCase().indexOf(ql);
    if(i>=0) hits.push({d, at:i});
  }
  hits.sort((a,b)=>byId(a.d.id,b.d.id));
  if(!hits.length) return `<div class="empty">"${esc(q)}"에 해당하는 항목이 없습니다.<br><span class="dim2">검색어를 줄이거나 등급 필터를 '전체'로 바꿔 보십시오.</span></div>`;
  return `<table><tr><th>항목</th><th>등급</th><th>태그</th><th>관련 문서</th><th>요구 권한</th><th>상태</th></tr>
  ${hits.map(({d,at})=>{const sp=!!SPECIAL[d.id]; const ns=sp?0:splitDoc(d).subs.length; const need=sp?0:reqLevel(d.object_class), ok=S.level>=need;
    const href="#"+d.id.toLowerCase();
    const tags=`<td class="dim">${(d.tags||[]).slice(0,4).map(esc).join(" · ")||"—"}</td>`;
    if(sp) return `<tr class="row" data-href="${href}"><td>${rowLink(href,d.id)}</td><td><span class="badge unknown">${d.id==="SCP-2521"?"●●|●●●●●|●●|●":"[반밈]"}</span></td>${tags}<td class="dim2">—</td><td class="dim2">—</td><td class="amber">${d.id==="SCP-2521"?"문자 기록 불가":"내용 없음"}</td></tr>`;
    const snip = at!=null ? `<div class="snip">${ok?snippet(d.full_text,at,q.trim().length):'<span class="redact">본문 일치 — 권한 부족으로 미리보기 불가</span>'}</div>` : "";
    return `<tr class="row ${ok?"":"locked"}" data-href="${href}">
      <td>${rowLink(href,d.id,ok?"hi":"")}${docName(d)?`<div class="dim2 ttl">${esc(docName(d))}</div>`:""}${snip}</td>
      <td>${badge(d)}</td>${tags}
      <td class="dim2">${ns?ns+"건":"—"}</td>
      <td>${ok?`<span class="dim">Level ${need}</span>`:`<span class="red">Level ${need} 필요</span>`}</td>
      <td class="dim">${ok?"열람 가능":"🔒 제한"}</td></tr>`}).join("")}
  </table>`;
}
function snippet(text,at,len){
  const a=Math.max(0,at-40), b=Math.min(text.length,at+len+60), sp=t=>esc(t.replace(/\s+/g," "));
  return (a>0?"…":"")+sp(text.slice(a,at))+`<mark>${sp(text.slice(at,at+len))}</mark>`+sp(text.slice(at+len,b))+(b<text.length?"…":"");
}
function bindDatabase(){
  const inp=$("#dbq"); let c=new URLSearchParams(location.hash.split("?")[1]||"").get("c")||"all";
  const upd=()=>{
    $("#dbrows").innerHTML=dbRows(inp.value,c);
    const p=new URLSearchParams(); if(inp.value) p.set("q",inp.value); if(c!=="all") p.set("c",c);
    const qs=p.toString(); history.replaceState(null,"","#database"+(qs?"?"+qs:""));
  };
  inp.addEventListener("input",upd);
  document.querySelectorAll(".chip").forEach(b=>b.addEventListener("click",()=>{
    c=b.dataset.c; document.querySelectorAll(".chip").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b)}); upd();
  }));
}
