/* ════════════════════════════════════════════
   온라인 교육 — 과정 학습(차시) → 평가(80점 이상 이수) → 이수증
   기록: store "edu_<user>" = {과정id: {done:[차시], score, passed(ms)}}
   ════════════════════════════════════════════ */
const COURSES=[
 {id:"sec",title:"정보보안 기초",req:true,due:25,min:20,dept:"RAISA",lessons:[
   ["보안 등급의 이해","재단 보안 인가는 Level 0(공무 한정 사용)·1(신임)·2(제한)·3(비밀)·4(극비)·5(타우미엘)로 나뉩니다. 등급이 있어도 업무상 '알 필요가 있는' 정보만 열람할 수 있습니다.\n\n· 문서마다 요구 권한이 정해져 있고, 현재 권한보다 높은 문서는 열람할 수 없습니다.\n· 업무상 꼭 필요하면 전자결재로 한 단계 위 문서의 임시 열람(24시간)을 신청합니다.\n· 권한을 넘는 열람 시도는 모두 기록되며, 누적 3회면 검토 대상이 됩니다."],
   ["정보 반출 금지","· 문서 본문 복사, 화면 촬영, 외부 저장장치 사용은 금지입니다.\n· 모든 화면에는 열람자 식별번호가 워터마크로 표시됩니다.\n· 출력물은 사용 후 24시간 안에 파쇄합니다.\n· 보안 USB는 보안부에 업무 요청으로 신청합니다."],
   ["계정과 인증 코드","· 인증 코드는 90일마다 바꿉니다.\n· 최근 3회 안에 쓴 코드는 다시 쓸 수 없습니다.\n· 자리를 비울 때는 로그아웃하거나 화면을 잠급니다. 일정 시간 입력이 없으면 자동으로 로그아웃됩니다."]],
  quiz:[["보안 인가 3등급의 정식 명칭은?",["신임","제한","비밀","극비"],2],
        ["타 문서 임시 열람 승인은 최대 몇 시간 유효합니까?",["1시간","8시간","24시간","무기한"],2],
        ["권한을 넘는 열람 시도가 몇 회 누적되면 검토 대상이 됩니까?",["1회","3회","5회","10회"],1],
        ["출력물은 언제까지 파쇄해야 합니까?",["사용 후 24시간 안","일주일 안","퇴사 시","파쇄할 필요 없음"],0],
        ["인증 코드 변경 주기는?",["30일","60일","90일","1년"],2],
        ["보안 USB 신청 경로는?",["자유게시판","업무 요청(보안)","메일로 RAISA에","신청할 수 없음"],1]]},
 {id:"cls",title:"격리 등급 분류의 이해",req:true,due:40,min:15,dept:"격리 절차 위원회",lessons:[
   ["안전 · 유클리드 · 케테르","· 안전: 충분히 이해되어 신뢰성 있게 격리할 수 있는 개체. 위험하지 않다는 뜻은 아닙니다.\n· 유클리드: 충분히 이해되지 않았거나 예측할 수 없는 개체.\n· 케테르: 격리가 극도로 어렵거나 절차가 복잡한 개체."],
   ["그 밖의 등급","· 아폴리온: 격리할 수 없는 개체.\n· 타우미엘: 다른 개체를 격리하는 데 재단이 사용하는 개체.\n· 무효·해명: 변칙성을 잃었거나 과학적으로 설명된 개체."]],
  quiz:[["'안전' 등급의 뜻으로 맞는 것은?",["위험하지 않다","신뢰성 있게 격리할 수 있다","격리할 필요가 없다","폐기 예정이다"],1],
        ["예측할 수 없어 격리가 항상 확실하지는 않은 개체의 등급은?",["안전","유클리드","타우미엘","무효"],1],
        ["재단이 다른 개체 격리에 사용하는 개체의 등급은?",["케테르","아폴리온","타우미엘","해명"],2],
        ["케테르 등급 문서의 기본 요구 권한은?",["Level 1","Level 2","Level 3","Level 5"],2]]},
 {id:"priv",title:"개인정보 보호",req:true,due:60,min:10,dept:"인사관리과",lessons:[
   ["개인정보 열람 원칙","· 직원 연락처 등 개인정보는 업무상 필요할 때만 열람합니다.\n· 내선 번호를 볼 때는 열람 사유를 입력하며, 사유는 기록으로 남습니다.\n· 업무가 끝난 개인정보는 파기합니다."]],
  quiz:[["조직도에서 내선 번호를 보려면?",["그냥 보인다","열람 사유를 입력한다","팀장 승인이 필요하다","볼 수 없다"],1],
        ["개인정보 열람 사유는 어떻게 됩니까?",["저장되지 않는다","기록으로 남는다","본인에게만 보인다","24시간 후 삭제"],1],
        ["업무가 끝난 개인정보는?",["보관한다","파기한다","공유한다","출력해 둔다"],1]]},
 {id:"meme",title:"밈적 위해 대응 기초",req:false,due:null,min:15,dept:"연구부",lessons:[
   ["밈적 위해란","정보 자체가 보거나 들은 사람에게 영향을 주는 경우를 말합니다. 관련 문서에는 경고 문구가 먼저 표시됩니다."],
   ["대응 요령","· 경고 문구가 있는 문서는 업무상 필요할 때만 엽니다.\n· 이상 증상이 있으면 즉시 열람을 멈추고 의무실(4-0200)에 연락합니다.\n· 같은 문서를 반복해서 열지 않습니다."]],
  quiz:[["이상 증상이 생기면 가장 먼저 할 일은?",["끝까지 읽는다","열람을 멈추고 의무실에 연락","동료에게 보여 준다","다시 연다"],1],
        ["의무실 내선 번호는?",["4-0119","4-0200","4-1100","4-1500"],1]]},
];
const eduKey=()=>"edu_"+S.user, eduAll=()=>store.get(eduKey(),{});
const eduRec=id=>eduAll()[id]||{done:[]};
function eduSave(id,patch){ const A=eduAll(); A[id]={...eduRec(id),...patch}; store.set(eduKey(),A) }
function eduPct(c){ const r=eduRec(c.id); return r.passed?100:Math.round(r.done.length/(c.lessons.length+1)*100) }
function edu(qs){
  const id=qs&&qs.get("c"); if(id) return eduCourse(COURSES.find(c=>c.id===id), qs);
  const req=COURSES.filter(c=>c.req), doneReq=req.filter(c=>eduRec(c.id).passed).length;
  return `<h2 class="ph">온라인 <span>교육</span></h2>
  <div class="notice"><b class="${doneReq<req.length?"amber":"green"}">필수 교육 ${doneReq} / ${req.length} 이수</b> — ${doneReq<req.length?"미이수 시 인사 고과에 반영됩니다.":"올해 필수 교육을 모두 이수했습니다."}</div>
  <div class="edugrid">${COURSES.map(c=>{const r=eduRec(c.id), p=eduPct(c);return `<a class="card educard" href="#edu?c=${c.id}">
    <span class="svst ${r.passed?"done":c.req?"open":""}">${r.passed?"이수 완료":c.req?"필수":"선택"}</span><b>${esc(c.title)}</b>
    <span class="dim2">${c.dept} · ${c.lessons.length}차시 + 평가 · 약 ${c.min}분</span>
    <span class="svbar"><i style="width:${p}%"></i></span><span class="dim2">${r.passed?`${fmtDate(r.passed).slice(0,10)} 이수 · ${r.score}점`:`진도 ${p}%${c.due!=null?` · 마감 ${daysAgo(-c.due)}`:""}`}</span></a>`}).join("")}</div>`;
}
function eduCourse(c, qs){
  if(!c) return `<a class="back" href="#edu">← 교육 목록</a><div class="empty">없는 과정입니다.</div>`;
  const r=eduRec(c.id), step=qs.get("s"), L=c.lessons;
  const side=`<ol class="edusteps">${L.map(([t],i)=>`<li class="${r.done.includes(i)?"on":""} ${step==String(i)?"cur":""}"><a href="#edu?c=${c.id}&s=${i}">${i+1}. ${esc(t)}</a></li>`).join("")}<li class="${r.passed?"on":""} ${step==="q"?"cur":""}"><a href="#edu?c=${c.id}&s=q">평가</a></li></ol>`;
  const head=`<a class="back" href="#edu">← 교육 목록</a><h3 class="svtitle">${esc(c.title)} <span class="dim2" style="font-size:12px">${c.dept}</span></h3>`;
  if(step==null) return head+`<div class="eduwrap">${side}<div class="edumain"><p>${c.lessons.length}개 차시를 학습한 뒤 평가에서 80점 이상이면 이수됩니다.</p>
    ${r.passed?`<div class="notice"><b class="green">이수 완료</b> · ${fmtDate(r.passed)} · ${r.score}점 <button type="button" class="xref" data-cert="${c.id}">이수증 보기</button></div>`:""}
    <a class="btn primary" href="#edu?c=${c.id}&s=${r.done.length>=L.length?"q":Math.min(L.length-1,r.done.length)}">${r.done.length?"이어서 학습":"학습 시작"}</a></div></div>`;
  if(step==="q") return head+`<div class="eduwrap">${side}<div class="edumain">${r.done.length<L.length?`<div class="empty">모든 차시를 먼저 학습하십시오. (${r.done.length}/${L.length})</div>`:
    `<form data-quiz="${c.id}">${c.quiz.map(([q,opts],qi)=>`<fieldset class="svq"><legend><b>${qi+1}. ${esc(q)}</b></legend>${opts.map((o,oi)=>`<label class="chk"><input type="radio" name="q${qi}" value="${oi}" required> ${esc(o)}</label>`).join("")}</fieldset>`).join("")}
    <button class="btn primary" type="submit">제출</button></form>`}</div></div>`;
  const i=+step, ls=L[i]; if(!ls) return eduCourse(c,new URLSearchParams());
  if(!r.done.includes(i)) eduSave(c.id,{done:[...r.done,i]});
  return head+`<div class="eduwrap">${side}<div class="edumain"><div class="dim2" style="font-size:11px">${i+1} / ${L.length}차시</div><h4 class="edut">${esc(ls[0])}</h4><div class="pbody">${linkRefs(esc(ls[1]),"")}</div>
    <div class="pn"><span>${i>0?`<a href="#edu?c=${c.id}&s=${i-1}">← 이전 차시</a>`:""}</span><span>${i<L.length-1?`<a href="#edu?c=${c.id}&s=${i+1}">다음 차시 →</a>`:`<a href="#edu?c=${c.id}&s=q">평가 보기 →</a>`}</span></div></div></div>`;
}
document.addEventListener("submit",e=>{
  const f=e.target.closest("form[data-quiz]"); if(!f) return; e.preventDefault();
  const c=COURSES.find(x=>x.id===f.dataset.quiz), fd=new FormData(f);
  const right=c.quiz.filter(([,,a],qi)=>+fd.get("q"+qi)===a).length, score=Math.round(right/c.quiz.length*100), pass=score>=80;
  if(pass) eduSave(c.id,{score,passed:eduRec(c.id).passed||Date.now()});
  feedPush(`교육 평가 — ${S.user} · ${c.title} ${score}점`,pass?"":"amber");
  modal({title:pass?"이수 완료":"재응시 필요",html:`<p style="font-size:15px">${score}점 <span class="dim2">(${right}/${c.quiz.length})</span></p><p class="dim" style="margin-top:6px">${pass?"과정을 이수했습니다. 이수 기록은 인사 파일에 반영됩니다.":"80점 이상이어야 이수됩니다. 차시를 다시 확인하고 재응시하십시오."}</p>`,
    buttons:pass?[{label:"이수증 보기",act:x=>{x();showCert(c.id)}},{label:"목록으로",primary:true,act:x=>{x();go("#edu")}}]:[{label:"다시 풀기",primary:true,act:x=>{x();route()}}]});
});
function showCert(id){
  const c=COURSES.find(x=>x.id===id), r=eduRec(id); if(!r.passed) return;
  modal({title:"이수증",cls:"wide",html:`<div class="cert"><div class="certh">${EMBLEM}<b>SCP 재단 교육 이수증</b></div>
    <table class="kv"><tr><td class="dim2">증서 번호</td><td>EDU-${new Date(r.passed).getFullYear()}-${srnd(S.user+id,10000,99999)}</td></tr><tr><td class="dim2">이수자</td><td>${esc(S.user)}</td></tr>
    <tr><td class="dim2">과정</td><td>${esc(c.title)} (${c.min}분)</td></tr><tr><td class="dim2">점수</td><td>${r.score}점</td></tr><tr><td class="dim2">이수일</td><td>${fmtDate(r.passed).slice(0,10)}</td></tr></table>
    <p class="dim" style="margin-top:12px">위 사람은 위 과정을 이수하였음을 증명합니다.</p><p style="text-align:right;margin-top:10px">${esc(c.dept)}</p></div>`,
    buttons:[{label:"인쇄",act:()=>window.print()},{label:"닫기",primary:true,act:x=>x()}]});
}
document.addEventListener("click",e=>{ const b=e.target.closest("[data-cert]"); if(b) showCert(b.dataset.cert) });
