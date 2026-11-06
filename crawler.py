"""
SCP 재단 한국어 위키(scpko.wikidot.com) 크롤러
- 지정한 SCP 번호의 본문을 가져와 data/scp.json 으로 저장
- 콘텐츠 라이선스: CC BY-SA 3.0 (원작자/번역자 표기 필수)
사용법: python3 crawler.py 173 049 096 ...
"""
import json, re, sys, time, html
import urllib.request
from pathlib import Path

BASE = "https://scpko.wikidot.com/scp-{}"
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

def parse(num, page):
    m = re.search(r'<div id="page-content">(.*?)<div class="page-tags">', page, re.S)
    body_html = m.group(1) if m else ""
    body_html = re.sub(r'<div class="page-rate-widget-box">.*?</div>\s*</div>', "", body_html, flags=re.S)
    body_html = re.sub(r'<div class="rate-box-with-credit-button">.*?</div>\s*</div>', "", body_html, flags=re.S)
    body_html = re.sub(r'<div class="footer-wikiwalk-nav">.*', "", body_html, flags=re.S)
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
    title_m = re.search(r'<div id="page-title">\s*(.*?)\s*</div>', page, re.S)
    return {
        "id": f"SCP-{num}",
        "title": strip_tags(title_m.group(1)) if title_m else f"SCP-{num}",
        "object_class": obj_class,
        "containment": containment,
        "description": description,
        "full_text": text,
        "tags": [t for t in tags if t not in ("en","scp")],
        "author": author, "translator": trans,
        "source": BASE.format(num),
        "license": "CC BY-SA 3.0 — scpko.wikidot.com",
    }

def main(nums):
    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    for n in nums:
        n = str(n).zfill(3)
        try:
            page = fetch(BASE.format(n))
            data[f"SCP-{n}"] = parse(n, page)
            print(f"ok   SCP-{n}  {data[f'SCP-{n}']['object_class'] or '?'}")
        except Exception as e:
            print(f"FAIL SCP-{n}  {e}")
        time.sleep(1.2)  # 위키닷에 부담 주지 않기
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"saved {len(data)} → {OUT}")

if __name__ == "__main__":
    main(sys.argv[1:] or ["173", "049", "096", "682", "087", "106", "3008", "999", "1762", "2521", "055", "426", "1733", "1981", "035", "093", "076", "2317", "1048", "3999"])
