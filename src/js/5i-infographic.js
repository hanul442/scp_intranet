/* ════════════════════════════════════════════
   인포그래픽 — 문서 한눈에 보기 · 보안 인가 피라미드 · 인원 계급 도표 · 잠긴 상자 테스트 · 통계 도넛
   모두 HTML/CSS 로 그림 (외부 라이브러리 없음), 내용은 규정집(RULES · lore) 기준
   ════════════════════════════════════════════ */
const LV_COLOR=n=>n<=0?"var(--fg3)":`var(--l${Math.min(5,n)})`;
const LV_WHO={0:"비보안 시설의 사무·잡무 인원",1:"격리 시설의 사무·물류 인원",2:"연구원 · 현장 요원 · 격리 전문가",3:"선임 연구원 · 보안 담당관 · 기동특무부대",4:"기지 이사관 · 보안 책임자 · MTF 사령관",5:"O5 평의원"};

/* 보안 인가 피라미드: 위가 5등급, 아래가 0등급. me = 강조할 등급 */
function clrPyramid(me){
  const cnt={}; Object.values(typeof STAFF_CLR==="object"?STAFF_CLR:{}).forEach(([n])=>cnt[n]=(cnt[n]||0)+1);
  return `<div class="pyr" role="img" aria-label="보안 인가 등급 피라미드: 위로 갈수록 높은 등급, 인원은 적어짐">
    ${[5,4,3,2,1,0].map(n=>`<div class="pyrow ${n===me?"me":""}">
      <div class="pyb"><span style="width:${34+(5-n)*13}%;background:${LV_COLOR(n)}"><b>${n}</b> ${LVL_TAG[n][0]}</span></div>
      <div class="pyd"><span class="dim2">${LVL_EN[n]}</span>${esc(LV_WHO[n])}${cnt[n]?` <span class="dim2">· 제19기지 ${cnt[n]}명</span>`:""}${n===me?` <b class="amber">◀ 나</b>`:""}</div></div>`).join("")}
    <div class="pyax dim2"><span>▲ 접근 범위 넓음 · 인원 적음</span><span>▼ 인원 많음 · 접근 범위 좁음</span></div></div>`;
}

/* 인원 계급: 변칙 존재와의 거리 */
const CLS_LADDER=[["A","전략 필수 인원","변칙 존재 직접 접근 금지","l5"],["B","국지 활동 필수 인원","검역 끝난 대상만 접근","l2"],["C","일반 직접 접근 인원","검역·정신감정 대상","l3"],["D","소모 인원","고위험 대상 실험 투입","l4"],["E","임시 계급","최초 확보 중 노출된 인원","l1"]];
function classLadder(me){
  return `<div class="cldr" role="img" aria-label="인원 계급 A부터 E까지, 변칙 존재와 가까워지는 순서">
    <div class="cldax dim2"><span>변칙 존재와 멀다</span><i></i><span>가깝다</span></div>
    <div class="cldrow">${CLS_LADDER.map(([c,t,d,l])=>`<div class="cldc ${c===me?"me":""}" style="--cc:var(--${l})"><b>${c}</b><span>${t}</span><small class="dim2">${d}</small>${c===me?`<em>나</em>`:""}</div>`).join("")}</div></div>`;
}

/* 잠긴 상자 테스트 (객체 등급 FAQ) + 이 노드의 등급별 문서 수 */
const LOCKBOX=[["safe","안전","상자에 넣고 내버려 둬도 나쁜 일이 일어나지 않는다","▣","#database?c=safe"],["euclid","유클리드","상자에 넣어도 무슨 일이 일어날지 확신할 수 없다","◐","#database?c=euclid"],
  ["keter","케테르","상자에 넣어도 쉽게 상자 밖으로 탈출한다","✖","#database?c=keter"],["apollyon","타우미엘","그것 자체가 바로 상자다","☢","#database?c=apollyon"]];
function lockBox(){
  const cc={}; Object.values(SCP).forEach(d=>{const k=d.object_class==="아폴리온"?"x":classKey(d.object_class);cc[k]=(cc[k]||0)+1});
  return `<div class="lbox"><div class="lbh"><b>잠긴 상자 테스트</b> <span class="dim2">객체 등급을 정하는 비공식 지침</span></div>
    <div class="lbrow">${LOCKBOX.map(([k,n,t,ic,h],i)=>`<a class="lbc k-${k}" href="${h}"><div class="lbart lb${i}" aria-hidden="true"><i></i><s>${ic}</s></div><b>${n}</b><span>${t}</span><small class="dim2">이 노드 ${(cc[k]||0).toLocaleString()}건 ›</small></a>`).join("")}</div>
    <p class="dim2" style="font-size:11px;margin-top:6px">스스로 움직이거나 지능이 있는 개체는 거의 항상 최소 유클리드 등급을 받습니다.</p></div>`;
}

/* 문서 한눈에 보기: 격리 난이도 · 열람 인가 · 문서 구성 */
const DIFF=["안전","유클리드","케테르","아폴리온"];
const DIFF_NOTE={안전:"상자에 넣어 두면 아무 일도 없음",유클리드:"격리가 늘 견고하지는 않음",케테르:"안정적 격리가 몹시 어려움",아폴리온:"격리 불가 · 세계 멸망급 위협",
  타우미엘:"재단이 다른 변칙 대응에 쓰는 개체",무효:"변칙성 상실 · 격리 불필요",해명:"주류 과학으로 설명됨 · 격리 불필요"};
function docInfo(d, need, sd){
  const oc=d.object_class||"", k=classKey(oc), pos=DIFF.indexOf(oc), lv=lvlFor(d.id);
  const diff=`<div class="igc"><div class="igk">격리 난이도</div>
    <div class="dscale" role="img" aria-label="격리 난이도 ${pos>=0?`${DIFF.length}단계 중 ${pos+1}단계`:"판정 범위 밖"}">${DIFF.map((n,i)=>`<span class="${i<=pos?"on":""} ${i===pos?"cur":""}" style="--dc:var(--k-${classKey(n)})"><i></i>${n}</span>`).join("")}</div>
    <div class="igv"><b style="color:var(--k-${k})">${CLASS_ICON[k]} ${esc(oc||"미상")}</b> <span class="dim">${esc(DIFF_NOTE[oc]||"등급 판정 보류 · 난해한 등급")}</span></div></div>`;
  const clr=`<div class="igc"><div class="igk">열람 인가</div>
    <div class="lscale" role="img" aria-label="요구 인가 ${need}등급, 내 등급 ${S.level}">${[0,1,2,3,4,5].map(n=>`<span class="${n>=need?"on":""}" style="--lc:${LV_COLOR(n)}"><i>${n}</i>${n===S.level?`<em>나</em>`:""}</span>`).join("")}</div>
    <div class="igv"><span class="lvtag ${(LVL_TAG[need]||LVL_TAG[4])[1]}">Level ${need} ${LVL_TAG[need][0]}</span> <span class="dim">이상 열람 · </span>${lv>=need?`<span class="green">${S.level>=need?"열람 가능":"임시 권한으로 열람 중"}</span>`:`<span class="red">등급 부족</span>`}</div></div>`;
  const len=s=>(s||"").length, subs=sd.subs.reduce((a,s)=>a+len(s.text),0);
  const parts=[["격리 절차",len(sd.containment),"var(--cyan)"],["설명",len(sd.description),"var(--amber)"],["부록",subs,"var(--k-apollyon)"],["기타",len(sd.pre),"var(--fg3)"]].filter(p=>p[1]>0);
  const tot=parts.reduce((a,p)=>a+p[1],0)||1, refs=new Set(((d.full_text||"").match(/SCP-\d{3,4}(-[A-Z]{2,3})?/g)||[]).filter(x=>x!==d.id)).size;
  const comp=`<div class="igc"><div class="igk">문서 구성</div>
    <div class="cbar" role="img" aria-label="${parts.map(p=>`${p[0]} ${Math.round(p[1]/tot*100)}%`).join(", ")}">${parts.map(p=>`<i style="flex:${p[1]};background:${p[2]}" title="${p[0]} ${Math.round(p[1]/tot*100)}%"></i>`).join("")}</div>
    <div class="clg">${parts.map(p=>`<span><i style="background:${p[2]}"></i>${p[0]} ${Math.round(p[1]/tot*100)}%</span>`).join("")}</div>
    <div class="igv dim">약 ${Math.max(1,Math.round(len(d.full_text)/900))}분 · 부록 ${sd.subs.length}건 · 참조 항목 ${refs}건</div></div>`;
  return `<section class="igx" aria-label="문서 한눈에 보기">${diff}${clr}${comp}</section>`;
}

/* 도넛 차트 (conic-gradient) */
function donut(rows, label){
  const tot=rows.reduce((a,r)=>a+r.n,0)||1; let acc=0;
  const stops=rows.map(r=>{const a=acc/tot*360, b=(acc+=r.n)/tot*360; return `${r.color} ${a}deg ${b}deg`}).join(",");
  return `<div class="donut" role="img" aria-label="${esc(label)}: ${rows.map(r=>`${FMT_TXT(r.label).trim()} ${r.n}`).join(", ")}" style="background:conic-gradient(${stops})"><div><b>${tot.toLocaleString()}</b><span>${esc(label)}</span></div></div>`;
}
/* 요구 인가 등급별 문서 수와 내 열람 범위 */
function levelReach(){
  const docs=Object.values(SCP), N=docs.length, c={};
  docs.forEach(d=>{const n=reqLevel(d.object_class); c[n]=(c[n]||0)+1});
  const ok=docs.filter(d=>reqLevel(d.object_class)<=lvlFor(d.id)).length;
  return `<div class="reach"><div class="rbar">${[1,2,3,4].filter(n=>c[n]).map(n=>`<i class="${n<=S.level?"in":""}" style="flex:${c[n]};--lc:${LV_COLOR(n)}" title="Level ${n} 필요 ${c[n]}건"><span>L${n}</span></i>`).join("")}</div>
    <div class="clg">${[1,2,3,4].filter(n=>c[n]).map(n=>`<span><i style="background:${LV_COLOR(n)}"></i>Level ${n} ${LVL_TAG[n][0]} ${c[n].toLocaleString()}건</span>`).join("")}</div>
    <p style="margin-top:8px">내 등급(Level ${S.level})으로 <b class="hi">${ok.toLocaleString()}건</b>, 전체의 <b class="amber">${pct(ok,N)}%</b>를 열람할 수 있습니다. <span class="dim2">흐린 부분은 등급이 부족한 문서입니다.</span></p></div>`;
}

/* 규정집 문서 머리에 붙는 도표 */
const REG_IG={
  "security-clearance-levels":()=>`<div class="regig"><h4 class="clrh">보안 인가 등급 한눈에 보기</h4>${clrPyramid(S.level)}<h4 class="clrh">인원 계급 한눈에 보기</h4>${classLadder(userClass(S.user))}</div>`,
  "object-classes":()=>`<div class="regig">${lockBox()}</div>`,
};
