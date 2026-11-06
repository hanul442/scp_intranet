/* ════ 피드 ════ */
const FEED_T=[
 ()=>[`${pick(Object.keys(SCP))} 격리 상태 정상`,""],
 ()=>[`구역 ${rnd(1,12)} 온도 ${rnd(17,22)}.${rnd(0,9)}°C`,""],
 ()=>[`구역 7 센서 응답 지연 ${rnd(300,900)}ms`,"amber"],
 ()=>[`D-${rnd(1000,9999)} 격리실 ${pick(["173","682","106","049"])} 진입`,""],
 ()=>[`D-${rnd(1000,9999)} 격리실 ${pick(["173","682","106"])} 퇴장 — 인원 수 불일치`,"red"],
 ()=>[`기억소거제 B등급 ${rnd(1,4)}회분 불출`,""],
 ()=>[`스크랜턴 고정 장치 휴즈 ${(0.96+Math.random()*0.08).toFixed(2)}`,""],
 ()=>[`SCP-096 격리실 카메라 자동 차단 (${rnd(1,4)}초)`,"amber"],
 ()=>[`SCP-682 산성 용액 농도 ${rnd(88,99)}%`,""],
 ()=>[`SCP-173 격리실 — 긁는 소리 감지 (정상)`,""],
 ()=>[`복도 B-4 동작 감지 — 배정 인원 없음`,"red"],
 ()=>[`SCP-106 격리실 바닥 재질 변화 ${rnd(1,9)}%`,"amber"],
 ()=>[`SCP-999 격리실 — 웃음소리 (정상)`,""],
 ()=>[`${S.user||"UNKNOWN"} 로그인 — 중복 세션 감지`,"red"],
 ()=>[`SCP-049 격리실 — 대상 발화: "역병"`,"amber"],
 ()=>[`SCP-3008 입구 — 출입 기록 없음, 퇴장 기록 1건`,"red"],
 ()=>[`내부 전력 ${rnd(97,100)}% · 예비 발전기 대기`,""],
];
function feedPush(text,cls,ago=0){
  const f=$("#feed"); const el=document.createElement("div"); el.className=cls||""; const d=new Date(Date.now()-ago*1000); el.innerHTML=`<b>${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</b>${esc(text)}`;
  f.prepend(el); while(f.children.length>60) f.lastChild.remove();
}
function startFeed(returning){
  for(let i=8;i>0;i--){const [t,c]=pick(FEED_T)();feedPush(t,c,i*rnd(20,90))}
  if(returning) feedPush(`${S.user} 재접속 — 이전 세션 기록 ${S.recent.length}건 복원`,"hi");
  sessionLoop(()=>{ const [t,c]=pick(FEED_T)(); feedPush(t,c) }, ()=>rnd(2500,7000));
  sessionLoop(()=>{ $("#stats").innerHTML=`격리 무결성 <b>${(99.2+Math.random()*.7).toFixed(2)}%</b><br>활성 세션 <b>${rnd(38,61)}</b><br>미처리 경보 <b class="${rnd(0,1)?"amber":""}">${rnd(0,4)}</b><br>구역 7 센서 <b class="red">지연</b>` }, 4000);
}
function startClock(){ sessionLoop(()=>{ $("#clock").textContent=now() }, 1000) }

/* ════ 글리치 ════ */
function shake(){ if(!FX.on) return; document.body.classList.add("shake"); setTimeout(()=>document.body.classList.remove("shake"),300) }
/* FX OFF 이면 화면 효과 없이 소리만 */
function glitch(intensity=1){
  if(!FX.on){ if(SFX.on && intensity>1) SFX.burst(); return }
  const g=$("#glitch"); g.innerHTML="";
  const docs=Object.values(SCP).filter(d=>d.full_text); const src=docs.length?pick(docs):pick(Object.values(SCP));
  const lines=(src.full_text||"").split("\n").filter(l=>l.length>20);
  const n=rnd(3,6)*intensity;
  for(let i=0;i<n;i++){
    const s=document.createElement("div"); s.className="slice";
    const top=rnd(0,95), h=rnd(6,28);
    s.style.top=top+"vh"; s.style.height=h+"px"; s.style.transform=`translateX(${rnd(-30,30)}px)`;
    s.style.color=pick(["var(--hi)","var(--red2)","var(--amber)","var(--fg3)"]);
    // 다른 문서의 한 줄이 섞여 들어옴
    s.textContent = Math.random()<0.6 && lines.length ? `${src.id} » ${pick(lines)}` : "█▓▒░ ".repeat(rnd(10,40));
    g.appendChild(s);
  }
  if(SFX.on && Math.random()<0.7) SFX.burst();
  g.classList.add("on"); document.body.classList.add("shake");
  setTimeout(()=>{g.classList.remove("on");g.innerHTML="";document.body.classList.remove("shake")},intensity>1?520:300);
}
function scheduleGlitch(){ sessionLater(()=>{ glitch(1); scheduleGlitch() }, rnd(25000,70000)) }
function scheduleAlert(){ sessionLater(()=>{ $("#topalert").classList.add("on"); feedPush("▲ 구역 7 격리 실패 경보 — 확인 중","red"); sessionLater(()=>{$("#topalert").classList.remove("on");feedPush("구역 7 경보 해제 — 오탐으로 분류됨","amber")},rnd(5000,9000)); scheduleAlert() }, rnd(60000,150000)) }

