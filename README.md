# SCiPNET // SITE-19 TERMINAL

SCP 재단 인트라넷 느낌의 정적 팬 사이트. 콘텐츠는 SCP 재단 한국어 위키(scpko.wikidot.com)에서 가져오며 **CC BY-SA 3.0** 으로 배포됩니다. 각 문서 하단에 원 저자·역자·출처를 표기합니다.

**사이트 주소:** https://hanul442.github.io/scp_intranet/

## 구조
- `crawler.py` — scpko 위키에서 SCP 문서를 긁어 `data/scp.json` 생성 (`python3 crawler.py 173 049 ...`, 인자 없으면 기본 20개)
- `template.html` — UI/로직 (단일 파일)
- `build.py` — template + data → `index.html` (데이터 인라인)
- `index.html` — 배포용 결과물 (GitHub Pages에 이 파일만 올려도 동작)

## 문서 추가
```
python3 crawler.py 3001 1471 2000
python3 build.py
```

## 보안 등급 규칙
- 식별번호가 `D-`로 시작 → Level 1, `DR-`/`MD-`/`R4-`/`L4-` → Level 3, 그 외 → Level 2, `O5...` → 거부
- 안전 1 / 유클리드 2 / 케테르 3 / 아폴리온·타우미엘·[데이터 말소] 4
- 커맨드라인 `override 05-13` → Level 4 (코드: 05-13, alpha-9, raisa, omega-7)
- 접근 거부 3회 누적 시 기억소거 경고

## 명령어
`help` `open 173` `search 케테르` `list` `whoami` `clear` `logout` `override <코드>` · `/` 키로 커맨드라인 포커스, `Esc`로 뒤로
