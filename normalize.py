"""크롤링한 문서 데이터 정리 (crawler.py, build.py 공용)

- 등급 문자열을 표준 등급 하나로 정리하고, 나머지는 class_note 로 남김
- 위키 잔여물(각주 블록 마커, 댓글 링크, 라이선스 토글) 제거
"""
import re

# 앞에 올수록 우선. "[데이터 말소]" 처럼 대괄호 포함 표기도 인식
CLASSES = ["안전", "유클리드", "케테르", "타우미엘", "아폴리온", "무효", "해명", "대기", "[데이터 말소]"]
_CLASS_RE = re.compile("|".join(re.escape(c) for c in CLASSES))

JUNK_PATTERNS = [
    r"\[\[footnoteblock\]\]",
    r"^\s*댓글 보기\s*$",
    r"^\s*‡\s*(Hide\s+)?Licensing\s*/\s*Citation\s*$",
]


def normalize_class(raw):
    """'안전 케테르'(취소선 소실) → ('케테르', '이전: 안전')
    '유클리드/잠재적 케테르' → ('유클리드', '잠재적 케테르')
    '케테르 믿음 있는 자들은…' → ('케테르', '')"""
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    head = raw.split("\n")[0]
    if "/" in head:
        first, rest = head.split("/", 1)
        m = _CLASS_RE.search(first)
        if m:
            return m.group(0), rest.strip()
    # 등급 단어가 공백으로만 이어진 앞부분 (취소선으로 바뀐 등급 표기)
    lead = re.match(rf"^(?:\s*(?:{_CLASS_RE.pattern}))+", head)
    if lead:
        found = _CLASS_RE.findall(lead.group(0))
        prev = [c for c in found[:-1] if c != found[-1]]
        return found[-1], ("이전: " + ", ".join(prev)) if prev else ""
    m = _CLASS_RE.search(head)
    if m:
        return m.group(0), ""
    return "", head[:40]


def clean_text(s):
    s = s or ""
    for p in JUNK_PATTERNS:
        s = re.sub(p, "", s, flags=re.M)
    return re.sub(r"\n\s*\n\s*\n+", "\n\n", s).strip()


def normalize_doc(d):
    d = dict(d)
    raw = d.get("object_class_raw", d.get("object_class", ""))
    d["object_class_raw"] = raw
    d["object_class"], note = normalize_class(raw)
    d["class_note"] = d.get("class_note") or note
    for k in ("containment", "description", "full_text"):
        d[k] = clean_text(d.get(k, ""))
    return d
