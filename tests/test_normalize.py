import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from normalize import class_from_text, clean_text, normalize_class, normalize_doc  # noqa: E402


class NormalizeClassTest(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(normalize_class("케테르"), ("케테르", ""))

    def test_strikethrough_lost(self):
        self.assertEqual(normalize_class("안전 케테르"), ("케테르", "이전: 안전"))
        self.assertEqual(normalize_class("안전 무효"), ("무효", "이전: 안전"))

    def test_slash(self):
        self.assertEqual(normalize_class("유클리드/잠재적 케테르"), ("유클리드", "잠재적 케테르"))

    def test_trailing_prose(self):
        self.assertEqual(normalize_class("케테르 믿음 있는 자들은 왕의 귀환을 기다리며"), ("케테르", ""))

    def test_redacted(self):
        self.assertEqual(normalize_class("[데이터 말소]"), ("[데이터 말소]", ""))

    def test_empty_and_unknown(self):
        self.assertEqual(normalize_class(""), ("", ""))
        self.assertEqual(normalize_class("●●|●●●●●"), ("", "●●|●●●●●"))


class ClassFromTextTest(unittest.TestCase):
    def test_class_alone_on_line(self):
        self.assertEqual(class_from_text("일련번호: SCP-018-KO\n\n안전\n\n특수 격리 절차: …"), ("안전", ""))

    def test_acs_secondary(self):
        t = "일련번호: 233-KO\n\n격리 등급:\n\n난해\n\n2차 등급:\n\n타우미엘\n\n특수 격리 절차: …"
        self.assertEqual(class_from_text(t), ("타우미엘", "2차 등급"))

    def test_acs_plain(self):
        self.assertEqual(class_from_text("객체 등급: 식물\n\n격리 등급: 유클리드\n"), ("유클리드", ""))

    def test_esoteric_name(self):
        self.assertEqual(class_from_text("변칙 등급: 아르콘[1]\n\n특수 격리 절차: …"), ("아르콘", ""))
        self.assertEqual(class_from_text("등급: 변칙 보류\n"), ("보류", ""))

    def test_tags_fallback(self):
        self.assertEqual(class_from_text("특수 격리 절차: …", ["ko", "케테르"]), ("케테르", ""))
        self.assertEqual(class_from_text("특수 격리 절차: …", ["난해한-등급"]), ("난해", ""))
        self.assertEqual(class_from_text("특수 격리 절차: …", ["안전", "유클리드"]), ("", ""))

    def test_text_beats_tags(self):
        self.assertEqual(class_from_text("일련번호: SCP-1\n\n케테르\n", ["안전"]), ("케테르", ""))

    def test_normalize_doc_fills_missing_class(self):
        d = normalize_doc({"object_class": "", "full_text": "일련번호: SCP-1\n\n유클리드\n", "tags": []})
        self.assertEqual(d["object_class"], "유클리드")


class CleanTextTest(unittest.TestCase):
    def test_strips_wiki_leftovers(self):
        s = "본문\n[[footnoteblock]]\n\n 댓글 보기\n‡ Licensing / Citation\n‡ Hide Licensing / Citation"
        self.assertEqual(clean_text(s), "본문")


if __name__ == "__main__":
    unittest.main()
