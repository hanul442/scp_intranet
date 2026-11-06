"""크롤링한 문서 저장소 — data/scp/<묶음>.json (crawler.py, build.py 공용)

문서가 수천 건이라 한 파일(data/scp.json)로 두면 GitHub 파일 크기 제한(100MB)에
걸린다. 그래서 번호 50개 단위로 나눠 저장한다 (db/ 의 묶음과 같은 규칙).
"""
import json
import re
from pathlib import Path

DIR = Path(__file__).parent / "data" / "scp"
LEGACY = Path(__file__).parent / "data" / "scp.json"
CHUNK = 50
_written = {}  # 묶음 → 마지막으로 쓴 내용 (바뀐 묶음만 다시 쓰기)


def chunk_key(doc_id):
    """SCP-1234 → 'n1200', SCP-012-KO → 'ko0000'"""
    m = re.match(r"^SCP-(\d+)(?:-([A-Z]+))?", doc_id)
    if not m:
        return "misc"
    num = int(m.group(1)) // CHUNK * CHUNK
    return f"{(m.group(2) or 'n').lower()}{num:04d}"


def load():
    data = {}
    if LEGACY.exists():  # 예전 단일 파일
        data.update(json.loads(LEGACY.read_text(encoding="utf-8")))
    for p in sorted(DIR.glob("*.json")):
        text = p.read_text(encoding="utf-8")
        _written[p.stem] = text
        data.update(json.loads(text))
    return data


def save(data):
    DIR.mkdir(parents=True, exist_ok=True)
    chunks = {}
    for k in sorted(data):
        chunks.setdefault(chunk_key(k), {})[k] = data[k]
    for key, docs in chunks.items():
        text = json.dumps(docs, ensure_ascii=False, indent=1) + "\n"
        if _written.get(key) != text:
            (DIR / f"{key}.json").write_text(text, encoding="utf-8")
            _written[key] = text
    if LEGACY.exists():
        LEGACY.unlink()
