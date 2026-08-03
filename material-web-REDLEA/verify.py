#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Verification script for material-web package.
- Check all MD files exist
- Validate image references
- Report unused images
- Verify file integrity
"""

from pathlib import Path
import re

def verify_package():
    """Verify package structure and integrity"""

    base = Path(__file__).parent
    docs_dir = base
    assets_dir = base / "assets"

    print("Verificacion del paquete material-web")
    print("=" * 60)

    # Check MD files exist
    print("\n[1] Verificando archivos Markdown...")
    md_files = {
        "que-es-red-lea.md": "01-red-lea",
        "logos-red-lea.md": "02-logos",
        "testimonios.md": "03-testimonios",
        "galeria-fotografica.md": "04-galeria",
        "memoria-encuentro.md": "05-memoria",
    }

    md_ok = True
    for md_file, expected_assets_folder in md_files.items():
        md_path = docs_dir / md_file
        if md_path.exists():
            size = md_path.stat().st_size
            print("  [OK] {} ({} bytes)".format(md_file, size))
        else:
            print("  [ERROR] {} NOT FOUND".format(md_file))
            md_ok = False

    # Check asset folders
    print("\n[2] Verificando carpetas de imagenes...")
    asset_folders_ok = True
    for md_file, asset_folder in md_files.items():
        asset_path = assets_dir / asset_folder
        if asset_path.exists():
            img_count = len(list(asset_path.glob("*")))
            print("  [OK] {} ({} imagenes)".format(asset_folder, img_count))
        else:
            print("  [ERROR] {} NOT FOUND".format(asset_folder))
            asset_folders_ok = False

    # Validate image references in MD files
    print("\n[3] Validando referencias a imagenes en MD...")
    refs_ok = True

    for md_file, asset_folder in md_files.items():
        md_path = docs_dir / md_file
        if not md_path.exists():
            continue

        content = md_path.read_text(encoding='utf-8')

        # Find all image references (![alt](path))
        img_refs = re.findall(r'!\[([^\]]*)\]\(([^\)]+)\)', content)

        if not img_refs:
            print("  [WARN] {} no contiene referencias a imagenes".format(md_file))
            continue

        print("  {} contiene {} referencias a imagenes".format(md_file, len(img_refs)))

        for alt, path in img_refs:
            # Check if image exists
            expected_path = base / path
            if expected_path.exists():
                print("    [OK] {}".format(path))
            else:
                print("    [ERROR] {} NOT FOUND".format(path))
                refs_ok = False

    # Check for orphaned images
    print("\n[4] Verificando imagenes huerfanas...")
    all_images = {}
    for asset_folder in assets_dir.iterdir():
        if asset_folder.is_dir():
            for img in asset_folder.glob("*"):
                if img.is_file():
                    rel_path = img.relative_to(base)
                    all_images[str(rel_path)] = False

    # Mark images found in MD
    for md_file, _ in md_files.items():
        md_path = docs_dir / md_file
        if not md_path.exists():
            continue

        content = md_path.read_text(encoding='utf-8')
        img_refs = re.findall(r'!\[([^\]]*)\]\(([^\)]+)\)', content)

        for _, path in img_refs:
            if path in all_images:
                all_images[path] = True

    orphaned = [img for img, used in all_images.items() if not used]

    if orphaned:
        print("  [WARN] Imagenes no referenciadas:")
        for img in orphaned:
            print("    - {}".format(img))
    else:
        print("  [OK] Todas las imagenes estan referenciadas")

    # Summary
    print("\n" + "=" * 60)
    all_ok = md_ok and asset_folders_ok and refs_ok

    if all_ok and not orphaned:
        print("[OK] Paquete verificado correctamente")
    else:
        print("[WARN] Se encontraron problemas. Revisar arriba.")

    print("=" * 60)

    return all_ok

if __name__ == "__main__":
    verify_package()
