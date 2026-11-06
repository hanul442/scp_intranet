"""src/ + data/scp.json → index.html (CSS·JS·데이터 인라인, 단일 파일)

사용법:
  python3 build.py          index.html 생성
  python3 build.py --check  index.html 이 src/data 와 일치하는지만 확인 (CI용)
"""
import json
import sys
from pathlib import Path

from normalize import normalize_doc

root = Path(__file__).parent
src = root / "src"


def build():
    raw = json.loads((root / "data/scp.json").read_text(encoding="utf-8"))
    data = {k: normalize_doc(v) for k, v in raw.items()}
    data_js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    css = (src / "style.css").read_text(encoding="utf-8")
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((src / "js").glob("*.js")))
    if "</script" in js.lower():
        sys.exit("src/js 안에 '</script' 문자열이 있으면 인라인할 수 없습니다.")
    js = js.replace("/*__SCP_DATA__*/", data_js)
    html = (src / "index.html").read_text(encoding="utf-8")
    html = html.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    return html, len(data)


if __name__ == "__main__":
    out, n = build()
    target = root / "index.html"
    if "--check" in sys.argv:
        cur = target.read_text(encoding="utf-8") if target.exists() else ""
        if cur != out:
            sys.exit("index.html 이 최신이 아닙니다. python3 build.py 를 실행한 뒤 커밋하세요.")
        print(f"index.html 최신 상태 ({n} documents)")
    else:
        target.write_text(out, encoding="utf-8")
        print(f"index.html written: {len(out)//1024} KB, {n} documents")
