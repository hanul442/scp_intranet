"""재단 설정(세계관) 문서 → data/lore.json

scpko 위키의 가이드 문서(보안 인가 등급, 인원 계급, 직함, 객체 등급, 기동특무부대,
기지 목록, 요주의 단체 등)를 제목 단위 섹션으로 나눠 저장한다. 사이트의 '규정집'과
인가·계급 규칙이 이 데이터를 쓴다. 콘텐츠 라이선스: CC BY-SA 3.0

사용법: python3 lore.py           전체 다시 받기
        python3 lore.py object-classes   특정 문서만
"""
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
]
HANGUL = re.compile(r"[가-힣]")
# 세계관 밖(위키 운영) 이야기거나 화면에 못 쓰는 위젯 잔여물
META_TITLES = {"정보", "위키에 대하여", "사이트 방침 및 수칙", "미디어 문의", "관련 항목", "재단 시설 지도"}
HEAD = re.compile(r'<h([1-4])(?: id="toc\d+")?>\s*<span>(.*?)</span>\s*</h\1>', re.S)


def parse(slug, page):
    title_m = re.search(r'<div id="page-title">\s*(.*?)\s*</div>', page, re.S)
    m = re.search(r'<div id="page-content">(.*?)<div class="page-tags">', page, re.S)
    body = m.group(1) if m else ""
    body = re.sub(r'<div id="toc".*?</div>\s*</div>\s*</div>', "", body, flags=re.S)  # 목차
    body = re.sub(r'<div class="collapsible-block-folded".*?</div>', "", body, flags=re.S)
    body = re.sub(r'<div class="collapsible-block-unfolded-link">.*?</div>', "", body, flags=re.S)
    body = re.sub(r'<div class="footer-wikiwalk-nav">.*', "", body, flags=re.S)
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
            # h4 는 바로 위 제목의 영문 표기 (Level 0 (For Official Use Only))
            if cur is not None and not cur["body"] and not cur["en"] and (lvl == 4 or not HANGUL.search(t)):
                cur["en"] = t
                continue
            cur = {"level": lvl, "title": t, "en": "", "body": ""}
            sections.append(cur)
        else:
            text = strip_tags(p[1])
            if not text:
                continue
            if cur is None:
                cur = {"level": 1, "title": "", "en": "", "body": ""}
                sections.append(cur)
            cur["body"] = (cur["body"] + "\n\n" + text).strip()
    for s in sections:
        s["body"] = re.sub(r"\n\s*\n\s*\n+", "\n\n", s["body"]).replace("FoldUnfold\n", "").strip()
    sections = [s for s in sections
                if s["title"] not in META_TITLES and "{$text}" not in s["body"] and not s["body"].startswith("/*")
                and (s["title"] or len(s["body"]) > 20)]
    credit = re.search(r"저자\s*[:：]\s*</strong>\s*(.*?)</", page, re.S)
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
