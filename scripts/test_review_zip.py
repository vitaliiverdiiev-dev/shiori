"""Tests for review_zip.py. Run: python3 -m unittest discover -s scripts"""

from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
import zipfile
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

from review_zip import export, skip_reason


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


class ExportTest(unittest.TestCase):
    def test_archives_working_tree_without_secrets_or_generated_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "demo"
            repo.mkdir()
            files = {
                ".gitignore": "ignored.txt\n",
                "src/app.ts": "export const v = 1;\n",
                ".env.example": "API_URL=\n",
            }
            for rel, text in files.items():
                (repo / rel).parent.mkdir(parents=True, exist_ok=True)
                (repo / rel).write_text(text)
            git(repo, "init", "-q")
            git(repo, "add", "-A")
            git(repo, "-c", "user.name=t", "-c", "user.email=t@example.invalid",
                "commit", "-qm", "init")

            # Working-tree state the archive must reflect.
            (repo / "src/app.ts").write_text("export const v = 2;\n")
            extra = {
                "src/new file ü.ts": "export {};\n",
                "src/password-input.tsx": "export {};\n",
                ".env": "FAKE_SECRET=not-real\n",
                ".env.local": "FAKE_SECRET=not-real\n",
                "credentials.json": "{}\n",
                "certs/dev.pem": "fake\n",
                "dist/out.js": "built\n",
                "node_modules/pkg/index.js": "dep\n",
                "ignored.txt": "ignored\n",
            }
            for rel, text in extra.items():
                (repo / rel).parent.mkdir(parents=True, exist_ok=True)
                (repo / rel).write_text(text)
            os.symlink("/etc/hosts", repo / "link-out")

            output = Path(tmp) / "out" / "review.zip"
            with redirect_stdout(StringIO()) as log:
                export(repo, output, max_bytes=1024 * 1024)

            with zipfile.ZipFile(output) as archive:
                names = set(archive.namelist())
                app = archive.read("demo/src/app.ts").decode()

            self.assertEqual(app, "export const v = 2;\n")  # unstaged edit
            for kept in ("demo/src/new file ü.ts", "demo/src/password-input.tsx",
                         "demo/.env.example", "demo/.gitignore"):
                self.assertIn(kept, names)
            for dropped in (".env", ".env.local", "credentials.json",
                            "certs/dev.pem", "dist/out.js",
                            "node_modules/pkg/index.js", "ignored.txt", "link-out"):
                self.assertNotIn(f"demo/{dropped}", names)
            self.assertNotIn("not-real", log.getvalue())


class SkipReasonTest(unittest.TestCase):
    def test_classification(self) -> None:
        self.assertIsNone(skip_reason("apps/web/src/main.tsx"))
        self.assertIsNone(skip_reason(".claude/settings.json"))
        self.assertEqual(skip_reason(".claude/settings.local.json"), "personal")
        self.assertEqual(skip_reason("apps/web/tsconfig.tsbuildinfo"), "generated")
        self.assertEqual(skip_reason("apps/api/.env.production"), "secret")
        self.assertEqual(skip_reason("keys/id_ed25519"), "secret")


if __name__ == "__main__":
    unittest.main()
