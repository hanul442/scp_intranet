"""src/ + data/scp/ + data/lore.json → index.html + db/*.js

문서가 수천 건이라 본문까지 한 파일에 넣으면 수십 MB가 된다. 그래서
- index.html 에는 목록용 색인(번호·제목·별명·등급·태그·평가·출처)만 인라인
- 본문(격리 절차·설명·전문)은 번호 50개 단위로 db/<묶음>.js 에 나눠 두고,
  문서를 열 때 <script> 로 불러온다 (file:// 로 열어도 동작)

사용법:
  python3 build.py          index.html, db/ 생성
  python3 build.py --check  결과물이 src/data 와 일치하는지만 확인 (CI용)
"""
import json
import re
import sys
from pathlib import Path

import store
from normalize import normalize_doc
from store import chunk_key  # noqa: F401  (db/ 묶음도 같은 규칙)

root = Path(__file__).parent
src = root / "src"
DB = root / "db"
BODY_KEYS = ("containment", "description", "full_text")

# src/js/30-document.js 의 splitDoc 과 같은 규칙 — 목록에 '관련 문서 n건'을 미리 보여주기 위함
HEAD_RE = re.compile(r"^(부록|문서 번호|실험 기록|탐사 기록|사건 기록|사건 보고서|면담 기록|회수된 기록|비망록)[^\n]{0,70}$")


def count_subs(d):
    def is_head(t):
        return bool(HEAD_RE.match(t)) and not re.match(r"^(면담자|탐사조|면담 대상)", t)
    desc = (d.get("description") or "").strip()
    lines = desc.split("\n")
    tail = ""
    for k, ln in enumerate(lines):
        if is_head(ln.strip()):
            tail = "\n".join(lines[k:])
            break
    rest = (d.get("full_text") or "").strip()
    if desc:
        i = rest.find(desc[:200])
        if i >= 0:
            rest = rest[i + len(desc):]
    rest = tail + "\n" + rest
    n, cur = 0, None
    for ln in rest.split("\n"):
        t = ln.strip()
        if is_head(t):
            if cur is not None and len("\n".join(cur).strip()) > 30:
                n += 1
            cur = []
        elif cur is not None:
            cur.append(ln)
    if cur is not None and len("\n".join(cur).strip()) > 30:
        n += 1
    return n




# src/js/30-document.js 의 linkRefs 와 같은 규칙 — 본문에 나오는 SCP 번호
REF_RE = re.compile(r"SCP-(\d{3,4})(-[A-Z]{2,3}(?![A-Za-z]))?(?!\d)")
BACKLINK_MAX = 40


def norm_id(num, sfx):
    return "SCP-" + num.zfill(3) + ("-" + sfx.lstrip("-").upper() if sfx else "")


def add_backlinks(raw):
    """문서마다 '이 문서를 언급한 문서' 목록(bl)을 만든다. 본문은 열 때 불러오므로 미리 계산해 둠"""
    back = {}
    for k, v in raw.items():
        for n, sfx in set(REF_RE.findall(v.get("full_text") or "")):
            t = norm_id(n, sfx)
            if t != k and t in raw:
                back.setdefault(t, set()).add(k)
    return {k: sorted(v, key=lambda x: (-(raw[x].get("rating") or 0), x))[:BACKLINK_MAX] for k, v in back.items()}


XTERM_TOP = 6


def term_key(t, m):
    """용어 key 의 $1/$2 를 잡힌 그룹으로 채움 (JS termKey 와 같은 규칙)"""
    g = [x for x in m.groups() if x is not None]
    return re.sub(r"\$(\d)", lambda a: g[int(a.group(1)) - 1] if len(g) >= int(a.group(1)) else "", t)


def term_docs(raw, terms):
    """용어마다 [등장 문서 수, 평가 높은 문서 몇 건] — 본문 링크에 띄우는 미리보기용"""
    pats = [(t, re.compile(t["re"])) for t in terms]
    hits = {}
    for k, v in raw.items():
        text = v.get("full_text") or ""
        keys = {term_key(t["k"], m) for t, p in pats for m in p.finditer(text)}
        for key in keys:
            hits.setdefault(key, []).append(k)
    out = {}
    for key, ids in hits.items():
        ids.sort(key=lambda x: (-(raw[x].get("rating") or 0), x))
        out[key] = [len(ids)] + ids[:XTERM_TOP]
    return out


def js_data(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def build():
    raw = store.load()
    index, chunks = {}, {}
    backlinks = add_backlinks(raw)
    for k, v in sorted(raw.items()):
        d = normalize_doc(v)
        if k in backlinks:
            d["bl"] = backlinks[k]
        key = chunk_key(k)
        d["subs"] = count_subs(d)
        d["chunk"] = key
        chunks.setdefault(key, {})[k] = {b: d.pop(b) for b in BODY_KEYS}
        for unused in ("object_class_raw", "license"):  # 화면에서 쓰지 않음
            d.pop(unused, None)
        # 색인 크기 줄이기: 빈 값과, 번호로 다시 만들 수 있는 출처 주소는 빼고 JS(00-core)에서 채움
        for k2 in ("nickname", "author", "translator", "class_note"):
            if not d.get(k2):
                d.pop(k2, None)
        if (d.get("source") or "").lower() == f"https://scpko.wikidot.com/{k.lower()}":
            d.pop("source")
        index[k] = d
    css = (src / "style.css").read_text(encoding="utf-8")
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((src / "js").glob("*.js")))
    if "</script" in js.lower():
        sys.exit("src/js 안에 '</script' 문자열이 있으면 인라인할 수 없습니다.")
    js = js.replace("/*__SCP_DATA__*/", js_data(index))
    terms = json.loads((root / "data/xterms.json").read_text(encoding="utf-8"))["terms"]
    js = js.replace("/*__XTERMS__*/", js_data({"terms": terms, "docs": term_docs(raw, terms)}))
    lore = json.loads((root / "data/lore.json").read_text(encoding="utf-8"))["pages"]
    rules = next(p for p in lore if p["slug"] == "security-clearance-levels")
    js = js.replace("/*__LORE_RULES__*/", js_data(rules))
    js = js.replace("/*__LORE_TOC__*/", js_data([[p["slug"], p.get("short") or p["title"]] for p in lore]))
    html = (src / "index.html").read_text(encoding="utf-8")
    html = html.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    files = {f"{key}.js": f"scpBodies({js_data(body)});\n" for key, body in chunks.items()}
    files["lore.js"] = f"scpLore({js_data({'pages': [p for p in lore if p is not rules]})});\n"
    return html, files, len(index)


if __name__ == "__main__":
    out, files, n = build()
    target = root / "index.html"
    if "--check" in sys.argv:
        cur = target.read_text(encoding="utf-8") if target.exists() else ""
        have = {p.name: p.read_text(encoding="utf-8") for p in DB.glob("*.js")} if DB.exists() else {}
        if cur != out or have != files:
            sys.exit("index.html 또는 db/ 가 최신이 아닙니다. python3 build.py 를 실행한 뒤 커밋하세요.")
        print(f"index.html, db/ 최신 상태 ({n} documents, {len(files)} chunks)")
    else:
        target.write_text(out, encoding="utf-8")
        DB.mkdir(exist_ok=True)
        for p in DB.glob("*.js"):
            if p.name not in files:
                p.unlink()
        total = 0
        for name, body in files.items():
            (DB / name).write_text(body, encoding="utf-8")
            total += len(body.encode())
        print(f"index.html written: {len(out.encode())//1024} KB, {n} documents · db/ {len(files)} chunks, {total//1024//1024} MB")
