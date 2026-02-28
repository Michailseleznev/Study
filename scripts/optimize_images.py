#!/usr/bin/env python3
"""
Generate responsive AVIF/WebP/JPEG variants and a manifest for runtime srcset mapping.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


DEFAULT_INPUT_DIRS = [
    "Креативные съёмки",
    "Портреты",
    "Природа",
    "Стоковые фотографии",
    "Студийные съёмки",
    "unsplash-local/images",
]
DEFAULT_EXTS = {".jpg", ".jpeg", ".png"}
DEFAULT_WIDTHS = [480, 960, 1600]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Optimize images to AVIF/WebP/JPEG srcset variants.")
    parser.add_argument(
        "--input-dir",
        action="append",
        default=[],
        help="Input directory (can be used multiple times). Defaults to project photo folders.",
    )
    parser.add_argument(
        "--output-dir",
        default="assets/img/optimized",
        help="Output directory for optimized assets.",
    )
    parser.add_argument(
        "--manifest",
        default="assets/img/optimized/manifest.json",
        help="Manifest JSON output path.",
    )
    parser.add_argument(
        "--quality-jpg",
        type=int,
        default=82,
        help="JPEG quality.",
    )
    parser.add_argument(
        "--quality-webp",
        type=int,
        default=80,
        help="WebP quality.",
    )
    parser.add_argument(
        "--quality-avif",
        type=int,
        default=52,
        help="AVIF quality (0..100, higher means better quality).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild variants even if files exist.",
    )
    return parser.parse_args()


def make_key(path: Path) -> str:
    return hashlib.sha1(path.as_posix().encode("utf-8")).hexdigest()[:16]


def collect_images(root: Path, dirs: list[str]) -> list[Path]:
    files: list[Path] = []
    for rel in dirs:
        target = (root / rel).resolve()
        if not target.exists() or not target.is_dir():
            continue
        for p in target.rglob("*"):
            if p.is_file() and p.suffix.lower() in DEFAULT_EXTS:
                files.append(p)
    return sorted(files)


def ensure_rgb(img: Image.Image) -> Image.Image:
    if img.mode in {"RGB", "L"}:
        return img.convert("RGB")
    if img.mode in {"RGBA", "LA"}:
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        return bg
    return img.convert("RGB")


def resized(img: Image.Image, width: int) -> Image.Image:
    w, h = img.size
    if width >= w:
        return img
    height = int((h * width) / w)
    return img.resize((width, height), Image.Resampling.LANCZOS)


def main() -> int:
    args = parse_args()
    root = Path(".").resolve()

    in_dirs = args.input_dir if args.input_dir else DEFAULT_INPUT_DIRS
    out_dir = (root / args.output_dir).resolve()
    manifest_path = (root / args.manifest).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    files = collect_images(root, in_dirs)
    manifest_files: dict[str, dict[str, object]] = {}

    for src in files:
        rel_src = src.relative_to(root).as_posix()
        key = make_key(Path(rel_src))

        with Image.open(src) as im:
            base = ensure_rgb(im)
            src_w, src_h = base.size
            widths = [w for w in DEFAULT_WIDTHS if w < src_w]
            widths.append(src_w)
            widths = sorted(set(widths))

            avif_srcset: list[str] = []
            webp_srcset: list[str] = []
            jpg_srcset: list[str] = []

            fallback_width = widths[min(1, len(widths) - 1)]
            fallback_file = ""

            for w in widths:
                img = resized(base, w)
                stem = f"{key}-{w}"

                avif_name = f"{stem}.avif"
                webp_name = f"{stem}.webp"
                jpg_name = f"{stem}.jpg"

                avif_path = out_dir / avif_name
                webp_path = out_dir / webp_name
                jpg_path = out_dir / jpg_name

                if args.force or not avif_path.exists():
                    img.save(avif_path, format="AVIF", quality=max(1, min(100, args.quality_avif)))
                if args.force or not webp_path.exists():
                    img.save(webp_path, format="WEBP", quality=max(1, min(100, args.quality_webp)), method=6)
                if args.force or not jpg_path.exists():
                    img.save(jpg_path, format="JPEG", quality=max(1, min(100, args.quality_jpg)), optimize=True, progressive=True)

                avif_srcset.append(f"{args.output_dir}/{avif_name} {w}w")
                webp_srcset.append(f"{args.output_dir}/{webp_name} {w}w")
                jpg_srcset.append(f"{args.output_dir}/{jpg_name} {w}w")

                if w == fallback_width:
                    fallback_file = f"{args.output_dir}/{jpg_name}"

        manifest_files[rel_src] = {
            "sizes": "(max-width: 860px) 92vw, (max-width: 1280px) 46vw, 33vw",
            "avif": {"srcset": ", ".join(avif_srcset)},
            "webp": {"srcset": ", ".join(webp_srcset)},
            "jpg": {"srcset": ", ".join(jpg_srcset)},
            "fallback": fallback_file or jpg_srcset[0].split(" ")[0],
            "width": src_w,
            "height": src_h,
        }

    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "count": len(manifest_files),
        "files": manifest_files,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({
        "status": "ok",
        "optimized": len(manifest_files),
        "manifest": str(manifest_path),
        "output": str(out_dir),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
