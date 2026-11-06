import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from build import chunk_key, count_subs  # noqa: E402
from normalize import normalize_doc  # noqa: E402


class ChunkKeyTest(unittest.TestCase):
    def test_series(self):
        self.assertEqual(chunk_key("SCP-002"), "n0000")
        self.assertEqual(chunk_key("SCP-173"), "n0150")
        self.assertEqual(chunk_key("SCP-1049"), "n1000")
        self.assertEqual(chunk_key("SCP-1050"), "n1050")

    def test_branch(self):
        self.assertEqual(chunk_key("SCP-012-KO"), "ko0000")


class CountSubsTest(unittest.TestCase):
    def test_appendices(self):
        d = {"description": "본문 설명입니다.",
             "full_text": "설명: 본문 설명입니다.\n부록 173-1\n" + "가" * 40 + "\n실험 기록 2\n" + "나" * 40}
        self.assertEqual(count_subs(d), 2)

    def test_short_sections_ignored(self):
        d = {"description": "", "full_text": "부록 1\n짧음"}
        self.assertEqual(count_subs(d), 0)


class RatingTest(unittest.TestCase):
    def test_string_rating(self):
        self.assertEqual(normalize_doc({"rating": "+206"})["rating"], 206)
        self.assertEqual(normalize_doc({"rating": "-3"})["rating"], -3)
        self.assertIsNone(normalize_doc({"rating": "?"})["rating"])


if __name__ == "__main__":
    unittest.main()
