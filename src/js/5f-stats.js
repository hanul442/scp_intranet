/* ════════════════════════════════════════════
   통계 — 격리 문서 현황(등급 · 시리즈 · 태그 · 평가 · 작성자) + 내 열람 통계
   막대는 해당 목록으로 가는 링크(데이터베이스 필터)
   ════════════════════════════════════════════ */
function statBars(rows, max){
  max=max||Math.max(1,...rows.map(r=>r.n));
  return `<div class="sbars">${rows.map(r=>{const w=Math.max(r.n?1.5:0,r.n/max*100);const inner=`<span class="sl">${r.label}</span><span class="sb"><i style="width:${w}%;${r.color?`background:${r.color}`:""}"></i></span><span class="sn">${r.n.toLocaleString()}${r.pct!=null?` <small>${r.pct}%</small>`:""}</span>`;
    return r.href?`<a class="sr2" href="${r.href}">${inner}</a>`:`<div class="sr2">${inner}</div>`}).join("")}</div>`;
}
const pct=(n,t)=>t?Math.round(n/t*1000)/10:0;
function stats(){
  const docs=Object.values(SCP), N=docs.length;
  const CL=[["keter","케테르"],["euclid","유클리드"],["safe","안전"],["apollyon","아폴리온·타우미엘"],["neutral","무효·해명"],["unknown","기타·미상"]];
  const cc={}; docs.forEach(d=>{const k=classKey(d.object_class);cc[k]=(cc[k]||0)+1});
  const classRows=CL.map(([k,l])=>({label:`<i aria-hidden="true">${CLASS_ICON[k]}</i> ${l}`,n:cc[k]||0,pct:pct(cc[k]||0,N),color:`var(--k-${k})`,
    href:["keter","euclid","safe","apollyon"].includes(k)?`#database?c=${k}`:k==="unknown"||k==="neutral"?"#database?c=other":""})).filter(r=>r.n);
  const SR=[["1","시리즈 1",d=>!idNum(d.id)[1]&&idNum(d.id)[0]<1000],["2","시리즈 2",d=>!idNum(d.id)[1]&&idNum(d.id)[0]>=1000&&idNum(d.id)[0]<2000],
            ["3","시리즈 3",d=>!idNum(d.id)[1]&&idNum(d.id)[0]>=2000&&idNum(d.id)[0]<3000],["x","시리즈 4 이상",d=>!idNum(d.id)[1]&&idNum(d.id)[0]>=3000],["x","국제 지부",d=>!!idNum(d.id)[1]]];
  const serRows=SR.map(([s,l,f])=>{const n=docs.filter(f).length;return {label:l,n,pct:pct(n,N),href:`#database?s=${s}`}}).filter(r=>r.n);
  const tagRows=TOP_TAGS.slice(0,12).map(([t,n])=>({label:esc(t),n,href:`#database?t=${encodeURIComponent(t)}`}));
  const rated=docs.filter(d=>d.rating!=null&&!isNaN(+d.rating)), avg=rated.length?Math.round(rated.reduce((s,d)=>s+ +d.rating,0)/rated.length):0;
  const top=[...rated].sort((a,b)=>b.rating-a.rating).slice(0,10);
  const au={}; docs.forEach(d=>{const a=(d.author||"").trim(); if(a&&!["작자 미상","미상"].includes(a)) au[a]=(au[a]||0)+1});
  const auRows=Object.entries(au).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([a,n])=>({label:esc(a),n,href:`#database?q=${encodeURIComponent(a)}`}));
  const tagN=new Set(docs.flatMap(d=>d.tags||[])).size;
  return `<h2 class="ph">격리 문서 <span>통계</span></h2>
  <div class="grid">
    <div class="card"><div class="k">색인된 문서</div><div class="v">${N.toLocaleString()}</div></div>
    <div class="card"><div class="k">평균 평가</div><div class="v">+${avg}<small>평가 있는 문서 ${rated.length.toLocaleString()}건</small></div></div>
    <div class="card"><div class="k">작성자</div><div class="v">${Object.keys(au).length.toLocaleString()}<small>명</small></div></div>
  </div>
  <div class="statgrid">
    <section class="card"><div class="k">등급별 분포</div>${statBars(classRows)}</section>
    <section class="card"><div class="k">시리즈별 분포</div>${statBars(serRows)}</section>
    <section class="card"><div class="k">많이 쓰인 태그 · 전체 ${tagN.toLocaleString()}종 (등급 태그 제외)</div>${statBars(tagRows)}</section>
    <section class="card"><div class="k">문서를 많이 쓴 작성자</div>${statBars(auRows)}</section>
  </div>
  <h3 class="ph" style="margin-top:24px">평가 <span>상위 10건</span></h3>
  <table><tr><th>#</th><th>항목</th><th class="hm">이름</th><th>등급</th><th style="text-align:right">평가</th></tr>
  ${top.map((d,i)=>`<tr class="row" data-href="#${d.id.toLowerCase()}"><td class="dim2">${i+1}</td><td>${rowLink("#"+d.id.toLowerCase(),d.id)}</td><td class="dim hm">${esc(docName(d))}</td><td>${badge(d)}</td><td style="text-align:right">+${d.rating}</td></tr>`).join("")}</table>
  ${myStats()}`;
}
/* 내 열람 통계 — 열람 이력(hist_<user>) 기준 */
function myStats(){
  const H=store.get("hist_"+S.user,[]).filter(h=>SCP[h.id]), uniq=[...new Set(H.map(h=>h.id))];
  const days=[...Array(14)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-13+i);return d});
  const perDay=days.map(d=>H.filter(h=>h.t>=+d&&h.t<+d+864e5).length), mx=Math.max(1,...perDay);
  const cc={}; uniq.forEach(id=>{const k=classKey(SCP[id].object_class);cc[k]=(cc[k]||0)+1});
  const readable=Object.values(SCP).filter(d=>reqLevel(d.object_class)<=lvlFor(d.id)).length;
  const head=`<h3 class="ph" style="margin-top:28px">내 <span>열람 통계</span></h3>`;
  if(!H.length) return head+`<div class="empty">아직 열람 기록이 없습니다. <a href="#database">격리 데이터베이스</a>에서 문서를 열면 여기에 집계됩니다.</div>`;
  return head+`<div class="grid">
    <div class="card"><div class="k">총 열람</div><div class="v">${H.length}<small>회</small></div></div>
    <div class="card"><div class="k">열람한 문서</div><div class="v">${uniq.length}<small>/ 열람 가능 ${readable.toLocaleString()}건 (${pct(uniq.length,readable)}%)</small></div></div>
    <div class="card"><div class="k">즐겨찾기</div><div class="v">${favs().filter(k=>SCP[k]).length}</div></div>
  </div>
  <div class="statgrid">
    <section class="card"><div class="k">최근 14일 열람 횟수</div>
      <div class="cols" role="img" aria-label="최근 14일 열람 횟수: ${perDay.join(", ")}">${perDay.map((n,i)=>`<div class="scol" title="${days[i].getMonth()+1}/${days[i].getDate()} · ${n}회"><span class="scn">${n||""}</span><i style="height:${n/mx*100}%"></i><span class="scd">${days[i].getDate()}</span></div>`).join("")}</div></section>
    <section class="card"><div class="k">열람한 문서의 등급</div>${statBars(Object.entries(cc).sort((a,b)=>b[1]-a[1]).map(([k,n])=>({label:`<i aria-hidden="true">${CLASS_ICON[k]}</i> ${({keter:"케테르",euclid:"유클리드",safe:"안전",apollyon:"아폴리온·타우미엘",neutral:"무효·해명",unknown:"기타·미상"})[k]}`,n,pct:pct(n,uniq.length),color:`var(--k-${k})`})))}</section>
  </div>
  <p class="dim2" style="margin-top:8px;font-size:11px">자세한 기록은 <a href="#history">열람 이력</a>에서 볼 수 있습니다.</p>`;
}

/* ─── 없는 화면 (404) ─── */
function notFound(h){
  return `<div class="nf"><div class="nfc">404</div><h2>요청한 화면을 찾을 수 없습니다</h2>
  <p class="dim">주소 <code>#${esc(h.slice(0,60))}</code> 에 해당하는 메뉴가 없습니다. 주소가 바뀌었거나 잘못 입력되었을 수 있습니다.</p>
  <div class="nfa"><a class="btn primary" href="#dashboard">홈으로</a><a class="btn" href="#search">통합 검색</a><a class="btn" href="#helpdesk">업무 요청으로 문의</a></div></div>`;
}
