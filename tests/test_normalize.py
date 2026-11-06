import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from normalize import clean_text, normalize_class  # noqa: E402


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


class CleanTextTest(unittest.TestCase):
    def test_strips_wiki_leftovers(self):
        s = "본문\n[[footnoteblock]]\n\n 댓글 보기\n‡ Licensing / Citation\n‡ Hide Licensing / Citation"
        self.assertEqual(clean_text(s), "본문")


if __name__ == "__main__":
    unittest.main()
