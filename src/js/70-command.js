/* ════ 커맨드 라인 ════ */
const HELP=`사용 가능한 명령:
  open <번호>      문서 열람 (예: open 173)
  search <검색어>  데이터베이스 검색 (본문 포함)
  find <검색어>    통합 검색 (문서·게시판·자료실·직원·메일)
  list             색인된 항목 목록
  history          최근 열람 기록
  whoami           현재 세션 정보
  fx               화면 효과 켜기/끄기
  clear            화면 정리
  logout           세션 종료
  override <코드>  권한 상향 (관리자 전용)

  ↑/↓ 이전 명령 · / 커맨드라인 · Esc 뒤로 · ? 단축키`;
const CMD_HIST=[]; let cmdPos=0;
$("#cmdline").addEventListener("keydown",e=>{
  if(e.key==="ArrowUp"||e.key==="ArrowDown"){
    if(!CMD_HIST.length) return; e.preventDefault();
    cmdPos=Math.max(0,Math.min(CMD_HIST.length,cmdPos+(e.key==="ArrowUp"?-1:1)));
    e.target.value=CMD_HIST[cmdPos]||""; return;
  }
  if(e.key!=="Enter") return;
  const raw=e.target.value.trim(); e.target.value=""; if(!raw) return;
  CMD_HIST.push(raw); cmdPos=CMD_HIST.length;
  const [c,...rest]=raw.split(/\s+/); const arg=rest.join(" ");
  const out=t=>{ S.doc="cmd"; render(`<a class="back" href="#${S.view}">← 돌아가기</a><div class="doc"><div class="body"><span class="amber">&gt; ${esc(raw)}</span>\n${esc(t)}</div></div>`) };
  switch(c.toLowerCase()){
    case "help": out(HELP); break;
    case "open": { const m=arg.match(/(\d{1,4})(?:\s*-?\s*([a-z]{2,3}))?/i); if(!m){ out("사용법: open <번호>  (예: open 173, open 001-ko)"); break } openDoc(normId(m[1],m[2])); break }
    case "find": go("#search"+(arg?"?q="+encodeURIComponent(arg):"")); break;
    case "search": go("#database"+(arg?"?q="+encodeURIComponent(arg):"")); break;
    case "list": out(Object.values(SCP).sort((a,b)=>byId(a.id,b.id)).map(d=>`${d.id.padEnd(12)} ${(d.object_class||"[데이터 말소]").padEnd(8)} ${docName(d)}`).join("\n")); break;
    case "history": go("#history"); break;
    case "whoami": out(`사용자  ${S.user}\n권한    ${LVL_NAME[S.level]}\n세션    ${$("#sess").textContent}\n위반    ${S.denied}회\n열람    ${S.recent.length}건\n단말    SITE-19 NODE 0x3F1A\n\n참고: 귀하의 인사 기록은 ${srnd(S.user,2,7)}건의 불일치를 포함합니다.`); break;
    case "fx": toggleFx(); out(`화면 효과 ${FX.on?"활성화":"비활성화"}. (깜빡임·글리치·흔들림)`); break;
    case "clear": route(); break;
    case "logout": logout(); break;
    case "override": {
      const ok=["05-13","alpha-9","raisa","omega-7"].includes(arg.toLowerCase());
      if(ok && S.level<4){ S.level=4; saveSession(); $("#lvl").textContent=LVL_NAME[4]; glitch(2); feedPush(`권한 상향 — ${S.user} → Level 4 (코드 ${arg})`,"red"); updateUnread(); out(`권한 상향 승인.\n현재 권한: ${LVL_NAME[4]}\n\n이 조치는 O5 명령국에 즉시 통보됩니다. 귀하가 왜 이 코드를 알고 있는지 설명할 준비를 하십시오.`) }
      else if(ok) out("이미 최대 권한입니다.");
      else { S.denied++; saveSession(); updateUnread(); glitch(1); out(`인증 실패. 유효하지 않은 재정의 코드.\n누적 위반 ${S.denied}회`) }
      break }
    default: glitch(1); out(`알 수 없는 명령: ${c}\n'help'를 입력하십시오.`);
  }
});

/* 단축키: / 로 커맨드라인 포커스, Esc로 한 단계 위로 */
document.addEventListener("keydown",e=>{
  if(!S.booted) return;
  const typing=["INPUT","TEXTAREA"].includes(document.activeElement.tagName);
  if(e.key==="/" && !typing){e.preventDefault();$("#cmdline").focus()}
  if(e.key==="Escape"){
    if(typing){ document.activeElement.blur(); return }
    const m=(location.hash||"").match(/^#(scp-\d+)\/\d+$/);
    if(m) go("#"+m[1]); else if(/^#(board|approval|messages|org|archive|search)\?/.test(location.hash)) go("#"+location.hash.slice(1).split("?")[0]); else if(S.doc) go(S.doc==="cmd"?"#"+S.view:"#database");
  }
});

/* 표의 행 클릭 → 첫 칸 링크로 이동 (링크 자체는 키보드로 접근 가능) */
document.addEventListener("click",e=>{
  const tr=e.target.closest("tr[data-href]"); if(!tr || e.target.closest("a,button")) return;
  location.hash=tr.dataset.href;
});

/* 시작 */
{ const u=store.get("user",null); if(u) $("#u").value=u }
$("#fxbtn").addEventListener("click",toggleFx);
applyFx();
boot();
