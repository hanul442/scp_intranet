"""template.html + data/scp.json → index.html (데이터 인라인, 단일 파일)"""
import json
from pathlib import Path
root = Path(__file__).parent
data = json.loads((root / "data/scp.json").read_text())
tpl = (root / "template.html").read_text()
out = tpl.replace("/*__SCP_DATA__*/", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
(root / "index.html").write_text(out)
print(f"index.html written: {len(out)//1024} KB, {len(data)} documents")
