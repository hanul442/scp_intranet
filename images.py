"""문서 속 사진(이미지)과 사진 출처 정보를 원문에서 가져와 data/scp/ 문서에 덧붙인다.

본문 텍스트는 건드리지 않고 두 항목만 채운다.
  images       [{"src": 주소, "cap": 캡션}]  — 원문에 나온 순서. 사진 파일은 저장소에 받지 않고
                원문 주소(wdfiles.com)를 그대로 쓴다 (저장소 용량 + 라이선스 표기를 원문과 같게 유지).
  img_credits  [[["파일명", …], ["저작권자", …], ["라이선스", …], …], …]
                — 원문 하단 정보/라이선스 상자의 '파일명:' 묶음. 사진마다 라이선스가 다르므로 그대로 옮긴다.
사용법:
  python3 images.py                 전체 문서
  python3 images.py SCP-049 SCP-682 지정한 문서만
  python3 images.py --skip-done     이미 확인한 문서(images 항목이 있는 문서)는 건너뜀
"""
import argparse, html, re, sys, time, threading
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin

import store
from crawler import fetch, strip_tags, SITE

# 문서 사진이 아닌 것: 사이트 꾸밈, 아바타, 아이콘
SKIP_SRC = re.compile(r"avatar\.php|userkarma|/common--|component[:%]|theme[:%]|nav[:%]|/main/logo|"
                      r"CC-by-sa|/local--files/(?:main|nav|theme)|\.svg(?:$|\?)", re.I)
CREDIT_KEYS = ("파일명", "파일 이름", "원본 파일명", "원본 제목", "원본", "이미지명", "이름", "저작권자", "제작자", "저자",
               "작가", "촬영", "편집", "수정", "라이선스", "라이센스", "출처", "원본 출처", "비고",
               "Filename", "Name", "Author", "License", "Source", "Source Link")
KEY_RE = re.compile(r"^\s*(" + "|".join(sorted(map(re.escape, CREDIT_KEYS), key=len, reverse=True)) + r")\s*[:：]\s*(.*)$")
FILE_KEYS = ("파일명", "파일 이름", "이미지명", "Filename")


def content_of(page):
    m = re.search(r'<div id="page-content">(.*?)<div class="page-tags">', page, re.S)
    return m.group(1) if m else ""


def div_end(s, start):
    """start 에서 열린 <div> 의 짝이 되는 </div> 끝 위치"""
    depth = 0
    for m in re.finditer(r"<div\b|</div>", s[start:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            return start + m.end()
    return len(s)


def cap_text(s):
    # crawler.py 가 본문에 남긴 [이미지: …] 표시와 같은 모양으로
    return " ".join(strip_tags(s).split())


def find_images(body):
    out, seen = [], set()
    # 정보 상자(저자/라이선스) 안의 그림은 제외
    main = body
    for m in reversed(list(re.finditer(r'<div (?:id="u-credit-view"|class="(?:licensebox|credit)\b)[^>]*>', body))):
        main = main[:m.start()] + " " * (div_end(main, m.start()) - m.start()) + main[div_end(main, m.start()):]
    blocks = [(m.start(), m.end(), m.group(0)) for m in
              re.finditer(r'<div class="[^"]*scp-image-block[^"]*".*?<div class="scp-image-caption"[^>]*>.*?</div>', main, re.S)]
    for m in re.finditer(r'<img\b[^>]*>', main):
        tag = m.group(0)
        src_m = re.search(r'\bsrc="([^"]+)"', tag)
        if not src_m:
            continue
        src = html.unescape(src_m.group(1))
        if SKIP_SRC.search(src) or "local--files" not in src:
            continue
        src = urljoin(SITE + "/", src).replace("http://", "https://", 1)
        # scp-wiki.wikidot.com/local--files/… 는 wdfiles.com 으로 넘어가므로 바로 그 주소로
        src = re.sub(r"^https://([a-z0-9-]+)\.wikidot\.com/local--files/", r"https://\1.wdfiles.com/local--files/", src)
        if src in seen:
            continue
        seen.add(src)
        cap = ""
        for a, b, blk in blocks:
            if a <= m.start() < b:
                cm = re.search(r'<div class="scp-image-caption"[^>]*>(.*?)</div>', blk, re.S)
                cap = cap_text(cm.group(1)) if cm else ""
        out.append({"src": src, "cap": cap[:300]})
    return out


def find_credits(body):
    text = strip_tags(re.sub(r"</p>", "\n\n", body))
    groups, cur = [], None
    for line in text.split("\n"):
        m = KEY_RE.match(line)
        if not m:
            if line.strip() and cur:
                groups.append(cur); cur = None
            continue
        k, v = m.group(1), " ".join(m.group(2).split())
        if k in FILE_KEYS:
            if cur:
                groups.append(cur)
            cur = []
        if cur is None or not v or v == "#":
            continue
        cur.append([k, v[:200]])
    if cur:
        groups.append(cur)
    # 음성 파일(.mp3 등)은 사진이 아니므로 제외
    return [g for g in groups if g and not re.search(r"\.(mp3|ogg|wav|m4a)\b", g[0][1], re.I)][:40]


def scan(doc_id):
    page = fetch(f"{SITE}/{doc_id.lower()}")
    body = content_of(page)
    return find_images(body), find_credits(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--skip-done", action="store_true")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--delay", type=float, default=0.6)
    a = ap.parse_args()
    data = store.load()
    ids = [i.upper() for i in a.ids] or sorted(data)
    if a.skip_done:
        ids = [i for i in ids if "images" not in data.get(i, {})]
    lock, done, fails = threading.Lock(), [0], []

    def work(i):
        if i not in data:
            return
        for attempt in range(3):
            try:
                imgs, creds = scan(i)
                break
            except Exception as e:
                if attempt == 2:
                    fails.append(i); print("실패", i, e, file=sys.stderr); return
                time.sleep(3 * (attempt + 1))
        with lock:
            data[i]["images"] = imgs
            data[i]["img_credits"] = creds
            done[0] += 1
            if done[0] % 100 == 0:
                store.save(data); print(f"{done[0]}/{len(ids)}", flush=True)
        time.sleep(a.delay)

    with ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(work, ids))
    store.save(data)
    n = sum(len(data[i].get("images") or []) for i in data)
    print(f"완료 {done[0]}건 · 사진 {n}장 · 실패 {len(fails)}건 {' '.join(fails[:20])}")


if __name__ == "__main__":
    main()
