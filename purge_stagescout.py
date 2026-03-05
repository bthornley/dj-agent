#!/usr/bin/env python3
"""
Purge all references to 'StageScout' from PPTX files,
replacing with 'GigLift'. PPTX files are ZIP archives
containing XML — this script patches the XML directly.
"""

import zipfile
import os
import shutil
import sys
from io import BytesIO

REPLACEMENTS = [
    (b"StageScout", b"GigLift"),
    (b"stagescout", b"giglift"),
    (b"Stagescout", b"GigLift"),
    (b"STAGESCOUT", b"GIGLIFT"),
    (b"Stage Scout", b"GigLift"),
    (b"stage scout", b"giglift"),
    (b"stage_scout", b"giglift"),
]

def purge_pptx(filepath):
    """Replace all StageScout references inside a PPTX file."""
    total_replacements = 0

    # Read the original ZIP
    with open(filepath, "rb") as f:
        original_data = f.read()

    buf = BytesIO(original_data)
    out_buf = BytesIO()

    with zipfile.ZipFile(buf, "r") as zin:
        with zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)

                # Only patch text-based XML files inside the PPTX
                if item.filename.endswith(('.xml', '.rels')):
                    for old, new in REPLACEMENTS:
                        count = data.count(old)
                        if count > 0:
                            data = data.replace(old, new)
                            total_replacements += count

                zout.writestr(item, data)

    if total_replacements > 0:
        # Backup original
        backup = filepath + ".bak"
        shutil.copy2(filepath, backup)

        # Write patched file
        with open(filepath, "wb") as f:
            f.write(out_buf.getvalue())

        print(f"  ✅ {os.path.basename(filepath)}: {total_replacements} replacements")
        # Remove backup after successful write
        os.remove(backup)
    else:
        print(f"  ⏭️  {os.path.basename(filepath)}: no StageScout references found")

    return total_replacements


def main():
    docs_dir = os.path.join(os.path.dirname(__file__), "data", "docs")
    total = 0

    print("🔍 Scanning all PPTX files for 'StageScout' references...\n")

    for root, dirs, files in os.walk(docs_dir):
        for f in sorted(files):
            if f.endswith(".pptx"):
                filepath = os.path.join(root, f)
                total += purge_pptx(filepath)

    # Also check build scripts for StageScout references
    print("\n🔍 Scanning Python build scripts...\n")
    script_dir = os.path.dirname(__file__)
    for f in sorted(os.listdir(script_dir)):
        if f.endswith(".py") and "build" in f.lower():
            filepath = os.path.join(script_dir, f)
            with open(filepath, "r") as fh:
                content = fh.read()
            count = content.lower().count("stagescout")
            if count > 0:
                print(f"  ⚠️  {f}: {count} text references (fix manually or re-run)")
            else:
                print(f"  ⏭️  {f}: clean")

    # Check update_decks.py in ~/Documents
    update_decks = os.path.expanduser("~/Documents/update_decks.py")
    if os.path.exists(update_decks):
        with open(update_decks, "r") as fh:
            content = fh.read()
        count = content.lower().count("stagescout")
        if count > 0:
            print(f"  ⚠️  ~/Documents/update_decks.py: {count} text references")

    print(f"\n{'='*50}")
    print(f"Total PPTX replacements: {total}")


if __name__ == "__main__":
    main()
