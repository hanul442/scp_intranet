/* ════════════════════════════════════════════
   재단 본부 설정 — 규정집(lore.json)의 재단 부서 · O5 평의회 · 주요 인원 기록을 화면 곳곳에 연결
   조직도(#org) 상단 재단 본부 체계 / O5 평의회 기록(#o5) / 인사 파일(#personnel) / 통합 검색(#search)
   기존 화면 함수는 감싸서 덧붙이기만 함 (VIEWS 항목 교체)
   ════════════════════════════════════════════ */
const FD_DEPTS="departments", FD_O5="o5-command-dossier", FD_PPL="personnel-and-character-dossier";
/* 섹션 본문 첫 문장 ("개요: " 머리말 제외) */
function loreBrief(s,max=110){
  const t=(s&&s.body||"").replace(/^개요:\s*/,"").split(/\n/)[0];
  const one=(t.match(/^.*?다\./)||[t])[0];
  return one.length>max?one.slice(0,max-1)+"…":one;
}
/* 규정집이 아직 안 왔으면 자리만 두고, 도착하면 그 자리만 채움 (화면을 다시 그리지 않음 — #o5 처럼 열 때마다 기록이 남는 화면 때문) */
let FD_SEQ=0;
function loreSlot(fill, wait="재단 기록을 불러오는 중…"){
  if(LORE) return fill();
  const id="fd"+(++FD_SEQ);
  loadLore().then(()=>{ const el=document.getElementById(id); if(el) el.outerHTML=fill() }, ()=>{ const el=document.getElementById(id); if(el) el.innerHTML=`<span class="dim2">재단 기록 서버에 연결할 수 없습니다.</span>` });
  return `<div id="${id}" class="dim2" style="margin:10px 0">${wait}</div>`;
}
const loreIdx=(page,title)=>page?page.sections.findIndex(s=>s.title===title):-1;

/* ── 조직도: SITE-19 위에 재단 본부(O5 평의회 → 윤리위원회 · RAISA) 와 본부 부서 ── */
function fdHQ(){
  const P=lorePage(FD_DEPTS); if(!P) return "";
  const admin=["O5 평의회","윤리위원회","기록정보보안행정처"].map(t=>[t,loreIdx(P,t)]).filter(([,i])=>i>=0);
  const iDept=loreIdx(P,"부서");
  const depts=P.sections.map((s,i)=>({s,i})).filter(({s,i})=>i>iDept&&s.level===1&&s.body);
  const box=([t,i],cls="")=>{const s=P.sections[i];return `<a class="obox ${cls}" href="${regHref(FD_DEPTS,i)}" title="${esc(loreBrief(s,300))}"><b>${esc(t)}</b><span class="dim2">${esc(s.en)}</span></a>`};
  const sites=lorePage("secure-facilities-locations"), i19=loreIdx(sites,"제19기지");
  return `<div class="fdhq" aria-label="재단 본부 조직">
    <div class="fdtop">${box(admin[0],"root")}</div>
    <div class="fdadm">${admin.slice(1).map(a=>box(a)).join("")}</div>
    <details class="fddepts"><summary>재단 본부 부서 <span class="dim2">${depts.length}개 · 각 부서는 기지를 가리지 않고 재단 전체 업무를 맡습니다</span></summary>
      <div class="fdgrid">${depts.map(({s,i})=>`<a class="fdd" href="${regHref(FD_DEPTS,i)}"><b>${esc(s.title)}</b><span class="dim2">${esc(s.en)}</span><span>${esc(loreBrief(s))}</span></a>`).join("")}</div></details>
    <div class="fdsite"><span class="dim2">관할 시설</span> <a class="xref" href="${i19>=0?regHref("secure-facilities-locations",i19):"#regs?p=secure-facilities-locations"}">제19기지</a> <span class="dim2">${esc(i19>=0?loreBrief(sites.sections[i19],90):"")}</span></div>
  </div>`;
}
/* RAISA 분소 · 보안부 상세에 상위 기관 / 연락 부대 안내 */
const FD_UPLINK={"RAISA 분소":[FD_DEPTS,"기록정보보안행정처","상위 기관"],"기지 관리부":[FD_DEPTS,"O5 평의회","최종 보고"],"보안부":["task-forces","기동특무부대 일람","연락 부대"]};
function fdUplink(dept){
  const u=FD_UPLINK[dept]; if(!u) return "";
  return loreSlot(()=>{ const P=lorePage(u[0]), i=loreIdx(P,u[1]); if(i<0) return "";
    return `<div class="clrnote"><b>${u[2]} · ${esc(u[1])}</b>${P.sections[i].en?` <span class="dim2">${esc(P.sections[i].en)}</span>`:""}<p>${esc(loreBrief(P.sections[i],260))}</p><p><a class="xref" href="${regHref(u[0],i)}">규정집에서 보기 →</a></p></div>` },"");
}
{
  const base=VIEWS.org;
  VIEWS.org=qs=>{
    let h=base(qs); const d=qs&&qs.get("d"), q=qs&&qs.get("q");
    if(!d&&!q) h=h.replace('<div class="ochart"',()=>`<h4 class="osub">SCP 재단 본부</h4>${loreSlot(fdHQ,"재단 본부 조직을 불러오는 중…")}<h4 class="osub">제19기지 (SITE-19)</h4><div class="ochart"`);
    if(d) h=h.replace('<h4 class="osub">구성원</h4>',()=>fdUplink(d)+'<h4 class="osub">구성원</h4>');
    return h;
  };
}

/* ── O5 평의회 기록: Level 5(O5) 이상이면 비공식 기록서류(출처 불명 유출본) 요약, 미만이면 기존 접근 거부 + 공개 규정 ── */
function fdO5Public(){
  const P=lorePage(FD_DEPTS), i=loreIdx(P,"O5 평의회"); if(i<0) return "";
  return `<div class="clrnote"><b>공개 규정 · 재단 부서 편람</b> O5 평의회 <span class="dim2">${esc(P.sections[i].en)}</span><p>${esc(P.sections[i].body.replace(/^개요:\s*/,""))}</p></div>`;
}
function fdO5Seats(){
  const P=lorePage(FD_O5); if(!P) return "";
  const seats=[]; let cur=null;
  P.sections.forEach((s,i)=>{
    if(s.level===1){ cur=/^O5-\d+$|^관리자$/.test(s.title)?{t:s.title,i,alias:[],note:s.body}:null; if(cur) seats.push(cur) }
    else if(cur&&s.level===3) cur.alias.push({n:s.title.replace(/^(O5-\d+|관리자):\s*/,"").replace(/"/g,"").replace(/\.\s*\[/," [").replace(/\.$/,""),en:s.en,i});
  });
  const iAbout=loreIdx(P,"개괄");
  return `<p class="dim">${esc(iAbout>=0?P.sections[iAbout].body.split("\n\n").slice(0,2).join(" "):"")}</p>
  <div class="o5grid">${seats.map(x=>`<div class="o5seat"><a class="o5n" href="${regHref(FD_O5,x.i)}">${esc(x.t)}</a>
    <div class="dim2">${x.alias.length?`보고된 인물 ${x.alias.length}명 · 서로 모순됨`:"단일 보고"}</div>
    <ul>${(x.alias.length?x.alias:[{n:(x.note.match(/"([^"]+)"/)||[,"신원 불명"])[1],i:x.i}]).map(a=>`<li><a href="${regHref(FD_O5,a.i)}">${esc(a.n)}</a>${a.en?` <span class="dim2">${esc(a.en)}</span>`:""}</li>`).join("")}</ul></div>`).join("")}</div>
  <div class="attrib">출처: <a href="${P.source}" target="_blank" rel="noopener">${P.source}</a> · ${P.author?`저자 ${esc(P.author)} · `:""}CC BY-SA 3.0</div>`;
}
{
  const base=VIEWS.o5;
  VIEWS.o5=qs=>{
    if(!loreOpen(FD_O5)) return base(qs)+loreSlot(fdO5Public,"");
    feedPush(`O5 기록서류 열람 — ${S.user} (Level ${S.level})`,"amber");
    return `<h2 class="ph red">O5 <span>평의회 기록</span> · 비공식 기록서류</h2>
    <div class="notice danger">이 기록서류는 재단이 작성한 것이 아닙니다. 외부에서 유입된 사본이며, 서로 모순되는 보고를 그대로 담고 있습니다. 어느 보고가 참인지 판단하지 마십시오. 열람 사실은 기록되었습니다.</div>
    ${loreSlot(fdO5Public,"")}${loreSlot(fdO5Seats,"기록서류를 복호화하는 중…")}`;
  };
}

/* ── 인사 파일: 재단 주요 인원 기록서류 (Level 4) ── */
function fdPeople(){
  const P=lorePage(FD_PPL); if(!P) return "";
  const cats=[]; let cur=null;
  P.sections.forEach((s,i)=>{ if(s.level===1&&s.title!=="FOUNDATION INTERNAL DOSSIER"){ cur=loreSecOpen(P,i)?{t:s.title,i,n:0,who:[]}:null; if(cur) cats.push(cur) } else if(cur&&s.level===3){ cur.n++; if(cur.who.length<4) cur.who.push(s.title.replace(/\(.*?\)/g,"").trim()) } });
  return `<div class="fdcats">${cats.map(c=>`<a class="fdd" href="${regHref(FD_PPL,c.i)}"><b>${esc(c.t)}</b><span class="dim2">${c.n}명</span><span>${esc(c.who.join(" · "))}${c.n>c.who.length?" …":""}</span></a>`).join("")}</div>`;
}
{
  const base=VIEWS.personnel;
  VIEWS.personnel=qs=>base(qs)+`<h4 class="osub" style="margin-top:26px">재단 주요 인원 기록서류 <span class="dim2">FOUNDATION INTERNAL DOSSIER · Level 4 이상</span></h4>
    ${loreOpen(FD_PPL)?loreSlot(fdPeople):`<div class="clrnote"><b>열람 제한</b> 재단 전체의 박사 · 요원 · 요주의 인물 기록은 보안 인가 4등급 이상에게만 공개됩니다. <a class="xref" href="#regs?p=${FD_PPL}">규정집에서 확인</a></div>`}`;
}

/* ── 통합 검색: 규정집(재단 설정) 항목도 찾기 ── */
function fdSearch(q){
  const ql=q.toLowerCase(), hits=[];
  [RULES,...(LORE?LORE.pages:[])].filter(p=>loreOpen(p.slug)).forEach(p=>p.sections.forEach((s,i)=>{
    if(!s.title||!loreSecOpen(p,i)) return;
    const inT=(s.title+" "+s.en).toLowerCase().includes(ql), inB=!inT&&s.body.toLowerCase().includes(ql);
    if(inT||inB) hits.push({p,s,i,w:inT?0:1});
  }));
  hits.sort((a,b)=>a.w-b.w);
  const t=LORE_TOC.reduce((m,[k,v])=>(m[k]=v,m),{});
  return `<div class="sgroup"><h4>재단 규정집 <span class="dim2">${hits.length}건</span></h4>${hits.length?hits.slice(0,12).map(h=>`<a class="si" href="${regHref(h.p.slug,h.i)}"><b>${esc(h.s.title)}</b> <span class="dim2">${esc(t[h.p.slug]||h.p.title)}${h.s.en?" · "+esc(h.s.en):""}</span></a>`).join("")+(hits.length>12?`<div class="dim2 si">외 ${hits.length-12}건 — 규정집 각 문서의 검색을 이용하십시오.</div>`:""):`<div class="dim2 si">결과 없음</div>`}</div>`;
}
{
  const base=VIEWS.search;
  VIEWS.search=qs=>{ const q=((qs&&qs.get("q"))||"").trim(); const h=base(qs); return q?h+loreSlot(()=>fdSearch(q),"규정집을 검색하는 중…"):h };
}
