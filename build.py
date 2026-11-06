"""src/ + data/scp.json + data/lore.json → index.html + db/*.js

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

from normalize import normalize_doc

root = Path(__file__).parent
src = root / "src"
DB = root / "db"
BODY_KEYS = ("containment", "description", "full_text")
CHUNK = 50

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


def chunk_key(doc_id):
    """SCP-1234 → 'n1200', SCP-012-KO → 'ko0000'"""
    m = re.match(r"^SCP-(\d+)(?:-([A-Z]+))?", doc_id)
    if not m:
        return "misc"
    num = int(m.group(1)) // CHUNK * CHUNK
    return f"{(m.group(2) or 'n').lower()}{num:04d}"


def js_data(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def build():
    raw = json.loads((root / "data/scp.json").read_text(encoding="utf-8"))
    index, chunks = {}, {}
    for k, v in sorted(raw.items()):
        d = normalize_doc(v)
        key = chunk_key(k)
        d["subs"] = count_subs(d)
        d["chunk"] = key
        chunks.setdefault(key, {})[k] = {b: d.pop(b) for b in BODY_KEYS}
        for unused in ("object_class_raw", "license"):  # 화면에서 쓰지 않음
            d.pop(unused, None)
        index[k] = d
    css = (src / "style.css").read_text(encoding="utf-8")
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((src / "js").glob("*.js")))
    if "</script" in js.lower():
        sys.exit("src/js 안에 '</script' 문자열이 있으면 인라인할 수 없습니다.")
    js = js.replace("/*__SCP_DATA__*/", js_data(index))
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
