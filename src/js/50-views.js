/* ════ 뷰: 사건 기록 ════
   고정 기록 + 색인된 문서에서 날짜별로 뽑은 기록. 날짜·대상은 시드 고정 */
const INCIDENTS=[
 [0,"SCP-106","격리 위반 (경미)","구역 7 격리실 바닥 2.3㎡에서 부식성 물질 발생. 대상은 격리실 내에 있었으나 센서는 3분 12초간 대상의 위치를 확인하지 못함.","종결"],
 [8,"SCP-173","절차 위반","교대 인원 1명이 깜빡임 경고 없이 눈을 비빔. 사망자 없음. 해당 인원은 재교육 후 복귀.","종결"],
 [12,"SCP-682","격리 위반 (중대)","산성 용액 교체 중 대상이 격리실 벽을 ██㎝ 관통. MTF 니-7 대응. 사상자 <span class='redact'>4명</span>.","조사 중"],
 [18,"SCP-096","무결성 점검","격리실 카메라 1대 렌즈에 미세 균열 발견. 해당 카메라는 즉시 파기됨. 영상 기록은 확인하지 않음.","종결"],
 [23,"SCP-049","면담","대상이 격리실 담당 연구원에게 '역병'이 기지 내에 있다고 반복 주장. 연구원 ████ 박사는 다음 날 결근.","보류"],
 [31,"SCP-3008","인원 실종","제19기지 외부 조달 담당 인원 1명, 정규 근무 외 시간에 ██████ 매장 방문 후 연락 두절. 수색 중단.","미결"],
 [37,"—","시스템","SCiPNET 노드 0x3F1A에 출처 불명의 로그인 시도 11건. 사용된 식별번호는 모두 사망 처리된 인원의 것.","<span class='red'>미결</span>"],
];
const INC_KIND={
  keter:[["격리 위반 (중대)","격리 절차 일부가 일시적으로 무력화됨. 기동특무부대 대기. 피해 규모 집계 중.","조사 중"],["정기 점검","격리 장치 이상 없음. 점검 인원 1명이 점검 내용을 기억하지 못함.","종결"]],
  euclid:[["격리 위반 (경미)","대상의 이상 행동이 관측됨. 격리 절차 개정안 제출.","검토 중"],["실험","승인된 실험 1건 수행. 결과는 부록으로 이관.","종결"]],
  safe:[["무결성 점검","격리 용기 이상 없음.","종결"],["반출 요청","연구 목적 반출 요청 1건 — <span class='redact'>반려</span>.","종결"]],
  other:[["재분류 검토","등급 재분류 검토 회의 개최. 회의록은 Level 4 문서로 분류됨.","보류"]],
};
function genIncidents(){
  const day=today(); const ids=Object.keys(SCP).filter(k=>!SPECIAL[k]);
  return [1,3,5,9,15].map(n=>{
    const id=spick(day+"inc"+n,ids); const k=classKey(SCP[id].object_class);
    const [t,sum,st]=spick(day+id,INC_KIND[k]||INC_KIND.other);
    return [n,id,t,sum,st];
  });
}
function incidents(){
  const rows=[...INCIDENTS,...genIncidents()].sort((a,b)=>a[0]-b[0]);
  return `<h2 class="ph">사건 <span>기록</span> · SITE-19</h2>
  <table><tr><th>일시</th><th>관련 항목</th><th>분류</th><th>요약</th><th>상태</th></tr>
  ${rows.map(([n,s,t,sum,st])=>{ const href=SCP[s]?"#"+s.toLowerCase():"";
    return `<tr ${href?`class="row" data-href="${href}"`:""}><td class="dim">${daysAgo(n)}</td><td>${href?rowLink(href,s):`<span class="dim">${s}</span>`}</td><td>${t}</td><td class="dim">${linkRefs(sum,s)}</td><td>${st}</td></tr>`}).join("")}
  </table>
  <p class="dim2" style="margin-top:14px;font-size:11px">Level 3 미만 인원에게는 지난 60일 기록만 표시됩니다. 그 이전에는 아무 일도 없었습니다.</p>`;
}

/* ════ 뷰: 인사 파일 ════ */
const STAFF=[
 ["R-19-0412","서하윤","연구원 (Level 2)","SCP-173 · SCP-999","근무 중"],
 ["R-19-1177","정우진","선임 연구원 (Level 3)","SCP-049 · SCP-035","근무 중"],
 ["R-19-0893","한지호","격리 전문가 (Level 3)","SCP-106 · SCP-682","<span class='amber'>의무실</span>"],
 ["A-19-0051","문세아","보안 요원 (Level 2)","격리동 B 순찰","근무 중"],
 ["R-19-2204","<span class='redact'>이성민</span>","연구원 (Level 2)","SCP-3008","<span class='red'>실종</span>"],
 ["R-19-0666","—","—","—","<span class='red'>[기록 삭제됨]</span>"],
 ["D-9341","(D계급)","D계급 인원","SCP-173 격리실 청소","<span class='dim'>사망 처리 (3회)</span>"],
 ["D-1120","(D계급)","D계급 인원","실험 배정 대기","근무 중"],
];
function personnel(){
  return `<h2 class="ph">인사 <span>파일</span> · 격리동 B</h2>
  <table><tr><th>식별번호</th><th>성명</th><th>직책</th><th>담당</th><th>내선</th><th>상태</th></tr>
  ${STAFF.map(r=>`<tr>${r.map((c,i)=>`<td class="${i===0?"hi":i===1?"":"dim"}">${i===3?linkRefs(c,""):c}</td>${i===3?`<td>${/^D-/.test(r[0])?"<span class='dim2'>—</span>":maskedExt(r[0])}</td>`:""}`).join("")}</tr>`).join("")}
  <tr><td class="hi">${esc(S.user)}</td><td class="dim">(귀하)</td><td class="dim">${LVL_NAME[S.level]}</td><td class="dim">${S.recent.slice(0,2).map(id=>linkRefs(id,"")).join(" · ")||"—"}</td><td class="dim2">미배정</td><td>${S.denied>=3?"<span class='red'>기억소거 검토</span>":S.denied?"<span class='amber'>위반 "+S.denied+"회</span>":"근무 중"}</td></tr>
  </table>
  <div class="notice" style="margin-top:22px">귀하의 인사 파일에 기재된 입사일은 <span class="redact">2019-03-04</span>입니다. 귀하가 기억하는 입사일과 다를 경우 보고하지 마십시오.</div>`;
}

/* ════ 뷰: 메시지 ════
   기본 메시지 + 귀하의 행동(열람·위반·권한 상향)에 따라 도착하는 메시지 */
function msgList(){
  const day=today(), seen=id=>S.recent.includes(id);
  const keterRead=S.recent.filter(id=>SCP[id]&&classKey(SCP[id].object_class)==="keter").length;
  const L=[];
  if(S.level>=4) L.push({id:"o5",from:"O5 명령국",at:`${day} ${hms().slice(0,5)}`,cls:"corrupt",body:"귀하의 권한 상향이 확인되었습니다. 상향에 사용된 코드는 이미 폐기되었습니다. 귀하가 그 코드를 어디서 알게 되었는지 기억나지 않는다면, 그것은 정상입니다."});
  if(S.denied>=3) L.push({id:"amn"+Math.floor(S.denied/3),from:"RAISA 기억소거 담당",at:`${day} ${hms().slice(0,5)}`,cls:"corrupt",body:`누적 위반 ${S.denied}회. 귀하는 B등급 기억소거 대상자로 지정되었습니다. 이 메시지를 읽은 뒤 의무실 C-2로 이동하십시오. 이동한 기억이 없더라도 걱정하지 마십시오.`});
  if(keterRead>=3) L.push({id:"keter3",from:"격리동 B 감독관",at:`${day} ${pad(srnd(day+"k",9,17))}:${pad(srnd(day+"km",0,59))}`,body:`케테르 등급 문서 ${keterRead}건 열람이 기록되었습니다. Level ${S.level} 인원의 업무 범위를 벗어난 열람으로 보입니다. 관심은 감사하지만, 관심은 기록됩니다.`});
  if(seen("SCP-173")&&seen("SCP-096")) L.push({id:"173096",from:"정우진 (R-19-1177)",at:`${day} ${pad(srnd(day+"j",10,18))}:${pad(srnd(day+"jm",0,59))}`,body:`173이랑 096 문서 둘 다 보셨네요. 하나는 보고 있어야 하고 하나는 보면 안 되는 거, 헷갈리시면 안 돼요.`});
  L.push(
    {id:"raisa",from:"RAISA 자동 통보",at:`${day} 08:00`,body:"지난 세션에서 접근 권한을 초과하는 문서 열람 시도가 감지되었습니다. 이는 자동 통보이며 조치는 필요하지 않습니다. 조치는 이미 이루어졌습니다."},
    {id:"049",from:"정우진 (R-19-1177)",at:`${day} 07:41`,body:"049 면담 기록 정리 끝났어요. 그런데 어제 격리실 밖에서 ██ 박사님 봤다는 사람이 둘인데, 박사님 지난주에 전출 가셨잖아요. 혹시 명단 확인 가능해요?"},
    {id:"b4",from:"발신자 불명",at:"????-??-?? ??:??",cls:"corrupt",html:`${blackBars(6)}<br>복도 B-4 계단<br>${blackBars(3)} 내려오지 마<br>${blackBars(9)}`},
    {id:"menu",from:"기지 관리과",at:`${daysAgo(7)} 17:12`,body:"11월 식단표가 게시되었습니다. 목요일 메뉴의 '정체불명 단백질'은 표기 오류이며, 정체는 명확합니다."},
    {id:"106a",from:"한지호 (R-19-0893)",at:`${daysAgo(srnd(day+"h",9,14))} 02:3${srnd(day+"hm",0,9)}`,body:"106 격리실 하부 점검 들어갑니다. 30분 안에 연락 없으면 절차대로."},
    {id:"106b",from:"한지호 (R-19-0893)",at:"(미발신 — 초안)",draft:true,body:"바닥이"},
  );
  return L;
}
function updateUnread(){
  const n=msgList().filter(m=>!m.draft && !S.readMsgs.includes(m.id)).length;
  $("#unread").textContent=n?`(${n})`:"";
}
function messages(){
  const L=msgList();
  const html=`<h2 class="ph">내부 <span>통신</span></h2>
  <div class="msglist">${L.map(m=>`<div class="m ${!m.draft&&!S.readMsgs.includes(m.id)?"unread":""} ${m.cls||""}"><div class="f"><span>${esc(m.from)}</span><span class="${m.draft?"red":""}">${esc(m.at)}</span></div>${m.html||linkRefs(esc(m.body),"")}</div>`).join("")}</div>`;
  S.readMsgs=[...new Set([...S.readMsgs,...L.map(m=>m.id)])]; saveSession(); updateUnread();
  return html;
}

/* ════ 뷰: O5 ════ */
function o5(){
  S.denied++; saveSession(); updateUnread(); glitch(2); feedPush(`O5 기록 접근 시도 — ${S.user}`, "red");
  return `<h2 class="ph red">O5 <span>평의회 기록</span></h2>
  <div class="denied"><b>LEVEL 5 — 접근 거부</b>이 페이지는 존재하지 않습니다. 귀하는 이 페이지를 열지 않았습니다.<br><br>
  <span class="dim">세션 식별자 ${$("#sess").textContent.slice(3)} 가 O5 명령국에 전달되었습니다. 단말에서 떠나지 마십시오.</span></div>
  ${S.denied>=3?`<div class="notice danger">단말 앞에 서 있는 사람이 보이면 그가 귀하의 기억소거 담당자입니다.</div>`:""}`;
}
