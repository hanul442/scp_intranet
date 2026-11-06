"""
SCP 재단 한국어 위키(scpko.wikidot.com) 크롤러
- 지정한 SCP 번호의 본문을 가져와 data/scp.json 으로 저장
- 콘텐츠 라이선스: CC BY-SA 3.0 (원작자/번역자 표기 필수)
사용법:
  python3 crawler.py 173 049 096 ...        번호 지정
  python3 crawler.py --series 1 --limit 100 시리즈 목록(001~999)에서 번역된 문서를 차례로
  python3 crawler.py --series 1-3 --skip-existing   이미 받은 문서는 건너뛰고 이어받기
  python3 crawler.py --series ko            한국 지부(SCP-XXX-KO) 문서
  python3 crawler.py --range 100-199        번호 범위
  python3 crawler.py --index-only --series 1-9   본문은 그대로, 별명(부제)만 갱신
  python3 crawler.py                         인자 없으면 유명 문서 묶음(POPULAR)
"""
import argparse, json, re, sys, time, html
import urllib.request
from pathlib import Path

SITE = "https://scpko.wikidot.com"
BASE = SITE + "/scp-{}"
SERIES_PAGES = {"1": "scp-series", "ko": "scp-series-ko",
                **{str(n): f"scp-series-{n}" for n in range(2, 10)}}
UA = "SCiPNET-fan-intranet/0.1 (personal non-commercial project)"
OUT = Path(__file__).parent / "data" / "scp.json"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")

def strip_tags(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</(p|div|li|h\d|tr|blockquote)>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\xa0]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s)
    return s.strip()

def parse(num, page, nickname=""):
    m = re.search(r'<div id="page-content">(.*?)<div class="page-tags">', page, re.S)
    body_html = m.group(1) if m else ""
    body_html = re.sub(r'<div class="page-rate-widget-box">.*?</div>\s*</div>', "", body_html, flags=re.S)
    body_html = re.sub(r'<div class="rate-box-with-credit-button">.*?</div>\s*</div>', "", body_html, flags=re.S)
    body_html = re.sub(r'<div class="footer-wikiwalk-nav">.*', "", body_html, flags=re.S)
    # 접기/펼치기 블록: "+ 펼치기" 링크만 지우고 펼쳐진 내용은 남김
    body_html = re.sub(r'<div class="collapsible-block-folded".*?</div>', "", body_html, flags=re.S)
    body_html = re.sub(r'<div class="collapsible-block-unfolded-link">.*?</div>', "", body_html, flags=re.S)
    # 각주 본문은 [[footnoteblock]] 자리에 남기고, 본문 속 각주 번호는 [n] 형태로
    body_html = re.sub(r'<sup class="footnoteref">\s*<a[^>]*>(\d+)</a>\s*</sup>', r"[\1]", body_html)
    # 이미지 캡션은 [이미지: ...] 로 표시
    body_html = re.sub(r'<div class="scp-image-caption"[^>]*>(.*?)</div>',
                       lambda c: "\n[이미지: " + " ".join(strip_tags(c.group(1)).split()) + "]\n", body_html, flags=re.S)
    text = strip_tags(body_html)
    # 상단 크레딧 박스 / 하단 저작권 안내 제거
    def credit(label):
        mm = re.search(rf"{label}\s*[:：]\s*</strong>\s*(.*?)</div>", page, re.S)
        return strip_tags(mm.group(1)).split("\n")[0].strip() if mm else ""
    author, trans = credit("저자"), credit("역자")
    start = text.find("일련번호")
    if start > 0: text = text[start:]
    for cut in ["크리에이터 정보", "라이선스 안내", "Cite this page", "WIKIDOT.modules"]:
        i = text.find(cut)
        if i > 0: text = text[:i]
    text = text.strip()
    LABELS = r"(?:특수 격리 절차|설명|부록|추가 자료|문서|실험 기록|사건 기록|면담 기록|주석|참고)"
    def grab(label):
        mm = re.search(rf"{label}\s*[:：]\s*(.+?)(?=\n\s*{LABELS}\s*[\s\d\-A-Za-z]*[:：]|\Z)", text, re.S)
        return mm.group(1).strip() if mm else ""
    obj_class = grab(r"등급").split("\n")[0]
    containment = grab(r"특수 격리 절차")
    description = grab(r"설명")
    tags = re.findall(r'<a href="/system:page-tags/tag/[^"]*">([^<]+)</a>', page)
    rating_m = re.search(r'<span class="(?:number )?prw54353[^"]*">\s*([+\-]?\d+)\s*</span>', page) \
        or re.search(r'class="rate-points"[^>]*>.*?([+\-]?\d+)\s*</span>', page, re.S)
    title_m = re.search(r'<div id="page-title">\s*(.*?)\s*</div>', page, re.S)
    return {
        "id": f"SCP-{num}",
        "title": strip_tags(title_m.group(1)) if title_m else f"SCP-{num}",
        "object_class": obj_class,
        "containment": containment,
        "description": description,
        "full_text": text,
        "tags": [t for t in tags if t not in ("en","scp")],
        "nickname": nickname,
        "rating": int(rating_m.group(1)) if rating_m else None,
        "author": author, "translator": trans,
        "source": BASE.format(num),
        "license": "CC BY-SA 3.0 — scpko.wikidot.com",
    }

POPULAR = [
    # 1시리즈 고전
    "002","008","012","015","017","035","049","055","058","066","073","076","079","087","093","096",
    "105","106","108","110","140","148","169","173","179","191","231","239","261","294","330","343",
    "354","372","407","426","439","447","455","457","500","507","527","529","538","553","582","610",
    "650","662","682","701","714","738","811","835","860","882","895","914","939","963","966","990",
    "999",
    # 2시리즈 이후
    "1000","1025","1048","1111","1123","1128","1171","1370","1440","1471","1609","1730","1733","1762",
    "1981","2000","2316","2317","2399","2521","2662","2718","2740","2935","3000","3001","3008","3125",
    "3199","3288","3999","4000","4001","5000","5031","6000","6001","7000","8000",
]

def fetch_series(key):
    """시리즈 목록 페이지에서 (번호, 별명) 목록. 번역 안 된 문서(newpage 링크)는 제외."""
    page = fetch(f"{SITE}/{SERIES_PAGES[key]}")
    content = re.search(r'<div id="page-content">(.*)', page, re.S)
    out = []
    for li in re.findall(r"<li>(.*?)</li>", content.group(1) if content else page, re.S):
        a = re.match(r'\s*<a( class="newpage")? href="/scp-(\d{3,4}(?:-ko)?)"[^>]*>[^<]*</a>\s*(.*)', li, re.S)
        if not a or a.group(1) or a.group(2) == "001":  # 001은 제안서 모음 허브라 제외
            continue
        nick = strip_tags(a.group(3)).lstrip("-–— ").strip()
        out.append((a.group(2).upper() if a.group(2).endswith("-ko") else a.group(2), nick))
    return out

def expand_series(spec):
    """'1' / '1-3' / 'ko' / '1,ko' → 시리즈 키 목록"""
    keys = []
    for part in spec.split(","):
        part = part.strip().lower()
        if re.fullmatch(r"\d-\d", part):
            a, b = map(int, part.split("-"))
            keys += [str(n) for n in range(a, b + 1)]
        elif part in SERIES_PAGES:
            keys.append(part)
        else:
            sys.exit(f"알 수 없는 시리즈: {part} (1~9, ko 가능)")
    return keys

def doc_id(n):
    n = str(n).upper()
    if n.endswith("-KO"):
        return n[:-3].zfill(3) + "-KO"
    return n.zfill(3)

def save(data):
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))

def main():
    ap = argparse.ArgumentParser(description="scpko 위키 → data/scp.json")
    ap.add_argument("nums", nargs="*", help="SCP 번호 (예: 173 049 001-KO)")
    ap.add_argument("--series", help="시리즈 목록에서 가져오기: 1, 2-4, ko, 1,ko ...")
    ap.add_argument("--range", help="번호 범위, 예: 100-199")
    ap.add_argument("--limit", type=int, default=0, help="이번에 새로 받을 최대 문서 수")
    ap.add_argument("--skip-existing", action="store_true", help="이미 받은 문서는 건너뛰기")
    ap.add_argument("--index-only", action="store_true", help="본문은 받지 않고 별명만 갱신")
    ap.add_argument("--delay", type=float, default=1.2, help="요청 간격(초). 위키닷 부담을 줄이려면 1초 이상")
    args = ap.parse_args()

    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    nicks = {}
    targets = [doc_id(n) for n in args.nums]
    if args.range:
        a, b = map(int, args.range.split("-"))
        targets += [doc_id(n) for n in range(a, b + 1)]
    if args.series:
        for key in expand_series(args.series):
            try:
                entries = fetch_series(key)
                print(f"시리즈 {key}: 번역된 문서 {len(entries)}건")
            except Exception as e:
                print(f"FAIL 시리즈 {key}  {e}")
                continue
            for n, nick in entries:
                n = doc_id(n)
                nicks[n] = nick
                targets.append(n)
            time.sleep(args.delay)
    if not targets and not args.index_only:
        targets = POPULAR

    # 받은 별명을 기존 문서에도 반영
    for n, nick in nicks.items():
        if f"SCP-{n}" in data and nick:
            data[f"SCP-{n}"]["nickname"] = nick
    if args.index_only:
        save(data)
        print(f"별명 갱신 완료 → {OUT} ({len(data)}건)")
        return

    seen, todo = set(), []
    for n in targets:
        if n in seen: continue
        seen.add(n)
        if args.skip_existing and f"SCP-{n}" in data: continue
        todo.append(n)
    if args.limit: todo = todo[:args.limit]
    print(f"받을 문서 {len(todo)}건 (예상 {len(todo)*args.delay/60:.0f}분 이상)")

    ok = 0
    for i, n in enumerate(todo, 1):
        key = f"SCP-{n}"
        try:
            page = fetch(BASE.format(n.lower()))
            nick = nicks.get(n) or data.get(key, {}).get("nickname", "")
            data[key] = parse(n, page, nick)
            ok += 1
            print(f"ok   [{i}/{len(todo)}] {key}  {data[key]['object_class'] or '?'}  {nick}")
        except Exception as e:
            print(f"FAIL [{i}/{len(todo)}] {key}  {e}")
        if i % 20 == 0: save(data)  # 중간 저장: 끊겨도 --skip-existing 으로 이어받기
        time.sleep(args.delay)
    save(data)
    print(f"새로 받음 {ok}건 · 전체 {len(data)}건 → {OUT}")

if __name__ == "__main__":
    main()
