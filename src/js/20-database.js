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
function badge(d){ const k=classKey(d.object_class); return `<span class="badge ${k}"><i aria-hidden="true">${CLASS_ICON[k]}</i> ${esc(d.object_class||"[데이터 말소]")}</span>` }
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
  <table><tr><th>항목</th><th>등급</th><th>최종 열람</th><th class="hm">열람자</th></tr>
  ${recent.map((k,i)=>{const d=SCP[k];return `<tr class="row" data-href="#${k.toLowerCase()}"><td>${rowLink("#"+k.toLowerCase(),k)}</td><td>${badge(d)}</td>
    <td class="dim">${mine?(i===0?"방금 전":`${i}건 전`):srnd(day+k,1,23)+"시간 전"}</td>
    <td class="dim hm">${mine?esc(S.user):spick(day+k+"who",["R-19-"+srnd(k,1000,9999),"DR-"+spick(k,["GEARS","CLEF","BRIGHT","KONDRAKI","LIGHT"]),"<span class='redact'>D-9341</span>","(기록 없음)"])}</td></tr>`}).join("")}
  </table>
  ${favs().filter(k=>SCP[k]).length?`<h2 class="ph" style="margin-top:28px">★ <span>즐겨찾기</span></h2>
  <div class="favs">${favs().filter(k=>SCP[k]).slice(0,12).map(k=>`<a href="#${k.toLowerCase()}" class="fav">${badge(SCP[k])} <b>${k}</b>${docName(SCP[k])?` <span class="dim">${esc(docName(SCP[k]))}</span>`:""}</a>`).join("")}</div>`:""}`;
}

/* ════ 뷰: 데이터베이스 ════
   검색(번호·제목·별명·태그·본문) + 등급 · 시리즈 · 태그 필터 + 정렬 + 50건씩 페이지
   상태는 주소(#database?q=&c=&s=&t=&o=&p=)에 그대로 남아 새로고침·공유가 됨 */
const DB_PAGE=50;
const SERIES=[["all","전체 시리즈"],["1","시리즈 1 (001–999)"],["2","시리즈 2 (1000–1999)"],["3","시리즈 3 (2000–2999)"],["4","시리즈 4 이상 (3000–)"],["ko","한국 지부 (-KO)"],["x","그 외"]];
const SORTS=[["num","번호순"],["rate","평가 높은순"],["name","이름순"],["recent","최근 열람순"]];
const TOP_TAGS=(()=>{const c={};for(const d of Object.values(SCP))for(const t of d.tags||[])if(!["안전","유클리드","케테르","아폴리온","타우미엘"].includes(t))c[t]=(c[t]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,24)})();
function dbState(params){
  const g=k=>(params&&params.get(k))||"";
  return {q:g("q"), c:g("c")||"all", s:g("s")||"all", t:g("t"), o:g("o")||"num", p:Math.max(1,+g("p")||1)};
}
function dbHash(st){
  const p=new URLSearchParams();
  if(st.q) p.set("q",st.q); if(st.c!=="all") p.set("c",st.c); if(st.s!=="all") p.set("s",st.s);
  if(st.t) p.set("t",st.t); if(st.o!=="num") p.set("o",st.o); if(st.p>1) p.set("p",st.p);
  const qs=p.toString(); return "#database"+(qs?"?"+qs:"");
}
function database(params){
  const st=dbState(params);
  return `
  <h2 class="ph">격리 <span>데이터베이스</span> · ${Object.keys(SCP).length}건 색인됨</h2>
  <div class="search">
    <label for="dbq" class="sr">검색</label>
    <input id="dbq" type="search" placeholder="항목 번호, 제목, 별명, 태그로 검색" value="${esc(st.q)}" autocomplete="off">
    <button type="button" class="btn" id="dbrand" title="열람 가능한 문서 중 무작위로 하나 열기">무작위 문서</button>
  </div>
  <div class="filters" role="group" aria-label="등급 필터">${CLASS_FILTERS.map(([k,l])=>`<button type="button" class="chip ${k===st.c?"on":""}" data-c="${k}" aria-pressed="${k===st.c}">${l}</button>`).join("")}</div>
  <div class="dbopts">
    <label class="sr" for="dbs">시리즈</label><select id="dbs">${SERIES.map(([k,l])=>`<option value="${k}" ${k===st.s?"selected":""}>${l}</option>`).join("")}</select>
    <label class="sr" for="dbo">정렬</label><select id="dbo">${SORTS.map(([k,l])=>`<option value="${k}" ${k===st.o?"selected":""}>${l}</option>`).join("")}</select>
    <details class="tagbox"${st.t?" open":""}><summary>태그로 찾기${st.t?` · <b class="amber">#${esc(st.t)}</b>`:""}</summary>
      <div class="tags">${TOP_TAGS.map(([t,n])=>`<button type="button" class="tagc ${t===st.t?"on":""}" data-t="${esc(t)}">#${esc(t)} <span class="dim2">${n}</span></button>`).join("")}${st.t?`<button type="button" class="tagc clr" data-t="">✕ 태그 해제</button>`:""}</div></details>
    <span class="dim2 lvlnote">열람 권한: ${LVL_NAME[S.level]}</span>
  </div>
  <div id="dbrows">${dbRows(st)}</div>
  <p class="dim2" style="margin-top:14px;font-size:11px">목록에 없는 항목은 존재하지 않거나, 귀하가 그 존재를 알 권한이 없습니다.</p>`;
}
function matchClass(d,c){
  if(c==="all") return true;
  if(c==="fav") return isFav(d.id);
  if(c==="note") return !!dnAll()[d.id];
  const k=classKey(d.object_class);
  if(c==="other") return !["safe","euclid","keter","apollyon"].includes(k);
  return k===c;
}
function inSeries(d,s){
  if(s==="all") return true;
  const [n,sfx]=idNum(d.id); if(s==="ko") return sfx==="KO"; if(sfx) return s==="x";
  if(s==="1") return n<1000; if(s==="2") return n>=1000&&n<2000; if(s==="3") return n>=2000&&n<3000;
  if(s==="4") return n>=3000; return false;
}
function dbHits(st){
  const ql=st.q.trim().toLowerCase(), hits=[];
  for(const d of Object.values(SCP)){
    if(!matchClass(d,st.c) || !inSeries(d,st.s) || (st.t && !(d.tags||[]).includes(st.t))) continue;
    if(!ql){ hits.push({d}); continue }
    const meta=(d.id+" "+d.title+" "+(d.nickname||"")+" "+(d.tags||[]).join(" ")+" "+d.object_class).toLowerCase();
    if(meta.includes(ql) || meta.includes(ql.replace(/^(\d+)$/,m=>"scp-"+m.padStart(3,"0")))){ hits.push({d}); continue }
    // 본문 검색: 본문을 불러온 문서만
    const i=(d.full_text||"").toLowerCase().indexOf(ql);
    if(i>=0) hits.push({d, at:i});
  }
  const name=d=>docName(d)||"\uffff";
  const rec=id=>{const i=S.recent.indexOf(id);return i<0?1e9:i};
  const cmp={num:(a,b)=>byId(a.d.id,b.d.id), rate:(a,b)=>(b.d.rating??-1e9)-(a.d.rating??-1e9)||byId(a.d.id,b.d.id),
    name:(a,b)=>name(a.d).localeCompare(name(b.d),"ko")||byId(a.d.id,b.d.id), recent:(a,b)=>rec(a.d.id)-rec(b.d.id)||byId(a.d.id,b.d.id)}[st.o]||((a,b)=>byId(a.d.id,b.d.id));
  return hits.sort(cmp);
}
function pager(cur,total,hrefFor){
  if(total<=1) return "";
  const win=[...new Set([1,cur-2,cur-1,cur,cur+1,cur+2,total])].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b);
  let out="", prev=0;
  for(const n of win){ if(n-prev>1) out+=`<span class="dim2">…</span>`; out+=n===cur?`<b aria-current="page">${n}</b>`:`<a href="${hrefFor(n)}">${n}</a>`; prev=n }
  return `<nav class="pager" aria-label="페이지">${cur>1?`<a href="${hrefFor(cur-1)}" aria-label="이전 페이지">‹</a>`:""}${out}${cur<total?`<a href="${hrefFor(cur+1)}" aria-label="다음 페이지">›</a>`:""}</nav>`;
}
function dbRows(st){
  const ql=st.q.trim();
  const hits=dbHits(st), pages=Math.max(1,Math.ceil(hits.length/DB_PAGE)), cur=Math.min(st.p,pages);
  const unloaded=ql?Object.values(SCP).filter(d=>d.chunk&&!d.loaded).length:0;
  const more=unloaded?`<div class="empty slim"><button type="button" class="btn" id="ftbtn">본문까지 검색 — 문서 ${unloaded}건의 본문 불러오기</button></div>`:"";
  if(!hits.length) return (st.c==="fav"&&!ql?`<div class="empty">즐겨찾기한 문서가 없습니다.<br><span class="dim2">문서 화면의 ☆ 즐겨찾기 버튼으로 추가하십시오.</span></div>`:`<div class="empty">조건에 맞는 항목이 없습니다.<br><span class="dim2">검색어를 줄이거나 필터를 '전체'로 바꿔 보십시오.</span></div>`)+more;
  const page=hits.slice((cur-1)*DB_PAGE,cur*DB_PAGE);
  return `<div class="dbcount dim2">${hits.length}건 중 ${(cur-1)*DB_PAGE+1}–${(cur-1)*DB_PAGE+page.length}</div>`+more+`<table><tr><th>항목</th><th>등급</th><th class="hm">태그</th><th class="hm c">평가</th><th>요구 권한</th><th class="hm">상태</th></tr>
  ${page.map(({d,at})=>{const sp=!!SPECIAL[d.id]; const need=sp?0:reqLevel(d.object_class), ok=lvlFor(d.id)>=need, tmp=ok&&S.level<need;
    const href="#"+d.id.toLowerCase();
    const tags=`<td class="dim hm">${(d.tags||[]).filter(t=>t!==d.object_class).slice(0,4).map(t=>`<button type="button" class="tagl" data-t="${esc(t)}">${esc(t)}</button>`).join(" · ")||"—"}</td>`;
    const rate=`<td class="hm c dim">${typeof d.rating==="number"?(d.rating>0?"+":"")+d.rating:"—"}</td>`;
    if(sp) return `<tr class="row" data-href="${href}"><td>${rowLink(href,d.id)}</td><td><span class="badge unknown">${d.id==="SCP-2521"?"●●|●●●●●|●●|●":"[반밈]"}</span></td>${tags}${rate}<td class="dim2">—</td><td class="amber hm">${d.id==="SCP-2521"?"문자 기록 불가":"내용 없음"}</td></tr>`;
    const snip = at!=null ? `<div class="snip">${ok?snippet(d.full_text,at,ql.length):'<span class="redact">본문 일치 — 권한 부족으로 미리보기 불가</span>'}</div>` : "";
    return `<tr class="row k-${classKey(d.object_class)} ${ok?"":"locked"}" data-href="${href}">
      <td>${rowLink(href,d.id,ok?"hi":"")}${branchTag(d.id)}${isFav(d.id)?' <span class="amber" title="즐겨찾기">★</span>':""}${docName(d)?`<div class="dim2 ttl">${esc(docName(d))}</div>`:""}${snip}</td>
      <td>${badge(d)}</td>${tags}${rate}
      <td>${ok?`<span class="dim">Level ${need}</span>`:`<span class="red">Level ${need} 필요</span>`}</td>
      <td class="dim hm">${tmp?'<span class="green">임시 열람</span>':ok?"열람 가능":"🔒 제한"}</td></tr>`}).join("")}
  </table>${pager(cur,pages,n=>dbHash({...st,p:n}))}`;
}
function snippet(text,at,len){
  const a=Math.max(0,at-40), b=Math.min(text.length,at+len+60), sp=t=>esc(t.replace(/\s+/g," "));
  return (a>0?"…":"")+sp(text.slice(a,at))+`<mark>${sp(text.slice(at,at+len))}</mark>`+sp(text.slice(at+len,b))+(b<text.length?"…":"");
}
function bindDatabase(){
  const st=dbState(new URLSearchParams(location.hash.split("?")[1]||""));
  const inp=$("#dbq"); let t=0;
  const upd=(resetPage=true)=>{
    if(!$("#dbrows")) return;
    if(resetPage) st.p=1;
    st.q=inp.value; $("#dbrows").innerHTML=dbRows(st);
    history.replaceState(null,"",dbHash(st));
  };
  inp.addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(upd,120) });
  $("#dbs").addEventListener("change",e=>{ st.s=e.target.value; upd() });
  $("#dbo").addEventListener("change",e=>{ st.o=e.target.value; upd() });
  $("#dbrand").addEventListener("click",()=>{
    const pool=dbHits({...st,q:""}).map(h=>h.d).filter(d=>!SPECIAL[d.id]&&lvlFor(d.id)>=reqLevel(d.object_class));
    if(!pool.length){ toast("조건에 맞는 열람 가능 문서가 없습니다."); return }
    openDoc(pick(pool).id);
  });
  document.querySelector(".tagbox").addEventListener("click",e=>{ const b=e.target.closest("[data-t]"); if(!b) return; st.t=b.dataset.t; st.p=1; go(dbHash(st)) });
  $("#dbrows").addEventListener("click",e=>{
    const tg=e.target.closest(".tagl"); if(tg){ e.stopPropagation(); st.t=tg.dataset.t; st.p=1; go(dbHash(st)); return }
    const b=e.target.closest("#ftbtn"); if(!b) return;
    b.disabled=true;
    loadAllBodies((n,tot)=>{ b.textContent=`본문 불러오는 중… ${Math.round(n/tot*100)}%` }).then(()=>upd(false));
  });
  document.querySelectorAll(".filters .chip").forEach(b=>b.addEventListener("click",()=>{
    st.c=b.dataset.c; document.querySelectorAll(".filters .chip").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b)}); upd();
  }));
}
