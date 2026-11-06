/* ════════════════════════════════════════════
   사내 설문 — 진행 중 · 마감 설문, 응답 후 결과(막대)
   응답: store "sv_<user>" = {설문id: {질문idx: 값}}
   결과 = 고정된 기존 응답 수 + 내 응답
   ════════════════════════════════════════════ */
// 질문: [종류(one|multi|scale|text), 질문, 보기, 기존 응답 수(보기별)]
const SURVEYS=[
 {id:"caf",title:"카페테리아 A 11월 메뉴 만족도 조사",dept:"복리후생팀",end:10,n:212,qs:[
   ["scale","전반적인 식사 만족도",["매우 불만","불만","보통","만족","매우 만족"],[9,21,74,81,27]],
   ["one","가장 개선이 필요한 부분",["메뉴 다양성","맛","양","배식 시간","위생"],[71,38,22,64,17]],
   ["multi","추가되었으면 하는 메뉴 (복수 선택)",["샐러드 바","면 요리","야간 간편식","채식 메뉴","디저트"],[88,97,121,34,59]],
   ["text","기타 의견",[],[]]]},
 {id:"ws",title:"2027년 상반기 부서 워크숍 장소 선호도",dept:"인사관리과",end:4,n:148,qs:[
   ["one","선호하는 워크숍 형태",["1일 외부 연수원","1박 2일 리조트","기지 내 세미나","온라인"],[41,63,29,15]],
   ["one","선호 시기",["3월","4월","5월","6월"],[12,58,61,17]]]},
 {id:"club",title:"사내 동호회 신설 수요 조사",dept:"복리후생팀",end:12,n:96,qs:[
   ["multi","참여하고 싶은 동호회 (복수 선택)",["독서","보드게임","러닝","사진","요리","바둑"],[31,44,37,19,22,9]],
   ["one","선호 활동 시간",["점심시간","퇴근 후","주말"],[38,47,11]]]},
 {id:"term",title:"SCiPNET 단말 사용성 설문",dept:"전산팀",end:7,n:301,qs:[
   ["scale","단말 화면이 읽기 편하십니까?",["전혀","아니다","보통","그렇다","매우"],[14,38,102,111,36]],
   ["one","가장 자주 쓰는 메뉴",["격리 데이터베이스","메일","전자결재","게시판","일정"],[142,61,39,33,26]],
   ["text","불편한 점이나 바라는 기능",[],[]]]},
 {id:"sec26",title:"2026년 하반기 정보보안 교육 만족도",dept:"RAISA",end:-5,n:388,qs:[
   ["scale","교육 내용이 업무에 도움이 되었습니까?",["전혀","아니다","보통","그렇다","매우"],[11,29,140,152,56]],
   ["one","교육 방식 선호",["온라인","집합 교육","혼합"],[231,58,99]]]},
];
const svKey=()=>"sv_"+S.user, svAns=()=>store.get(svKey(),{});
const svEnd=s=>daysAgo(-s.end), svOpen=s=>s.end>=0;
function survey(qs){
  const id=qs&&qs.get("id"); if(id) return svDoc(id);
  const A=svAns();
  const card=s=>`<a class="card svcard ${svOpen(s)?"":"closed"}" href="#survey?id=${s.id}"><span class="svst ${svOpen(s)?(A[s.id]?"done":"open"):"end"}">${svOpen(s)?(A[s.id]?"참여 완료":"진행 중"):"마감"}</span><b>${esc(s.title)}</b><span class="dim2">${s.dept} · ${s.qs.length}문항 · 응답 ${s.n+(A[s.id]?1:0)}명</span><span class="dim2">${svOpen(s)?`마감 ${svEnd(s)} (D-${s.end})`:`${svEnd(s)} 마감`}</span></a>`;
  return `<h2 class="ph">사내 <span>설문</span></h2>
  <h4 class="svh">진행 중</h4><div class="svgrid">${SURVEYS.filter(svOpen).map(card).join("")}</div>
  <h4 class="svh">마감</h4><div class="svgrid">${SURVEYS.filter(s=>!svOpen(s)).map(card).join("")}</div>`;
}
function svCounts(s, qi){
  const q=s.qs[qi], mine=(svAns()[s.id]||{})[qi], c=q[3].slice();
  if(mine!=null && q[0]!=="text") (Array.isArray(mine)?mine:[mine]).forEach(v=>c[+v]=(c[+v]||0)+1);
  return c;
}
function svDoc(id){
  const s=SURVEYS.find(x=>x.id===id); if(!s) return `<a class="back" href="#survey">← 설문 목록</a><div class="empty">없는 설문입니다.</div>`;
  const my=svAns()[s.id], show=my||!svOpen(s);
  const head=`<a class="back" href="#survey">← 설문 목록</a><div class="adoc"><div class="dim2" style="font-size:11px">${s.dept} · ${svOpen(s)?`마감 ${svEnd(s)}`:"마감됨"} · 응답 ${s.n+(my?1:0)}명 · 익명</div><h3 class="svtitle">${esc(s.title)}</h3>`;
  if(show) return head+s.qs.map((q,qi)=>{
    if(q[0]==="text") return `<div class="svq"><b>${qi+1}. ${esc(q[1])}</b><div class="dim" style="margin-top:6px">${my&&my[qi]?`내 응답: “${esc(my[qi])}”`:'<span class="dim2">주관식 응답은 담당 부서만 볼 수 있습니다.</span>'}</div></div>`;
    const c=svCounts(s,qi), tot=c.reduce((a,b)=>a+b,0)||1, mx=Math.max(...c), mine=my?[].concat(my[qi]??[]).map(Number):[];
    return `<div class="svq"><b>${qi+1}. ${esc(q[1])}</b>${q[2].map((o,oi)=>`<div class="svr ${mine.includes(oi)?"me":""}"><span>${esc(o)}${mine.includes(oi)?' <small class="amber">내 선택</small>':""}</span><span class="svbar"><i style="width:${(c[oi]/mx*100).toFixed(1)}%"></i></span><span class="dim">${Math.round(c[oi]/tot*100)}% <small class="dim2">${c[oi]}</small></span></div>`).join("")}
      ${q[0]==="scale"?`<div class="dim2" style="font-size:11px;margin-top:4px">평균 ${(c.reduce((a,v,i)=>a+v*(i+1),0)/tot).toFixed(2)} / 5</div>`:""}</div>`}).join("")+`${my&&svOpen(s)?`<p class="dim2" style="font-size:11px;margin-top:12px">참여해 주셔서 감사합니다. 결과는 마감 후 확정됩니다.</p>`:""}</div>`;
  return head+`<form data-sv="${s.id}">${s.qs.map((q,qi)=>`<fieldset class="svq"><legend><b>${qi+1}. ${esc(q[1])}</b>${q[0]==="text"?' <span class="dim2">(선택)</span>':""}</legend>
    ${q[0]==="text"?`<textarea name="q${qi}" rows="3" maxlength="300" class="svtext"></textarea>`
     :q[0]==="scale"?`<div class="svscale">${q[2].map((o,oi)=>`<label><input type="radio" name="q${qi}" value="${oi}" required><span>${oi+1}</span><small>${esc(o)}</small></label>`).join("")}</div>`
     :q[2].map((o,oi)=>`<label class="chk"><input type="${q[0]==="multi"?"checkbox":"radio"}" name="q${qi}" value="${oi}" ${q[0]==="one"?"required":""}> ${esc(o)}</label>`).join("")}</fieldset>`).join("")}
    <div class="factions" style="justify-content:flex-start"><button class="btn primary" type="submit">제출</button><a class="btn" href="#survey">나중에</a></div></form></div>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-sv]"); if(!f) return; e.preventDefault();
  const s=SURVEYS.find(x=>x.id===f.dataset.sv), ans={};
  for(let qi=0;qi<s.qs.length;qi++){ const q=s.qs[qi], fd=new FormData(f).getAll("q"+qi);
    if(q[0]==="multi"){ if(!fd.length){ toast(`${qi+1}번 문항을 하나 이상 고르십시오.`,"danger"); return } ans[qi]=fd.map(Number) }
    else if(q[0]==="text") ans[qi]=(fd[0]||"").trim();
    else ans[qi]=+fd[0] }
  store.set(svKey(),{...svAns(),[s.id]:ans}); feedPush(`설문 참여 — ${S.user} · ${s.title.slice(0,16)}`,""); toast("응답이 제출되었습니다."); route();
});
