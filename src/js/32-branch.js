/* ════ 지부 문서 구분: -KO 문서에 한국 지부 표지와 담당 기지 표시 ════ */
const BRANCH={KO:{name:"한국 지부",en:"SCP Foundation · Korean Branch",code:"KO"}};
const branchOf=id=>BRANCH[idNum(id||"")[1]]||null;

/* 담당 기지: 본문에 가장 많이 나오는 기지·구역 (제19기지, Site-21 → 제21기지). 없으면 지부 본부 직할 */
const SITE_CACHE={};
function siteOf(d){
  if(!d.full_text) return null;
  if(SITE_CACHE[d.id]) return SITE_CACHE[d.id];
  const cnt=new Map(), add=n=>cnt.set(n,(cnt.get(n)||0)+1);
  const t=d.full_text;
  for(const m of t.matchAll(/제\s?([0-9█]{1,4}|[θ⌘])\s?(?:[가-힣]{0,10}?)(기지|구역)/g)) add(`제${m[1]}${m[2]}`);
  for(const m of t.matchAll(/\b(Site|Area)[-–\s]([0-9█]{1,4})\b/gi)) add(`제${m[2]}${/^a/i.test(m[1])?"구역":"기지"}`);
  let best=null, bn=0;
  for(const [n,c] of cnt){ const known=!/█/.test(n)?1:0, b=best&&!/█/.test(best)?1:0;
    if(c>bn || (c===bn && known>b)){ best=n; bn=c } }
  return SITE_CACHE[d.id]=best?{name:best, redacted:/█/.test(best), n:bn}:{name:"한국 지부 본부 직할", none:true};
}
function siteCell(d, masked){
  if(masked) return '<span class="redact">제██기지</span>';
  const s=siteOf(d); if(!s) return '<span class="dim2">본문 불러오는 중</span>';
  if(s.none) return `${s.name} <span class="dim2">(본문에 기지 언급 없음)</span>`;
  if(s.redacted) return `<span class="dm">${esc(s.name)}</span> <span class="dim2">(위치 검열)</span>`;
  return `<a class="xref" href="#regs?p=secure-facilities-locations&q=${encodeURIComponent(s.name)}" title="보안시설 위치에서 찾기">${esc(s.name)}</a>${s.n>1?` <span class="dim2">본문 ${s.n}회 언급</span>`:""}`;
}
/* 표지 머리의 지부 인장 */
function branchSeal(b){ return `<div class="brseal" aria-label="${b.name}"><b>${b.code}</b><span>${b.name}</span></div>` }
/* 목록용 작은 지부 표시 */
function branchTag(id){ const b=branchOf(id); return b?` <span class="brtag" title="${b.name} 문서">${b.code}</span>`:"" }
