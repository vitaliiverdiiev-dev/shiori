#!/usr/bin/env python3
"""Export the repository's source (working tree) as a ZIP for code review.

Includes tracked and non-ignored untracked files as they are on disk, so
uncommitted edits are part of the review. Always drops VCS data, dependencies,
build output and anything that looks like a secret. Writes the archive outside
the repository and never modifies source files.

This is a filename-based filter, not a secret scanner: inspect the ZIP before
sharing it.

Usage: python3 scripts/review_zip.py [--output PATH] [--max-file-mb N]
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath

EXCLUDED_DIRS = {
    ".git", "node_modules", ".turbo", "dist", "build", "coverage",
    "storybook-static", ".next", ".output", ".cache", ".vite", ".pnpm-store",
    "__MACOSX", ".idea", "__pycache__",
}
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db"}
EXCLUDED_SUFFIXES = (
    ".tsbuildinfo", ".log", ".swp", ".pyc",
    ".zip", ".tar", ".tgz", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".sqlite", ".sqlite3", ".db",
)
# Personal Claude Code state; shared `.claude/settings.json` and rules stay in.
EXCLUDED_PATHS = {".claude/settings.local.json"}

SECRET_NAMES = {
    ".npmrc", ".yarnrc.yml", ".netrc", ".pypirc", ".pgpass",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
}
SECRET_SUFFIXES = (
    ".pem", ".key", ".p12", ".pfx", ".jks", ".keystore",
    ".crt", ".cer", ".der", ".asc", ".gpg",
)
SAFE_ENV_SUFFIXES = (".example", ".sample", ".template")
# Source files may legitimately be named e.g. `password-input.tsx`; other
# files with these words in their name are treated as possible secrets.
SUSPICIOUS_WORDS = re.compile(
    r"secret|token|passw|credential|private[-_]?key|service[-_]?account", re.I
)
SOURCE_SUFFIXES = (
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".html",
    ".md", ".mdx", ".py", ".sql",
)


def skip_reason(rel: str) -> str | None:
    """Return why a repo-relative POSIX path must not be archived, else None."""
    path = PurePosixPath(rel)
    name = path.name
    lower = name.lower()
    if rel in EXCLUDED_PATHS:
        return "personal"
    if any(part in EXCLUDED_DIRS for part in path.parts[:-1]):
        return "generated"
    if name in EXCLUDED_NAMES or lower.endswith(EXCLUDED_SUFFIXES):
        return "generated"
    if lower == ".env" or lower.startswith(".env."):
        return None if lower.endswith(SAFE_ENV_SUFFIXES) else "secret"
    if lower in SECRET_NAMES or lower.endswith(SECRET_SUFFIXES):
        return "secret"
    if SUSPICIOUS_WORDS.search(name) and not lower.endswith(SOURCE_SUFFIXES):
        return "secret"
    return None


def git_files(root: Path) -> list[str]:
    out = subprocess.run(
        ["git", "-C", str(root), "ls-files", "--cached", "--others",
         "--exclude-standard", "-z"],
        check=True, capture_output=True,
    ).stdout
    return sorted({p for p in out.decode("utf-8").split("\0") if p})


def export(root: Path, output: Path, max_bytes: int) -> int:
    root = root.resolve()
    prefix = root.name
    included: list[str] = []
    skipped: dict[str, list[str]] = {}

    for rel in git_files(root):
        reason = skip_reason(rel)
        file = root / rel
        if reason is None:
            if file.is_symlink():
                reason = "symlink"
            elif not file.is_file():
                continue  # tracked but deleted in the working tree
            elif file.stat().st_size > max_bytes:
                reason = "too large"
        if reason:
            skipped.setdefault(reason, []).append(rel)
        else:
            included.append(rel)

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for rel in included:
            archive.write(root / rel, f"{prefix}/{rel}")

    print(f"Archive: {output}")
    print(f"Included files: {len(included)}")
    for reason in sorted(skipped):
        paths = skipped[reason]
        print(f"Skipped ({reason}): {len(paths)}")
        if reason != "generated":  # paths only, never contents
            for rel in paths:
                print(f"  - {rel}")
    print("Note: filename filtering is not a secret scanner; "
          "inspect the archive before sharing.")
    return len(included)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--output", type=Path,
                        help="ZIP path (default: ../<repo>-review-<timestamp>.zip)")
    parser.add_argument("--max-file-mb", type=float, default=5.0,
                        help="skip files larger than this (default: 5)")
    args = parser.parse_args(argv)

    root = Path(subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        check=True, capture_output=True, text=True,
    ).stdout.strip())
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output = (args.output or root.parent / f"{root.name}-review-{stamp}.zip").resolve()
    if output.is_relative_to(root.resolve()):
        print("Refusing to write the archive inside the repository.", file=sys.stderr)
        return 1
    export(root, output, int(args.max_file_mb * 1024 * 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
