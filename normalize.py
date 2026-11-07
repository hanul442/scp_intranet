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


# 일련번호 바로 아래 등급만 한 줄로 적힌 양식, ACS(격리 등급/2차 등급) 양식에서 등급 찾기
_ACS_RE = re.compile(r"격리\s*등급\s*[:：]?\s*\n?\s*([^\n]+)")
_ACS2_RE = re.compile(r"2차\s*등급\s*[:：]?\s*\n?\s*([^\n]+)")
_LINE_RE = re.compile(r"^(?:(?:객체|개체|변칙)\s*)?등급\s*[:：]\s*([^\n]+)", re.M)
_ESOTERIC_TAGS = ("난해한-등급", "난해")
# 위키 태그로도 쓰이는 난해한 등급 이름
ESOTERIC = ["보류", "비격리", "아르콘", "타이콘데로가", "티아마트", "케르눈노스", "히에말", "에파르크",
            "괴델", "퇴역", "통합", "에노키안", "나기", "글레이프니르", "해제"]


def _short_name(v):
    """'타이콘데로가[1]' → '타이콘데로가', '보류 중' → '보류'. 문장·안내문이면 ''"""
    v = re.sub(r"\[\d+\]|각주\s*\d+\.?|\(.*?\)|[#●*]", "", v or "")
    v = re.sub(r"\s+", " ", v).strip(" .:·")
    for e in ESOTERIC:
        if e in v.split(" "):
            return e
    if (len(v) > 8 or not re.search(r"[가-힣A-Za-z]", v) or re.search(r"[{}$]|참조|다$|등급", v)):
        return ""
    return v


def class_from_text(text, tags=(), raw=""):
    """본문 머리말·태그로 등급 추정 → (등급, 메모). 크롤러가 표준 등급을 못 찾은 문서용.
    표준 등급(안전·유클리드…)을 먼저 찾고, 없으면 난해한 등급 이름(아르콘·보류…)을 쓴다."""
    head = (text or "")[:2500]
    i = head.find("특수 격리 절차")
    if i > 0:
        head = head[:i]
    acs = _ACS_RE.search(head)
    line = _LINE_RE.search(head)
    # 1) 표준 등급
    if acs:
        cls, note = normalize_class(acs.group(1))
        if cls:
            return cls, note
        m2 = _ACS2_RE.search(head)
        if m2 and _short_name(acs.group(1)) in ("난해", "Esoteric"):
            cls, _ = normalize_class(m2.group(1))
            if cls or _short_name(m2.group(1)):
                return cls or _short_name(m2.group(1)), "2차 등급"
    if line:
        cls, note = normalize_class(line.group(1))
        if cls:
            return cls, note
    for ln in head.split("\n")[:12]:  # 등급 이름만 한 줄로 ('안전 케테르' 처럼 취소선 소실 포함)
        t = ln.strip()
        if re.fullmatch(rf"(?:\s*(?:{_CLASS_RE.pattern}))+", t):
            return normalize_class(t)
        if t in ESOTERIC:
            return t, ""
    found = [t for t in tags if t in CLASSES]
    if len(found) == 1:
        return found[0], ""
    # 2) 난해한 등급 이름
    for v in (raw, acs and acs.group(1), line and line.group(1)):
        if _short_name(v):
            return _short_name(v), ""
    eso = sorted((t for t in tags if t in ESOTERIC), key=lambda t: t == "비격리")
    if eso:
        return eso[0], ""
    if any(t in _ESOTERIC_TAGS for t in tags):
        return "난해", ""
    return "", ""


# 격리 절차·설명 제목이 콜론 없이 한 줄로 있거나 '격리 절차(2011 개정):' 처럼 변형된 문서용
_CONT_HEAD = re.compile(r"^[ \t]*(?:특수\s*)?격리\s*절차(?:\s*\([^)\n]*\))?[ \t]*(?:[:：][ \t]*|$)", re.M)
_DESC_HEAD = re.compile(r"^[ \t]*설명(?:\s*\([^)\n]*\))?[ \t]*(?:[:：][ \t]*|$)", re.M)
_NEXT_HEAD = re.compile(r"^[ \t]*(?:부록|추가 자료|실험 기록|사건 기록|사건 보고서|면담 기록|탐사 기록|회수된 기록|"
                        r"비망록|주석|참고)[^\n]{0,70}$", re.M)


def split_sections(text):
    """본문에서 (격리 절차, 설명) 찾기. 크롤러가 '특수 격리 절차:' 형식만 알아서 놓친 경우를 메움"""
    c = _CONT_HEAD.search(text)
    dh = _DESC_HEAD.search(text, c.end() if c else 0)
    cont = text[c.end():dh.start() if dh else len(text)].strip() if c else ""
    if c and not dh:  # 설명 제목이 없으면 다음 부록 제목까지만
        n = _NEXT_HEAD.search(text, c.end())
        cont = text[c.end():n.start() if n else len(text)].strip()
    desc = ""
    if dh:
        n = _NEXT_HEAD.search(text, dh.end())
        desc = text[dh.end():n.start() if n else len(text)].strip()
    return cont, desc


# 문서에 섞여 들어온 테마 CSS·템플릿 소스 (위키 페이지의 [[module CSS]], 풀리지 않은 [[include]])
_CSS_COMMENT = re.compile(r"/\*(?:(?!\*/).){0,4000}?\*/", re.S)
# 선택자 { 속성: 값; … } — 값에는 한글이 올 수 있음 (content: "대한민국 지역사령부")
_CSS_RULE = re.compile(r"^[A-Za-z0-9_\s.#:,>\-\[\]=()\"'*+~@%^$|/!]{1,600}?\{(?:\s*(?:[\w-]+\s*:[^{};]*;?|;))*\s*\}[ \t]*$", re.M)
_CSS_AT = re.compile(r"^[^\S\n]*@(?:import|charset)\b[^\n]*$", re.M)
_INCLUDE = re.compile(r"^\[\[include :scpko:component:(?:raisa-ribbon|glasses-footer)[^\n]*\n(?:(?:\s*\|[^\n]*|\s*)\n)*\s*\]\]\s*$", re.M)
TEMPLATE_JUNK = [
    r"^\s*syntax error near `[^`\n]*`\s*$",
    r"^\s*default\s*$",
    r"^\s*«[^\n]*\|[^\n]*»\s*$",               # 연작 이전/다음 탐색 줄
    r"\{\$[\w-]+\}",                           # 채워지지 않은 변수
]
_HEADER_INC = re.compile(r"^\[\[include :scipnet:component:classified-header\s*\n(.*?)\n\s*\]\]\s*$", re.S | re.M)
_HEADER_KEYS = {"lv": "보안 등급", "item": "일련번호", "class": "등급", "site-responsible": "담당 기지",
                "director": "기지 이사관", "research-head": "연구 책임자", "assigned-task-force": "배정 기동특무부대"}


def _header_lines(m):
    """풀리지 않은 기밀 문서 머리말 틀 → '담당 기지: 제13K기지' 같은 줄"""
    out = []
    for k, v in re.findall(r"^\s*\|([\w-]+)=([^\n]*)$", m.group(1), re.M):
        if k in _HEADER_KEYS and v.strip():
            out.append(f"{_HEADER_KEYS[k]}: {'Level ' if k == 'lv' else ''}{v.strip()}")
    return "\n\n".join(out) + "\n"


_LICENSE = re.compile(r"^(?:Cite this page as:|For information on how to use this component).*?(?=\[\[footnoteblock\]\]|\Z)", re.S | re.M)


def clean_text(s):
    s = s or ""
    s = re.sub("[\u200b\ufeff\u00ad]", "", s)
    s = _LICENSE.sub("", s)
    s = _CSS_COMMENT.sub("", s)
    s = _CSS_AT.sub("", s)
    for _ in range(3):  # @media { .a {…} } 처럼 겹친 규칙
        s = _CSS_RULE.sub("", s)
    s = _INCLUDE.sub("", s)
    s = _HEADER_INC.sub(_header_lines, s)
    s = re.sub(r"(2차 등급\s*[:：]?)\s*\{\$secondary-class\}", r"\1 없음", s)
    for p in TEMPLATE_JUNK:
        s = re.sub(p, "", s, flags=re.M)
    s = re.sub(r"\*\*([^*\n]+?)\*\*", r"\1", s)  # 렌더링 안 된 굵게 표시
    for p in JUNK_PATTERNS:
        s = re.sub(p, "", s, flags=re.M)
    s = re.sub(r"[ \t]+$", "", s, flags=re.M)
    return re.sub(r"\n\s*\n\s*\n+", "\n\n", s).strip()


def normalize_doc(d):
    d = dict(d)
    raw = d.get("object_class_raw", d.get("object_class", ""))
    d["object_class_raw"] = raw
    d["object_class"], note = normalize_class(raw)
    if not d["object_class"]:
        d["object_class"], note2 = class_from_text(d.get("full_text", ""), d.get("tags") or [], raw)
        if d["object_class"]:
            note = note2
    d["class_note"] = d.get("class_note") or note
    for k in ("containment", "description", "full_text"):
        d[k] = clean_text(d.get(k, ""))
    if not d["description"] and _DESC_HEAD.search(d["containment"]):  # 격리 절차가 설명까지 삼킨 경우
        d["containment"], d["description"] = split_sections("특수 격리 절차:\n" + d["containment"])
    if not (d["containment"] and d["description"]):
        cont, desc = split_sections(d["full_text"])
        d["containment"] = d["containment"] or cont
        d["description"] = d["description"] or desc
    if not d["containment"] and d["description"]:
        # 격리 절차를 못 찾았는데 설명 앞에 본문이 있으면, 설명만 보여주면 앞부분이 사라지므로 전문을 그대로 쓰게 비움
        i = d["full_text"].find(d["description"][:200])
        before = re.sub(r"^\s*(일련번호|등급|\[이미지).*$", "", d["full_text"][:max(i, 0)], flags=re.M)
        if i < 0 or len(before.strip()) > 80:
            d["description"] = ""
    # 크롤러는 평가를 문자열로 저장함 ('206', '+12')
    r = d.get("rating")
    if isinstance(r, str):
        r = r.strip().lstrip("+")
        d["rating"] = int(r) if re.fullmatch(r"-?\d+", r) else None
    return d
