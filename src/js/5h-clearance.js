/* ════════════════════════════════════════════
   보안 인가 등급 · 인원 계급 · 직함 — 규정집(RULES, 5g-regs.js)의 정식 규정을 화면 곳곳에 적용
   상단 등급 표시 클릭 → 내 인가 카드 / 문서 접근 거부 시 해당 등급 규정 / 조직도 인가·계급
   ════════════════════════════════════════════ */
/* 규정 본문을 문장 단위로: [무엇에 접근하는 등급인가, 누구에게 부여되는가] */
function clrBrief(n){
  const s=typeof clearanceInfo==="function"&&clearanceInfo(n); if(!s) return {what:"",who:""};
  const ss=s.body.split(/(?<=다\.)\s+/);
  return {what:ss[0]||"", who:ss.find(x=>/부여/.test(x))||ss[1]||""};
}
function clsBrief(c){
  const s=typeof personnelClassInfo==="function"&&personnelClassInfo(c); if(!s) return "";
  return s.body.split(/(?<=다\.)\s+/)[0]||"";
}
const NEED_TO_KNOW="인가 등급이 있다고 해서 그 등급의 모든 정보에 접근할 수 있는 것은 아닙니다. 재단 인원은 업무상 \"알 필요가 있는\"(need-to-know) 정보에만 접근할 수 있으며, 부서별 정보공개 담당관의 재량을 따릅니다.";
const lvLabel=n=>`Level ${n} · ${(LVL_TAG[n]||LVL_TAG[4])[0]} <span class="dim2">(${LVL_EN[n]||""})</span>`;

/* 문서 접근 거부 화면에 붙는 규정 안내 */
function clrNeedNote(need){
  const b=clrBrief(need);
  return `<div class="clrnote"><b>보안 인가 ${need}등급 규정</b> ${lvLabel(need)}
    <p>${esc(b.what)}</p>${b.who?`<p class="dim">${esc(b.who)}</p>`:""}
    <p class="dim2">현재 귀하는 Level ${S.level} (${(LVL_TAG[S.level]||LVL_TAG[1])[0]}) · ${userClass(S.user)}계급입니다. ${NEED_TO_KNOW} <a class="xref" href="#regs">규정집 보기</a></p></div>`;
}

/* 내 보안 인가 카드 (상단 등급 표시를 누르면) */
function showMyClearance(){
  const n=S.level, c=userClass(S.user), b=clrBrief(n);
  modal({title:"보안 인가 · 인원 계급",cls:"wide",html:`
    <div class="clrcard"><div class="clrlv l${Math.min(5,Math.max(1,n))}">${n}</div><div><b class="hi" style="font-size:15px">${esc(S.user)}</b><div>${lvLabel(n)} · ${c}계급</div></div></div>
    <h4 class="clrh">보안 인가 ${n}등급</h4><p>${esc(b.what)}</p>${b.who?`<p class="dim">${esc(b.who)}</p>`:""}
    <h4 class="clrh">${c}계급</h4><p>${esc(clsBrief(c))}</p>
    <h4 class="clrh">알 필요 원칙</h4><p class="dim">${NEED_TO_KNOW}</p>
    <h4 class="clrh">등급 체계</h4>${clrPyramid(n)}
    <h4 class="clrh">인원 계급 체계</h4>${classLadder(c)}`,
    buttons:[{label:"규정집 열기",act:x=>{x();go("#regs")}},{label:"닫기",primary:true,act:x=>x()}]});
}
document.addEventListener("click",e=>{ if(e.target.closest("#lvl")) showMyClearance() });

/* 조직도: 직원별 보안 인가 등급 · 인원 계급 · 재단 표준 직함 */
const STAFF_CLR={
 "A-19-0001":[4,"A","기지 이사관"], "A-19-0007":[3,"B","행정직"],
 "R-19-1177":[3,"C","선임 연구원"], "R-19-0412":[2,"C","연구원"], "R-19-0893":[2,"C","격리 전문가"], "R-19-1530":[2,"C","연구원"], "R-19-1802":[2,"C","연구 조교"],
 "A-19-0120":[3,"C","보안담당관 (선임)"], "A-19-0051":[2,"C","보안담당관"], "A-19-0233":[2,"C","보안담당관"],
 "RA-07":[4,"B","정보공개 담당관"],
 "A-19-0310":[2,"B","행정직"], "A-19-0344":[1,"B","행정직"], "A-19-0402":[1,"C","격리 시설 기술자"], "A-19-0517":[1,"B","행정직"],
 "M-19-0021":[2,"C","의료 인원"], "M-19-0035":[2,"C","의료 인원"], "A-19-0620":[0,"B","행정직"],
};
const staffClr=id=>STAFF_CLR[id]||[1,"C","직원"];
const clrTag=id=>{const [n,c]=staffClr(id);return `<span class="lvtag ${(LVL_TAG[n]||LVL_TAG[1])[1]}" title="${LVL_EN[n]}">L${n} ${(LVL_TAG[n]||LVL_TAG[1])[0]}</span> <span class="ctag" title="${c}계급">${c}</span>`};
document.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ")&&e.target.id==="lvl"){ e.preventDefault(); showMyClearance() } });
