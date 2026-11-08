/* ════ 규정집 — 재단 설정 문서 (lore.py → data/lore.json, CC BY-SA 3.0) ════
   보안 인가 등급·인원 계급·직함은 index.html 에 바로 들어 있고(RULES),
   나머지(객체 등급, 기동특무부대, 기지, 요주의 단체 …)는 db/lore.js 에서 불러옴 */
const RULES = /*__LORE_RULES__*/;
const LORE_TOC = /*__LORE_TOC__*/;
let LORE = null, LORE_WAIT = null;
function scpLore(d){ LORE = d }
function loadLore(){
  if(LORE) return Promise.resolve(LORE);
  if(!LORE_WAIT) LORE_WAIT=new Promise((ok,fail)=>{
    const s=document.createElement("script"); s.src="db/lore.js"; s.async=true;
    s.onload=()=>ok(LORE); s.onerror=()=>{ LORE_WAIT=null; s.remove(); fail(new Error("lore")) };
    document.head.appendChild(s);
  });
  return LORE_WAIT;
}
/* 열람 제한 문서: 인가 등급 미달이면 규정 안내만 보여줌 */
const LORE_GATE={"o5-command-dossier":5,"personnel-and-character-dossier":4};
const loreOpen=slug=>S.level>=(LORE_GATE[slug]||0);
/* 문서 안 일부 장(대제목)만 더 높은 등급: 인원 기록서류의 O5 사령부 장은 Level 5 */
const LORE_SEC_GATE={"personnel-and-character-dossier":{"O5 사령부":5}};
function loreSecLevel(page,i){
  const G=LORE_SEC_GATE[page.slug]; if(!G) return 0;
  for(let j=i;j>=0;j--){ const s=page.sections[j]; if(s.level===1) return G[s.title]||0 }
  return 0;
}
const loreSecOpen=(page,i)=>S.level>=loreSecLevel(page,i);
/* 규정집 특정 항목으로 가는 주소 (#regs?p=문서&n=항목번호 — 문서 전체를 보여 주고 그 항목으로 이동) */
function regHref(slug,i){ return "#regs"+(slug===RULES.slug&&i==null?"":"?p="+slug+(i!=null?"&n="+i:"")) }
function lorePage(slug){ return slug===RULES.slug ? RULES : LORE && LORE.pages.find(p=>p.slug===slug) }
/* 보안 인가 n등급 / 인원 n계급 설명 — 다른 화면에서 쓰기 좋게 */
function clearanceInfo(n){ return RULES.sections.find(s=>s.title.startsWith(n+"등급")) }
function personnelClassInfo(c){ return RULES.sections.find(s=>s.title===c.toUpperCase()+"계급") }

function regs(qs){
  const slug=(qs&&qs.get("p"))||RULES.slug, q=((qs&&qs.get("q"))||"").trim();
  const tabs=`<div class="filters" role="group" aria-label="규정 문서">${LORE_TOC.map(([s,t])=>`<a class="chip ${s===slug?"on":""}" href="#regs${s===RULES.slug?"":"?p="+s}">${esc(t)}${LORE_GATE[s]?` <span class="dim2">L${LORE_GATE[s]}</span>`:""}</a>`).join("")}</div>`;
  const head=`<h2 class="ph">재단 <span>규정집</span> · 보안 인가 · 인원 계급 · 조직</h2>${tabs}`;
  if(!loreOpen(slug)) return head+`<div class="doc regs"><div class="denied"><b>LEVEL ${LORE_GATE[slug]} 이상 열람 가능</b>이 기록서류는 보안 인가 ${LORE_GATE[slug]}등급 이상 인원에게만 공개됩니다.</div>${typeof clrNeedNote==="function"?clrNeedNote(LORE_GATE[slug]):""}</div>`;
  const page=lorePage(slug);
  if(!page){
    if(!LORE_TOC.some(([s])=>s===slug)) return head+`<div class="empty">해당 규정 문서가 없습니다.</div>`;
    const at=location.hash;
    loadLore().then(()=>{ if(location.hash===at) route() },
      ()=>{ if(location.hash===at) $("#regbody").innerHTML=`<div class="denied"><b>전송 실패</b>규정 문서 서버에 연결할 수 없습니다.<br><button type="button" class="btn" style="margin-top:10px" onclick="route()">다시 시도</button></div>` });
    return head+`<div id="regbody" class="dim">규정 문서를 불러오는 중…</div>`;
  }
  const ql=q.toLowerCase();
  const sx=((qs&&qs.get("s"))||"").trim();  // 본문 링크에서 온 경우: 해당 구획만 (예: s=19 → 제19기지)
  const secs=page.sections.filter((s,i)=>(!sx||regsSecMatch(s,sx))&&(!ql||loreSecOpen(page,i)&&(s.title+" "+s.en+" "+s.body).toLowerCase().includes(ql)));
  const big=page.sections.length>20, jump=qs&&qs.get("n");
  const top=page.sections.map((s,i)=>({s,i})).filter(({s})=>s.level===1&&s.title);
  const toc=!q&&!sx&&top.length>=4?`<nav class="regtoc" aria-label="목차"><span class="dim2">목차</span>${top.map(({s,i})=>`<a href="${regHref(page.slug,i)}">${esc(s.title)}</a>`).join("")}</nav>`:"";
  if(jump) setTimeout(()=>{ const el=document.getElementById("rs-"+jump); if(el){ el.scrollIntoView({block:"start"}); el.classList.add("hit") } },0);
  return head+`
  ${big?`<form class="search" data-regq><label for="rgq" class="sr">규정 내 검색</label><input id="rgq" name="q" type="search" placeholder="이 문서에서 찾기 (예: 제19기지, 엡실론-11)" value="${esc(q)}" autocomplete="off"><button class="btn" type="submit">찾기</button></form>`:""}
  <div class="doc regs">
    <div class="hdr"><h1>${esc(page.title)}</h1><span class="badge unknown">RAISA 배포</span></div>
    ${sx?`<div class="notice">문서 본문에서 연결된 항목만 표시 중 · <a href="#regs?p=${page.slug}">전체 보기</a></div>`:""}
    ${!q&&!sx&&typeof REG_IG==="object"&&REG_IG[page.slug]?REG_IG[page.slug]():""}
    ${toc}
    ${secs.length?secs.map(s=>{const h=Math.min(4,s.level+1), si=page.sections.indexOf(s), need=loreSecLevel(page,si);
      if(need>S.level) return s.level===1?`<div class="sec" id="rs-${si}"><h${h} class="regh">${esc(s.title)}${s.en?` <small class="dim2">${esc(s.en)}</small>`:""}</h${h}><div class="denied"><b>LEVEL ${need} 이상 열람 가능</b>이 장은 보안 인가 ${need}등급 이상 인원에게만 공개됩니다.</div></div>`:"";
      return `<div class="sec" id="rs-${page.sections.indexOf(s)}">${s.title?`<h${h} class="regh">${esc(s.title)}${s.en?` <small class="dim2">${esc(s.en)}</small>`:""}</h${h}>`:""}
      ${s.body?`<div class="body">${linkRefs(markDM(esc(s.body)),"")}</div>`:""}</div>`}).join("")
      :`<div class="empty">${q?`"${esc(q)}"에 해당하는 항목이 없습니다.`:"규정집에 실린 항목이 없습니다."}${sx?` <a href="#regs?p=${page.slug}">전체 보기</a>`:""}</div>`}
    <div class="attrib">출처: <a href="${page.source}" target="_blank" rel="noopener">${page.source}</a><br>${page.author?`저자 ${esc(page.author)} · `:""}SCP 재단 콘텐츠는 <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.ko" target="_blank" rel="noopener">CC BY-SA 3.0</a>으로 배포됩니다.</div>
  </div>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-regq]"); if(!f) return; e.preventDefault();
  const p=new URLSearchParams(location.hash.split("?")[1]||""); const q=f.q.value.trim();
  q?p.set("q",q):p.delete("q"); go("#regs"+(p.toString()?"?"+p:""));
});
