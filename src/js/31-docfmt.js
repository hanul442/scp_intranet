/* ════════════════════════════════════════════
   문서 본문 서식 — 평문 본문을 구조화된 블록으로
   문단 · 기록(녹취록) 상자 · 화자 줄 · 목록 · 소제목 · 비고 상자 · 항목:값 표
   입력은 이미 이스케이프·검열·링크 처리된 HTML (줄 단위 구조 유지)
   ════════════════════════════════════════════ */
const FMT_TXT=h=>h.replace(/<[^>]+>/g,"").replace(/&[a-z]+;|&#\d+;/g,"x");
const LOG_OPEN=/^&lt;\s*([^&]{0,40}?)(기록|녹음|녹취|영상|로그|면담|실험|통신|전송|재생)?\s*([^&]{0,20}?)(시작|개시)\s*([^&]{0,40})&gt;$/;
const LOG_CLOSE=/^&lt;\s*([^&]{0,40}?)(종료|끝|중단|두절|중지)\s*([^&]{0,30})&gt;$/;
const NOTE_RE=/^(비고|참고|주의|경고|노트|주석|추신|메모|알림|공지)\s*[:：]\s*/;
const SUBHEAD_RE=/^(부록|첨부|문서|실험|사건|면담|탐사|회수|보고서?|기록|로그|추가|개요|요약|결론|결과|분석|배경|이력|목록|녹취록|녹음 기록|영상 기록|면담 기록)\b/;
/* "이름: 내용" — 이름은 짧고 문장 부호가 없어야 함 */
function fmtSpeaker(line){
  const m=line.match(/^((?:<span[^>]*>[^<]*<\/span>|<a[^>]*>[^<]*<\/a>|[^:：<.!?。]){1,60}?)\s*[:：]\s+(.+)$/);
  if(!m) return null;
  const lab=FMT_TXT(m[1]).trim();
  if(!lab || lab.length>22 || /[.!?,]$/.test(lab) || /^\d+$/.test(lab) || /^(https?|일련번호|등급)$/.test(lab)) return null;
  return [m[1].trim(), m[2]];
}
const fmtStage=s=>s.replace(/(^|[^\w>])\(([^()<>]{1,120})\)/g,'$1<span class="stage">($2)</span>')
  .replace(/\[(?!데이터 말소|편집됨|검열됨|삭제됨)([^\[\]<>]{1,120})\]/g,'<span class="stage">[$1]</span>');

function fmtBody(html){
  const lines=html.replace(/\r/g,"").split("\n");
  const items=[]; let i=0;
  while(i<lines.length){
    const t=lines[i].trim();
    if(isBlankTxt(t)){ i++; continue }
    /* 기록 상자: <기록 시작> … <기록 종료> */
    if(LOG_OPEN.test(t)){
      const body=[]; let j=i+1, closed="";
      while(j<lines.length){ const u=lines[j].trim(); if(LOG_CLOSE.test(u)){ closed=u; break } if(LOG_OPEN.test(u)) { j--; break } body.push(u); j++ }
      items.push({html:`<div class="logbox"><div class="loghd">${t}</div>${fmtLogLines(body)}${closed?`<div class="loghd end">${closed}</div>`:""}</div>`});
      i=j+1; continue;
    }
    const para=[]; while(i<lines.length && !isBlankTxt(lines[i]) && !(para.length&&LOG_OPEN.test(lines[i].trim()))){ para.push(lines[i].trim()); i++ }
    items.push({para, sp:para.length===1?fmtSpeaker(para[0]):null});
  }
  /* 한 줄짜리 "이름: 내용" 문단이 이어지면 묶음: 같은 이름이 반복되면 대화, 아니면 항목표 */
  const out=[], NUM=/^(\d{1,3})\s*[.:)]\s+/;
  for(let k=0;k<items.length;){
    /* 한 줄짜리 번호 문단이 이어지면 번호 목록 */
    if(items[k].para&&items[k].para.length===1&&NUM.test(FMT_TXT(items[k].para[0]))){
      let e=k; while(e<items.length&&items[e].para&&items[e].para.length===1&&NUM.test(FMT_TXT(items[e].para[0]))) e++;
      if(e-k>=2){ out.push(`<ol class="fl">${items.slice(k,e).map(r=>{const l=r.para[0],m=l.match(/^(\d{1,3})\s*[.:)]\s+/);return `<li><span class="ln">${m?m[1]:""}</span><span>${l.replace(/^\d{1,3}\s*[.:)]\s+/,"")}</span></li>`}).join("")}</ol>`); k=e; continue }
    }
    if(!items[k].sp){ out.push(items[k].html||fmtPara(items[k].para)); k++; continue }
    let e=k; while(e<items.length && items[e].sp) e++;
    const run=items.slice(k,e), labs=run.map(r=>FMT_TXT(r.sp[0]).trim());
    const repeats=labs.length!==new Set(labs).size;
    /* 실험·면담 기록처럼 정해진 기재 항목(일자·피험자·절차·결과…)이 이어지면 서식 표로 */
    const known=labs.filter(l=>trialLab(l)||fieldKey(l)).length;
    if(!repeats && run.length>=2 && known>=2 && known*3>=run.length*2){ out.push(`<table class="ftab kvf">${run.map(r=>`<tr><th>${r.sp[0]}</th><td>${fmtStage(r.sp[1])}</td></tr>`).join("")}</table>`); k=e; continue }
    if((run.length>=3 && repeats) || (run.length>=2 && looksSaid(run.map(r=>r.sp[1])))) out.push(dlg(run.map(r=>r.sp)));
    else if(run.every(r=>FMT_TXT(r.sp[1]).length<=60) && !looksSaid(run.map(r=>r.sp[1]))) out.push(`<dl class="kvb">${run.map(r=>`<dt>${r.sp[0]}</dt><dd>${r.sp[1]}</dd>`).join("")}</dl>`);
    else run.forEach(r=>out.push(fmtPara(r.para)));
    k=e;
  }
  return out.join("");
}
/* 기록 안의 줄: 화자 줄은 2열, 나머지는 지문 */
function fmtLogLines(ls){
  const rows=ls.filter(l=>!isBlankTxt(l)).map(l=>{
    const sp=fmtSpeaker(l);
    if(sp) return `<div class="lr"><b class="who">${sp[0]}</b><span class="say">${fmtStage(sp[1])}</span></div>`;
    return `<div class="lr dir">${fmtStage(l)}</div>`;
  });
  return `<div class="logbd">${rows.join("")}</div>`;
}
const isBlankTxt=l=>!FMT_TXT(l).trim();
/* 값이 대부분 문장(마침표·물음표 등으로 끝남)이면 대화, 아니면 항목표 */
const looksSaid=vs=>vs.filter(v=>/[.?!…~"'」』)\]]\s*$/.test(FMT_TXT(v).trim())).length*2>vs.length;
const dlg=rows=>`<div class="logbox bare"><div class="logbd">${rows.map(([w,v])=>`<div class="lr"><b class="who">${w}</b><span class="say">${fmtStage(v)}</span></div>`).join("")}</div></div>`;
function fmtPara(p){
  const txt=p.map(FMT_TXT), one=p.length===1, L=txt[0].trim();
  /* == 3등급 인가 필요 == 같은 구획 표시 */
  if(one && /^={2,}\s*.+?\s*={2,}$/.test(L)) return `<div class="divbar"><span>${p[0].replace(/^={2,}\s*|\s*={2,}$/g,"")}</span></div>`;
  /* 인용 블록 */
  if(p.every(l=>/^<span class="quote">/.test(l))) return `<blockquote class="bq">${p.map(l=>l.replace(/^<span class="quote">|<\/span>$/g,"")).join("<br>")}</blockquote>`;
  /* 이미지 자리 */
  if(one && /^<span class="img">/.test(p[0])) return `<figure class="fig">${p[0]}</figure>`;
  /* 비고 상자 */
  if(NOTE_RE.test(L) && FMT_TXT(p.join(" ")).replace(NOTE_RE,"").trim()){ const k=L.match(NOTE_RE)[1]; return `<div class="callout ${/주의|경고/.test(k)?"warn":""}"><b>${k}</b>${p.join("<br>").replace(/^[^:：]*[:：]\s*/,"")}</div>` }
  /* 목록 */
  const num=/^(\d{1,3}|[a-zA-Z]|[가-하])\s*[.:)]\s+/, dot=/^([·•\-*–]|•)\s+/;
  if(p.length>=2 && txt.every(l=>num.test(l))) return `<ol class="fl">${p.map(l=>{const m=l.match(/^(\S{1,4}?)\s*[.:)]\s+/);return `<li><span class="ln">${m?m[1]:""}</span><span>${l.replace(/^\S{1,4}?\s*[.:)]\s+/,"")}</span></li>`}).join("")}</ol>`;
  if(txt.every(l=>dot.test(l))) return `<ul class="fl">${p.map(l=>`<li>${l.replace(dot,"")}</li>`).join("")}</ul>`;
  /* 소제목: 짧은 한 줄, 문장으로 끝나지 않음 */
  if(one && L.length<=48 && !/(다|요|음|함|됨)[.]?$/.test(L.replace(/[:：]$/,"")) && (/[:：]$/.test(L) || SUBHEAD_RE.test(L)) && !fmtSpeaker(p[0])?.[1]?.length)
    return `<h5 class="bh">${p[0].replace(/\s*[:：]\s*$/,"")}</h5>`;
  /* 항목:값 묶음 (면담자: …, 피면담자: …) — 줄마다 짧은 값 */
  const sps=p.map(fmtSpeaker);
  if(sps.every(s=>s && FMT_TXT(s[1]).length<=90) && !looksSaid(sps.map(s=>s[1])) && (p.length>=2 || FMT_TXT(sps[0][1]).length<=60))
    return `<dl class="kvb">${sps.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  /* 대화가 섞인 문단 (기록 표시 없이 화자 줄이 이어지는 경우) */
  if(p.length>=2 && sps.filter(Boolean).length>=Math.ceil(p.length*0.6))
    return `<div class="logbox bare"><div class="logbd">${p.map((l,k)=>sps[k]?`<div class="lr"><b class="who">${sps[k][0]}</b><span class="say">${fmtStage(sps[k][1])}</span></div>`:`<div class="lr dir">${fmtStage(l)}</div>`).join("")}</div></div>`;
  return `<p>${p.join("<br>")}</p>`;
}
