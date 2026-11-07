import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from images import find_credits, find_images  # noqa: E402

BODY = """
<div id="u-credit-view"><div class="modalbox"><img src="https://www.wikidot.com/avatar.php?userid=1" />
<p><strong>파일명:</strong> a.png<br />
<strong>저작권자:</strong> <a href="#">Someone</a><br />
<strong>라이선스:</strong> CC BY-SA 3.0<br />
<strong>출처:</strong> <a href="#">#</a></p>
<p><strong>음성 파일</strong></p>
<p><strong>파일명:</strong> voice.mp3<br />
<strong>라이선스:</strong> CC BY-SA 3.0</p>
<div class="inner"><img src="https://scpko.wdfiles.com/local--files/scp-1/inbox.png" /></div></div></div>
<div class="scp-image-block block-right"><img src="https://scpko.wdfiles.com/local--files/scp-1/a.png" class="image" />
<div class="scp-image-caption"><p>사진   설명.</p></div></div>
<p><img src="http://scp-wiki.wikidot.com/local--files/scp-1/b.jpg" alt="b" class="image" /></p>
<img src="http://scpko.wdfiles.com/local--files/nav%3Aside/CC-by-sa-small.png" />
"""


class ImagesTest(unittest.TestCase):
    def test_images(self):
        self.assertEqual(find_images(BODY), [
            {"src": "https://scpko.wdfiles.com/local--files/scp-1/a.png", "cap": "사진 설명."},
            {"src": "https://scp-wiki.wdfiles.com/local--files/scp-1/b.jpg", "cap": ""},
        ])

    def test_credits(self):
        self.assertEqual(find_credits(BODY), [
            [["파일명", "a.png"], ["저작권자", "Someone"], ["라이선스", "CC BY-SA 3.0"]],
        ])


if __name__ == "__main__":
    unittest.main()
