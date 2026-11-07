/* ════════════════════════════════════════════
   문서 종류별 공문서 양식
   격리 프로토콜 · 실험 기록지 · 면담 기록서 · 사건 보고서 · 탐사 기록서 · 회수 보고서 · 내부 서신 · 부록
   종류마다 서식 번호, 결재란, 고정 기재 항목표, 본문 구획 이름, "이하 여백" 끝맺음을 같게 맞춘다.
   ════════════════════════════════════════════ */
/* 기재 항목: 키 → [표에 쓸 이름, 본문에서 찾을 이름들] */
const FORM_FIELDS={
  date:["일시",/^(실험 |면담 |사건 |탐사 |발생 |회수 |작성 |발신 )?(일자|날짜|일시|시각|일)$|^발신일$|^작성일$|^기간$/],
  who:["담당",/^(실험자|담당자|담당 연구원|책임 연구원|책임자|감독관|연구원|감독|면담자|면담관|질문자|탐사 책임자|작성자|보고자|발신자|발신)$/],
  subj:["대상",/^(피험자|실험 대상|대상|피면담자|면담 대상|면담 대상자|면담대상|응답자|수신자|수신)$/],
  place:["장소",/^(장소|위치|실험 장소|발생 장소|발견 장소|회수 장소|탐사 장소|격리 장소)$/],
  team:["인원",/^(탐사조|탐사 인원|탐사대|탐사자|참여 인원|관련 인원|투입 인원|투입 부대|대응 부대|목격자)$/],
  src:["출처",/^(출처|기록 출처|기록 매체|매체|형식)$/],
  title:["제목",/^(제목|건명)$/],
};
const FORMS={
  cp: {name:"특수 격리 절차서",code:"CP-F01",dept:"격리 관리부",body:"격리 절차",fields:[]},
  exp:{name:"실험 기록지",code:"RD-F02",dept:"연구부",body:"실험 내용",fields:[["date","실험 일자"],["who","실험자"],["subj","피험자"],["place","실험 장소"]]},
  itv:{name:"면담 기록서",code:"RD-F03",dept:"연구부",body:"면담 내용",fields:[["date","면담 일시"],["who","면담자"],["subj","피면담자"],["place","면담 장소"]]},
  inc:{name:"사건 보고서",code:"SE-F04",dept:"보안부",body:"사건 경위",fields:[["date","발생 일시"],["place","발생 장소"],["team","관련 인원"],["src","기록 출처"]]},
  exl:{name:"탐사 기록서",code:"MF-F05",dept:"기동특무부대 지원과",body:"탐사 경과",fields:[["date","탐사 일시"],["team","탐사 인원"],["place","탐사 장소"],["who","책임자"]]},
  rec:{name:"회수 보고서",code:"MF-F06",dept:"현장 요원 관리과",body:"회수 경위",fields:[["date","회수 일시"],["place","회수 장소"],["team","관련 인원"],["src","기록 출처"]]},
  cor:{name:"내부 서신",code:"AD-F07",dept:"총무과",body:"본문",fields:[["who","발신"],["subj","수신"],["date","발신일"],["title","제목"]]},
  add:{name:"부록 문서",code:"AD-F08",dept:"",body:"내용",fields:[]},
};
/* 제목을 먼저 보고, 애매하면 본문의 기재 항목으로 판단 */
function formKind(title, text=""){
  const t=String(title||"");
  if(/면담|인터뷰|심문|대담|녹취/.test(t)) return "itv";
  if(/실험|시험|테스트|시행/.test(t)) return "exp";
  if(/탐사|탐색|정찰/.test(t)) return "exl";
  if(/사건|사고|격리 (실패|위반)|탈주|침해|사태/.test(t)) return "inc";
  if(/회수|발견 경위|포획|확보/.test(t)) return "rec";
  if(/서신|편지|메모|이메일|메일|비망록|통신문|공문|각서|서한/.test(t)) return "cor";
  const head=String(text).split("\n").slice(0,40).map(l=>(l.match(/^\s*([^:：\n]{1,14}?)\s*[:：]/)||[])[1]).filter(Boolean);
  const has=re=>head.some(l=>re.test(l.trim()));
  if(has(/^(면담자|피면담자|면담 대상|면담관)$/)) return "itv";
  if(has(/^(피험자|실험자|실험 대상)$/) || head.filter(l=>/^(절차|결과|실험 결과|지시사항|투입|출력|분석)$/.test(l.trim())).length>=2) return "exp";
  if(has(/^(탐사조|탐사 인원|탐사대)$/)) return "exl";
  if(has(/^(수신자|발신자|수신|발신)$/)) return "cor";
  return "add";
}
const fieldKey=lab=>{ for(const k in FORM_FIELDS) if(FORM_FIELDS[k][1].test(lab)) return k; return "" };
/* 본문 첫머리의 "항목: 값" 줄을 떼어 내 기재 항목표로 옮김 (대화가 시작되면 멈춤) */
function pullFields(lines, kind, keep=false){
  const want=new Set(FORMS[kind].fields.map(f=>f[0])), got={}, rest=[]; let open=true, seen=0;
  for(const l of lines){
    const t=l.trim();
    if(open && isBlankTxt(t)){ rest.push(l); continue }
    if(open && seen<14){
      const sp=fmtSpeaker(t), k=sp?fieldKey(FMT_TXT(sp[0]).trim()):"";
      if(k && want.has(k) && !got[k] && FMT_TXT(sp[1]).length<=80){ got[k]=sp[1]; seen++; if(!keep) continue }
      /* 첫 줄이 서두 문장이면 한 번은 넘어감 */
      if(!sp && seen===0 && rest.filter(x=>!isBlankTxt(x)).length===0){ rest.push(l); continue }
      if(!sp) open=false; else seen++;
    }
    rest.push(l);
  }
  return {got, rest};
}
/* 결재란: 담당 · 검토 · 승인 (도장) */
function signBox(d, kind, who, key){
  const nm=FMT_TXT(who||"").replace(/\s*(박사|연구원|요원|부장|과장|관리관|감독관|기술자|대원|조사관|교수|씨|님)$/,"").replace(/x/g,"").trim();
  const st=(nm && !/█/.test(nm) && nm.length<=4)?nm:"";
  const day=srnd(key+"sd",1,28), base=revDate(d.id).slice(0,8);
  const cell=(role,stamp,cls,dd)=>`<div class="sg"><span class="sgr">${role}</span><span class="seal ${cls}">${stamp}</span><span class="sgd">${dd}</span></div>`;
  return `<div class="signs" aria-label="결재란"><span class="sgh">결<br>재</span>
    ${cell("담당",esc(st||"인"),st?"":"blank",base+pad(day))}
    ${cell("검토","검토",""  ,base+pad(Math.min(28,day+1)))}
    ${cell("승인","승인","ok",base+pad(Math.min(28,day+2)))}</div>`;
}
/* 서식 머리: 서식 번호 · 양식 이름 · 결재란 · 기재 항목표 */
function formHead(d, kind, {key="", no="", got={}, extra=[]}={}){
  const F=FORMS[kind];
  const val=v=>v?v:`<span class="fnil">기재 없음</span>`;
  /* 기재 항목을 하나도 찾지 못한 문서(비고만 있는 부록 등)는 빈 칸 줄을 늘어놓지 않음 */
  const any=F.fields.some(([k])=>got[k]);
  const cells=[...extra, ...(any?F.fields.map(([k,lab])=>[lab,val(got[k])]):[])];
  const rows=[]; for(let i=0;i<cells.length;i+=2) rows.push(cells.slice(i,i+2));
  return `<div class="fhead f-${kind}">
    <div class="fh1"><div class="fname"><span class="fcode">서식 ${F.code}${F.dept?` · ${esc(F.dept)}`:""}</span><b>${F.name}</b>${no?`<span class="fno">${no}</span>`:""}</div>${signBox(d,kind,got.who,d.id+key)}</div>
    ${rows.length?`<table class="ftab">${rows.map(r=>`<tr>${r.map(([h,v])=>`<th>${h}</th><td>${v}</td>`).join("")}${r.length<2?"<th></th><td></td>":""}</tr>`).join("")}</table>`:""}
  </div>`;
}
const formEnd=kind=>`<div class="fend"><span>— 이하 여백 —</span><small>본 문서는 SCP 재단 문서 관리 규정에 따라 서식 ${FORMS[kind].code} (${FORMS[kind].name})으로 작성되었습니다 · 보존 기간 영구</small></div>`;

/* 실험 기록: "실험 1", "실험 기록 914-02" 같은 줄로 회차를 나눔 */
const TRIAL_HEAD=/^(실험|시험|테스트|시행|실험 기록|실험 번호|실험 로그)\s*(번호\s*)?[#№]?\s*[0-9A-Za-z가-힣][\w\-–.·/]{0,24}\s*[:：]?$/;
const TRIAL_ORDER=[
  ["일자",/^(실험 )?(일자|날짜|일시|시각)$/],["실험자",/^(실험자|담당자|담당 연구원|책임 연구원|연구원|감독관|감독|책임자)$/],
  ["피험자",/^(피험자|실험 대상|대상|대상물|투입 대상)$/],["준비",/^(지급 물품|투입|입력|준비물|장비|물품|설정|조건|사용 물품|투입물)$/],
  ["절차",/^(절차|지시사항|지시 사항|실험 절차|방법|실험 방법|내용|실험 내용)$/],["결과",/^(결과|실험 결과|출력|관찰|관찰 결과|산출물)$/],
  ["분석",/^(분석|비고|주석|결론|참고|메모|추가 사항|노트|추가 기록)$/],
];
const trialLab=lab=>{ const r=TRIAL_ORDER.find(([,re])=>re.test(lab)); return r?r[0]:"" };
/* 한 회차: 항목 줄은 고정 순서의 표로, 이어지는 줄은 앞 항목에 붙이고, 나머지는 서식 본문으로 */
function trialCard(head, lines, n){
  const rows=[], free=[]; let last=null;
  for(const l of lines){
    const t=l.trim(); if(isBlankTxt(t)){ last=null; continue }
    const sp=fmtSpeaker(t), lab=sp?trialLab(FMT_TXT(sp[0]).trim()):"";
    if(lab){ last={lab, raw:FMT_TXT(sp[0]).trim(), v:[sp[1]]}; rows.push(last); continue }
    if(last && !free.length && !sp) { last.v.push(t); continue }
    free.push(l); last=null;
  }
  if(rows.length<2) return null;
  rows.sort((a,b)=>TRIAL_ORDER.findIndex(x=>x[0]===a.lab)-TRIAL_ORDER.findIndex(x=>x[0]===b.lab));
  return `<div class="trial"><div class="trh"><span class="trn">${pad(n)}</span><b>${head||"기록 내용"}</b></div>
    <table class="ftab trt">${rows.map(r=>`<tr><th>${esc(r.raw)}</th><td>${fmtStage(r.v.join("<br>"))}</td></tr>`).join("")}</table>
    ${free.length?`<div class="trf">${fmtBody(free.join("\n"))}</div>`:""}</div>`;
}
function trialsBody(lines){
  const parts=[]; let cur={head:"",lines:[]};
  for(const l of lines){ const t=FMT_TXT(l).trim();
    if(TRIAL_HEAD.test(t) && t.length<=40){ parts.push(cur); cur={head:l.trim().replace(/\s*[:：]\s*$/,""),lines:[]}; continue }
    cur.lines.push(l) }
  parts.push(cur);
  let n=0, out=[], cards=0;
  for(const p of parts){
    if(!p.head && !p.lines.some(l=>!isBlankTxt(l))) continue;
    const c=trialCard(p.head,p.lines,n+1);
    if(c){ n++; cards++; out.push(c) } else out.push((p.head?`<h5 class="bh">${p.head}</h5>`:"")+fmtBody(p.lines.join("\n")));
  }
  return cards?out.join(""):null;
}

/* 부록(하위 문서)을 종류별 양식으로: 머리 + 본문 구획 + 끝맺음 */
function subForm(d, s, html){
  const kind=formKind(s.title, s.text);
  const lines=html.replace(/\r/g,"").split("\n");
  /* 회차가 여럿인 실험 기록은 첫 회차 항목을 머리에 보여 주되 본문에서 떼지 않음 */
  const multi=kind==="exp" && lines.filter(l=>TRIAL_HEAD.test(FMT_TXT(l).trim())).length>=2;
  const {got, rest}=pullFields(lines, kind, multi);
  const tm=s.title.match(/([0-9A-Za-z][\w]*(?:[-–.][\w]+)+)\s*:?\s*$/);
  const extra=[["대상 항목",`<b class="hi">${d.id}</b>`],["문서 번호",`${docNo(d)}-${pad(s.idx+1)}`]];
  if(kind==="add") extra.push(["구분",esc(s.title.length>40?s.title.slice(0,40)+"…":s.title)]);
  if(kind==="itv" && (!got.who || !got.subj)) guessSpeakers(rest, got);
  const body=(kind==="exp"&&trialsBody(rest))||fmtBody(rest.join("\n"));
  return `${formHead(d,kind,{key:s.title,no:tm?esc(tm[1]):"",got,extra})}
  <div class="sec"><h4 class="subt"><i>${FORMS[kind].body}</i> ${esc(s.title)}</h4><div class="body fmt">${body}</div></div>
  ${formEnd(kind)}`;
}
/* 면담 기록에 면담자·피면담자 칸이 없으면 녹취의 화자 둘로 채움 (재단 쪽 직함이 붙은 쪽이 면담자) */
function guessSpeakers(lines, got){
  const cnt={}, html={};
  for(const l of lines){ const sp=fmtSpeaker(l.trim()); if(!sp) continue; const k=FMT_TXT(sp[0]).trim(); cnt[k]=(cnt[k]||0)+1; html[k]=sp[0] }
  const top=Object.keys(cnt).filter(k=>cnt[k]>=2).sort((a,b)=>cnt[b]-cnt[a]).slice(0,2);
  if(top.length<2) return;
  const staff=k=>/(박사|연구원|요원|관리관|감독관|부장|과장|조사관|면담관|대원|교수|O5|사령관|기지장)/.test(k);
  const [w,o]=staff(top[1])&&!staff(top[0])?[top[1],top[0]]:[top[0],top[1]];
  if(!got.who) got.who=html[w]; if(!got.subj) got.subj=html[o];
}
/* 본 문서(격리 프로토콜) 머리: 서식 번호 · 결재란만 (기재 항목은 표지에 있음) */
const cpHead=d=>formHead(d,"cp",{key:"cp",no:docNo(d)});
