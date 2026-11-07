/* ════════════════════════════════════════════
   문서 간 연결
   - 본문의 SCP 번호(linkRefs)에 더해 부서·기지·기동특무부대·요주의 단체·인원 계급을 자동 링크
     (용어 정의는 data/xterms.json, 용어별 등장 문서는 build.py 가 미리 계산)
   - 링크에 마우스를 올리면 미리보기 카드
   - 문서 끝 "관련 문서": 서로 언급 · 본문에서 언급 · 이 문서를 언급(d.bl) · 태그 공통
   ════════════════════════════════════════════ */
const XT = /*__XTERMS__*/;
const XT_RE = XT.terms.map(t=>[t,new RegExp(t.re,"g")]);
const xtFill=(s,g)=>s.replace(/\$(\d)/g,(_,n)=>g[n-1]||"");
const xtGroups=m=>m.slice(1).filter(x=>x!=null);
const xtByKey=k=>XT.terms.find(t=>t.k===k)||XT.terms.find(t=>t.k.includes("$")&&k.startsWith(t.k.split("$")[0]));

/* 태그 밖의 글자에만 fn 적용 (이미 있는 <a> 안은 건드리지 않음) */
function mapText(html, fn){
  let inA=0;
  return html.split(/(<[^>]+>)/).map(p=>{
    if(p[0]==="<"){ if(/^<a[\s>]/i.test(p)) inA++; else if(/^<\/a>/i.test(p)) inA=Math.max(0,inA-1); return p }
    return inA||!p ? p : fn(p);
  }).join("");
}
/* 용어 링크 — 문서마다 같은 용어는 처음 나올 때만 (seen 으로 공유) */
function linkTerms(html, seen){
  seen=seen||new Set();
  return mapText(html, txt=>{
    const hits=[];
    for(const [t,re] of XT_RE){ re.lastIndex=0; let m;
      while((m=re.exec(txt))){ if(!m[0]) { re.lastIndex++; continue }
        const g=xtGroups(m), key=xtFill(t.k,g);
        if(seen.has(key)) continue;
        hits.push({i:m.index,e:m.index+m[0].length,t,g,key}); }
    }
    hits.sort((a,b)=>a.i-b.i||(b.e-b.i)-(a.e-a.i));
    let out="", at=0;
    for(const h of hits){
      if(h.i<at || seen.has(h.key)) continue;
      seen.add(h.key);
      out+=txt.slice(at,h.i)+`<a class="xterm" href="${xtHref(h.t,h.g,h.key)}" data-xt="${esc(h.key)}">${txt.slice(h.i,h.e)}</a>`;
      at=h.e;
    }
    return out+txt.slice(at);
  });
}
function xtHref(t,g,key){
  if(key==="site:19") return "#org";   // 본 기지
  return xtFill(t.href,g.map(encodeURIComponent));
}
/* 본문 한 구획: SCP 번호 + 용어 */
function xlink(html, selfId, seen){ return linkTerms(linkRefs(html,selfId),seen) }

/* ─── 미리보기 카드 ─── */
let xpopT=0, xpopFor=null;
function xpopEl(){
  let p=$("#xpop");
  if(!p){ p=document.createElement("div"); p.id="xpop"; p.className="xpop"; p.setAttribute("role","tooltip"); document.body.appendChild(p);
    p.addEventListener("mouseenter",()=>clearTimeout(xpopT)); p.addEventListener("mouseleave",xpopHide) }
  return p;
}
function xpopHide(){ clearTimeout(xpopT); xpopT=setTimeout(()=>{ const p=$("#xpop"); if(p) p.classList.remove("on"); xpopFor=null },120) }
function xpopShow(a){
  const html=a.dataset.xt?xtCard(a.dataset.xt):xrefCard(a);
  if(!html) return;
  const p=xpopEl(); p.innerHTML=html; p.classList.add("on"); xpopFor=a;
  const r=a.getBoundingClientRect(), w=p.offsetWidth, h=p.offsetHeight, vw=innerWidth, vh=innerHeight;
  let x=Math.min(Math.max(8,r.left), vw-w-8), y=r.bottom+6;
  if(y+h>vh-8) y=Math.max(8,r.top-h-6);
  p.style.left=x+"px"; p.style.top=y+"px";
}
function docLine(id){
  const o=SCP[id]; if(!o) return "";
  const lock=lvlFor(id)<reqLevel(o.object_class);
  return `<a class="xpl k-${classKey(o.object_class)}" href="#${id.toLowerCase()}"><b>${id}</b> <span class="dim">${esc(docName(o)||"")}</span>${lock?` <span class="dim2" title="열람 권한 부족">🔒</span>`:""}</a>`;
}
function xrefCard(a){
  const m=(a.getAttribute("href")||"").match(/^#(scp-[\w-]+)$/i); if(!m) return "";
  const id=m[1].toUpperCase(), d=SCP[id];
  if(!d) return `<div class="xph"><b>${id}</b></div><div class="dim2">이 노드에 색인되지 않은 항목입니다.</div>`;
  const need=reqLevel(d.object_class), lock=lvlFor(id)<need, nb=(d.bl||[]).length;
  const tags=(d.tags||[]).filter(t=>!CLASS_TAGS.has(t)).slice(0,4);
  return `<div class="xph">${badge(d)} <b>${id}</b></div>
    ${docName(d)?`<div class="xpt">${esc(docName(d))}</div>`:""}
    <div class="dim2">요구 권한 Level ${need}${lock?` · <span class="red">🔒 현재 권한으로 열람 불가</span>`:""}</div>
    ${tags.length?`<div class="dim2">${tags.map(t=>"#"+esc(t)).join(" ")}</div>`:""}
    ${nb?`<div class="dim2">다른 문서 ${nb}${nb>=40?"+":""}건에서 언급됨</div>`:""}`;
}
/* 규정집에서 이 용어의 구획 찾기 (규정집은 처음 쓸 때 불러옴) */
function xtLore(key){
  const t=xtByKey(key); if(!t) return null;
  const href=t.href||"", p=(href.match(/[?&]p=([^&]+)/)||[])[1];
  if(!p||!LORE) return null;
  const page=lorePage(p); if(!page) return null;
  const s=key.split(":").slice(1).join(":");
  return page.sections.find(x=>regsSecMatch(x,key.startsWith("site:")?s:key.startsWith("mtf:")?s+" (":s));
}
function regsSecMatch(sec, s){
  if(/^\d+$/.test(s)) return new RegExp("^제0*"+s+"(?!\\d)").test(sec.title);
  return sec.title.includes(s);
}
const XT_FALLBACK={mtf:"재단 규정집의 기동특무부대 일람에 실리지 않은 부대입니다. 지부 소속이거나 편성 정보가 기밀일 수 있습니다.",
  site:"재단 규정집의 보안시설 목록에 실리지 않은 시설입니다. 위치와 용도가 기밀일 수 있습니다.",
  goi:"재단이 감시 중인 요주의 단체입니다."};
function xtCard(key){
  const t=xtByKey(key); if(!t) return "";
  const g=key.split(":").slice(1).join(":").split(/-(?=\d)/);
  const label=key==="site:19"?"제19기지 (본 기지)":xtFill(t.t,g);
  const sec=xtLore(key);
  if(!sec && /[?&]p=/.test(t.href) && !LORE) loadLore().then(()=>{ if(xpopFor&&xpopFor.dataset.xt===key) xpopShow(xpopFor) },()=>{});
  const own=key.startsWith("site19:")&&typeof DEPT_INFO==="object"&&DEPT_INFO[key.slice(7)];
  const cls=key.startsWith("cls:")&&personnelClassInfo(key.slice(4));
  const body=t.desc || (own?`본 기지 ${own.hq} · ${own.loc} · 내선 ${own.ext} — ${own.job}`:"") || (cls?cls.body.replace(/\s+/g," ").slice(0,170)+"…":"") || (sec?sec.body.replace(/^(개요|소재지|특무부대 임무)\s*[:：]\s*/,"").replace(/\s+/g," ").slice(0,170)+"…":"")
    || (LORE&&!sec&&XT_FALLBACK[key.split(":")[0]]) || "";
  const D=XT.docs[key]||[0], cur=S.doc;
  const ids=D.slice(1).filter(id=>id!==cur).slice(0,5);
  return `<div class="xph"><span class="xkind">${esc(t.kind)}</span> <b>${esc(label)}</b></div>
    ${body?`<div class="xpd">${esc(body)}</div>`:""}
    ${D[0]>1?`<div class="dim2 xpn">이 용어가 나오는 문서 ${D[0]}건${ids.length?" · 평가순":""}</div>${ids.map(docLine).join("")}`:""}`;
}
document.addEventListener("mouseover",e=>{
  if(matchMedia("(hover: none)").matches) return;
  const a=e.target.closest(".body a.xref,.body a.xterm"); if(!a||a===xpopFor) return;
  clearTimeout(xpopT); xpopT=setTimeout(()=>xpopShow(a),280);
});
document.addEventListener("mouseout",e=>{ const a=e.target.closest(".body a.xref,.body a.xterm"); if(a) xpopHide() });
document.addEventListener("focusin",e=>{ const a=e.target.closest(".body a.xref,.body a.xterm"); if(a){ clearTimeout(xpopT); xpopShow(a) } else if(!e.target.closest("#xpop")) xpopHide() });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&xpopFor) xpopHide() });
window.addEventListener("hashchange",()=>{ const p=$("#xpop"); if(p) p.classList.remove("on"); xpopFor=null });
document.addEventListener("scroll",()=>{ if(xpopFor){ const p=$("#xpop"); if(p) p.classList.remove("on"); xpopFor=null } },true);

/* ─── 관련 문서 추천 ─── */
/* 본문에 나오는 SCP 번호 (나오는 순서, 중복 없이) */
function docOutRefs(d){
  const seen=new Set(), out=[], re=/SCP-(\d{3,4})(-[A-Z]{2,3}(?![A-Za-z]))?(?!\d)/g; let m;
  const txt=d.full_text||[d.containment,d.description].join("\n");
  while((m=re.exec(txt||""))){ const id=normId(m[1],m[2]); if(id!==d.id&&SCP[id]&&!seen.has(id)){ seen.add(id); out.push(id) } }
  return out;
}
function relatedDocs(d, n=8){
  const out=docOutRefs(d), back=d.bl||[], outS=new Set(out), backS=new Set(back);
  const mine=new Set((d.tags||[]).filter(t=>!CLASS_TAGS.has(t)));
  const R={};
  const add=(id,sc,why)=>{ if(id===d.id||!SCP[id]||SPECIAL[id]) return; const r=R[id]||(R[id]={id,sc:0,why:[]}); r.sc+=sc; if(why&&!r.why.includes(why)) r.why.push(why) };
  out.forEach((id,i)=>add(id,3-Math.min(i,10)*0.1, backS.has(id)?"서로 언급":"본문에서 언급"));
  back.forEach(id=>add(id,2.5, outS.has(id)?"서로 언급":"이 문서를 언급"));
  for(const id in R) if(outS.has(id)&&backS.has(id)) R[id].sc+=2;
  if(mine.size) for(const o of similarDocs(d,12)){
    const c=(o.tags||[]).filter(t=>mine.has(t));
    add(o.id,c.length*0.6,"#"+c.slice(0,2).join(" #"));
  }
  return Object.values(R).map(r=>(r.sc+=(SCP[r.id].rating||0)/2000,r)).sort((a,b)=>b.sc-a.sc).slice(0,n);
}
function relBox(d){
  const L=relatedDocs(d); if(!L.length) return "";
  const out=docOutRefs(d), back=d.bl||[];
  const list=(ids,more)=>`<div class="rlist">${ids.map(docLine).join("")}${more?`<span class="dim2">외 ${more}건</span>`:""}</div>`;
  return `<div class="similar related"><h4>관련 문서 <span class="dim2">· 본문 언급 · 상호 참조 · 태그 기준 추천</span></h4>
    <div class="simgrid">${L.map(r=>{const o=SCP[r.id], lock=lvlFor(o.id)<reqLevel(o.object_class);
      return `<a class="sim k-${classKey(o.object_class)}" href="#${o.id.toLowerCase()}"><span>${badge(o)} <b>${o.id}</b>${lock?` <span class="dim2" title="열람 권한 부족">🔒</span>`:""}</span><span class="dim">${esc(docName(o)||"")}</span><span class="why">${r.why.map(w=>`<i>${esc(w)}</i>`).join("")}</span></a>`}).join("")}</div>
    ${out.length||back.length?`<div class="rlinks">
      ${out.length?`<details><summary>이 문서가 언급하는 문서 ${out.length}건</summary>${list(out.slice(0,30),out.length-30>0?out.length-30:0)}</details>`:""}
      ${back.length?`<details><summary>이 문서를 언급한 문서 ${back.length}${back.length>=40?"+":""}건</summary>${list(back)}</details>`:""}
    </div>`:""}</div>`;
}
