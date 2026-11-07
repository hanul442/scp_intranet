"""재단 설정(세계관) 문서 → data/lore.json

scpko 위키의 가이드 문서(보안 인가 등급, 인원 계급, 직함, 객체 등급, 기동특무부대,
기지 목록, 요주의 단체 등)를 제목 단위 섹션으로 나눠 저장한다. 사이트의 '규정집'과
인가·계급 규칙이 이 데이터를 쓴다. 콘텐츠 라이선스: CC BY-SA 3.0

사용법: python3 lore.py           전체 다시 받기
        python3 lore.py object-classes   특정 문서만
"""
import html
import json
import re
import sys
import time
from pathlib import Path

from crawler import SITE, fetch, strip_tags

OUT = Path(__file__).parent / "data" / "lore.json"
# (주소, 규정집에 보일 짧은 이름)
PAGES = [
    ("security-clearance-levels", "보안 인가 · 인원 계급 · 직함"),
    ("object-classes", "객체 등급"),
    ("about-the-scp-foundation", "재단 개요"),
    ("task-forces", "기동특무부대"),
    ("secure-facilities-locations", "기지 및 시설"),
    ("groups-of-interest", "요주의 단체"),
    ("departments", "재단 부서"),
    ("o5-command-dossier", "O5 평의회"),
    ("personnel-and-character-dossier", "주요 인원"),
]
# 문서별 추가 손질
#  tabs      : 탭 이름을 큰 제목으로 (O5-1, O5-2 … / 박사, 연구원 …)
#  cut       : 각 섹션 본문에서 이 글귀 뒤는 버림 (위키 안내문)
#  entries   : <hr /> 다음 굵은 글씨 문단을 항목 제목으로 (인물 한 명 = 한 항목)
OPTS = {
    "departments": {"cut": "위로 돌아가기"},
    "secure-facilities-locations": {"cut": "이 페이지는 뭡니까?"},
    "o5-command-dossier": {"tabs": True, "entries": True},
    "personnel-and-character-dossier": {"tabs": True, "entries": True},
}
RT, RT_END = "\x1f", "\x1e"  # 루비/아래첨자 영문 표기의 시작·끝 표시 (제목에선 영문 칸, 본문에선 괄호)
HANGUL = re.compile(r"[가-힣]")
# 세계관 밖(위키 운영) 이야기거나 화면에 못 쓰는 위젯 잔여물
META_TITLES = {"정보", "위키에 대하여", "사이트 방침 및 수칙", "미디어 문의", "관련 항목", "재단 시설 지도", "관련 페이지", "읽을거리"}
HEAD = re.compile(r'<h([1-4])(?: id="toc\d+")?>\s*<span>(.*?)</span>\s*</h\1>', re.S)


def tabs_to_heads(body):
    """위키 탭(yui-navset)을 제목으로 바꿔 탭마다 한 섹션이 되게 한다"""
    labels = [strip_tags(x) for x in re.findall(r'<li[^>]*><a href="javascript:;"><em>(.*?)</em>', body)]
    body = re.sub(r'<ul class="yui-nav">.*?</ul>', "", body, flags=re.S)
    it = iter(labels)
    return re.sub(r'<div id="wiki-tab-\d+-\d+"[^>]*>',
                  lambda m: f"<h1><span>{next(it, '')}</span></h1>", body)


def entry_heads(body):
    """<hr /> 뒤 '<strong>이름</strong>(영문): 설명' 문단 → 이름이 제목인 항목"""
    def rep(m):
        p = m.group(1)
        k = p.find("<strong>:</strong>")
        head, rest = (p[:k], p[k + 18:]) if k >= 0 else (p, "")
        en = " ".join(strip_tags(x) for x in re.findall(r"<sub>(.*?)</sub>", head))
        t = strip_tags(re.sub(r"<sub>.*?</sub>", "", head)).strip().rstrip(".:").strip()
        if k < 0 and len(t) > 50 and ": " in t:  # 콜론이 굵은 글씨 밖에 있는 항목
            t, more = t.split(": ", 1)
            rest = html.escape(more)
        pm = re.match(r"(.*?)\s*\(([^()]*)\)$", t)
        if pm and not en:
            t, en = pm.group(1), pm.group(2)
        return f"<h3><span>{t}{RT}{en}</span></h3>" + (f"<p>{rest}</p>" if rest.strip() else "")
    return re.sub(r"<hr\s*/>\s*<p>(<strong>.*?)</p>", rep, body, flags=re.S)


def parse(slug, page):
    opt = OPTS.get(slug, {})
    title_m = re.search(r'<div id="page-title">\s*(.*?)\s*</div>', page, re.S)
    m = re.search(r'<div id="page-content">(.*?)<div class="page-tags">', page, re.S)
    body = m.group(1) if m else ""
    body = re.sub(r'<div id="toc".*?</div>\s*</div>\s*</div>', "", body, flags=re.S)  # 목차
    body = re.sub(r'<div class="collapsible-block-folded".*?</div>', "", body, flags=re.S)
    body = re.sub(r'<div class="collapsible-block-unfolded-link">.*?</div>', "", body, flags=re.S)
    body = re.sub(r'<div class="footer-wikiwalk-nav">.*', "", body, flags=re.S)
    # 루비 표기(한글 위 영문) → 제목/영문으로 나눌 수 있게 표시
    body = re.sub(r'<span class="rt">(.*?)</span></span>', lambda m: RT + strip_tags(m.group(1)) + RT_END + "</span>", body, flags=re.S)
    # 검은 배경으로 가린 글자 → 검열 막대
    body = re.sub(r'<span style="[^"]*background-color:\s*black[^"]*">(.*?)</span>',
                  lambda m: "█" * max(2, len(strip_tags(m.group(1))) // 2), body, flags=re.S)
    if opt.get("tabs"):
        body = tabs_to_heads(body)
    if opt.get("entries"):
        body = entry_heads(body)
    body = re.sub(r"<sub>(.*?)</sub>", lambda m: RT + strip_tags(m.group(1)) + RT_END, body, flags=re.S)
    sections, cur = [], None
    pos = 0
    pieces = []
    for h in HEAD.finditer(body):
        pieces.append(("text", body[pos:h.start()]))
        pieces.append(("head", int(h.group(1)), strip_tags(h.group(2))))
        pos = h.end()
    pieces.append(("text", body[pos:]))
    for p in pieces:
        if p[0] == "head":
            lvl, t = p[1], p[2]
            t, _, en = t.replace(RT_END, "").partition(RT)
            t, en = t.strip(), en.strip()
            # h4 는 바로 위 제목의 영문 표기 (Level 0 (For Official Use Only))
            if cur is not None and not cur["body"] and not cur["en"] and (lvl == 4 or not HANGUL.search(t)):
                cur["en"] = t
                continue
            cur = {"level": lvl, "title": t, "en": en, "body": ""}
            sections.append(cur)
        else:
            text = re.sub(RT + "(.*?)" + RT_END, r"(\1)", strip_tags(p[1]), flags=re.S).replace(RT, "").replace(RT_END, "")
            if not text:
                continue
            if cur is None:
                cur = {"level": 1, "title": "", "en": "", "body": ""}
                sections.append(cur)
            cur["body"] = (cur["body"] + "\n\n" + text).strip()
    if opt.get("cut"):
        for s in sections:
            s["body"] = s["body"].split(opt["cut"])[0].rstrip("( \n")
    for s in sections:
        s["body"] = re.sub(r"^\(?위로 돌아가기\)?$|^\s*댓글 보기\s*$|^.*태그가 달린 모든 문서를 보려면.*$", "", s["body"], flags=re.M)
        s["body"] = re.sub(r"\n\s*\n\s*\n+", "\n\n", s["body"]).replace("FoldUnfold\n", "").strip()
    sections = [s for s in sections
                if s["title"] not in META_TITLES and not s["body"].startswith("원작:") and "{$text}" not in s["body"] and not s["body"].startswith("/*")
                and (s["title"] or len(s["body"]) > 20)]
    credit = re.search(r"저자\s*[:：]\s*</strong>(.*?)(?:<br|</p>|</div>)", page, re.S)
    return {
        "slug": slug,
        "title": strip_tags(title_m.group(1)) if title_m else slug,
        "source": f"{SITE}/{slug}",
        "author": strip_tags(credit.group(1)).strip() if credit else "",
        "license": "CC BY-SA 3.0 — scpko.wikidot.com",
        "sections": sections,
    }


def main():
    only = set(sys.argv[1:])
    data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"pages": []}
    have = {p["slug"]: p for p in data["pages"]}
    for i, (slug, short) in enumerate(PAGES):
        if only and slug not in only:
            continue
        if i:
            time.sleep(1.2)
        try:
            doc = parse(slug, fetch(f"{SITE}/{slug}"))
            doc["short"] = short
            have[slug] = doc
            print(f"ok   {slug}  섹션 {len(doc['sections'])}개")
        except Exception as e:
            print(f"FAIL {slug}  {e}")
    data["pages"] = [have[s] for s, _ in PAGES if s in have]
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
