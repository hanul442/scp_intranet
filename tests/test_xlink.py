import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from build import add_backlinks, term_docs  # noqa: E402

TERMS = json.loads((ROOT / "data/xterms.json").read_text(encoding="utf-8"))["terms"]


class BacklinkTest(unittest.TestCase):
    def test_backlinks(self):
        raw = {"SCP-173": {"full_text": "SCP-173 은 …", "rating": 5},
               "SCP-096": {"full_text": "SCP-173 과 SCP-001-KO 참고", "rating": 3},
               "SCP-001-KO": {"full_text": "SCP-096 을 보라. SCP-9999"}}
        bl = add_backlinks(raw)
        self.assertEqual(bl["SCP-173"], ["SCP-096"])          # 자기 자신은 빼고
        self.assertEqual(bl["SCP-001-KO"], ["SCP-096"])
        self.assertEqual(bl["SCP-096"], ["SCP-001-KO"])
        self.assertNotIn("SCP-9999", bl)                       # 없는 문서는 무시


class TermTest(unittest.TestCase):
    def keys(self, text):
        return {k for k in term_docs({"X": {"full_text": text}}, TERMS)}

    def test_terms(self):
        self.assertEqual(self.keys("기동특무부대 엡실론-11 이 제19기지 에 투입, O5 평의회 승인"),
                         {"mtf:엡실론-11", "site:19", "dept:o5"})
        self.assertEqual(self.keys("D계급 인원과 GOC 요원, 세계 오컬트 연합"), {"cls:D", "goi:세계 오컬트 연합"})
        self.assertEqual(self.keys("Site-17 에서 윤리 위원회"), {"site:17", "dept:ethics"})

    def test_no_false_hits(self):
        self.assertEqual(self.keys("정보보안부서와 GOCX, 제2차 세계대전"), set())


if __name__ == "__main__":
    unittest.main()
