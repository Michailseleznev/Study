#!/usr/bin/env python3
"""
Generate responsive image variants and a manifest for runtime srcset mapping.
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
SUPPORTED_FORMATS = ("jpg", "webp", "avif")
FORMAT_EXTENSIONS = {
    "jpg": ".jpg",
    "webp": ".webp",
    "avif": ".avif",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Optimize images to responsive srcset variants.")
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
        "--format",
        dest="formats",
        action="append",
        choices=SUPPORTED_FORMATS,
        help="Output format to generate. Repeat to build multiple formats. Defaults to jpg only.",
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


def normalize_formats(formats: list[str] | None) -> list[str]:
    requested = formats or ["jpg"]
    ordered: list[str] = []
    for fmt in requested:
        if fmt not in ordered:
            ordered.append(fmt)
    return ordered


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


def save_variant(img: Image.Image, fmt: str, path: Path, args: argparse.Namespace) -> None:
    if fmt == "jpg":
        img.save(path, format="JPEG", quality=max(1, min(100, args.quality_jpg)), optimize=True, progressive=True)
        return
    if fmt == "webp":
        img.save(path, format="WEBP", quality=max(1, min(100, args.quality_webp)), method=6)
        return
    if fmt == "avif":
        img.save(path, format="AVIF", quality=max(1, min(100, args.quality_avif)))
        return
    raise ValueError(f"Unsupported format: {fmt}")


def remove_stale_outputs(out_dir: Path, manifest_path: Path, expected_files: set[str]) -> int:
    removed = 0
    for candidate in out_dir.rglob("*"):
        if not candidate.is_file():
            continue
        if candidate.resolve() == manifest_path:
            continue
        if candidate.suffix.lower() not in FORMAT_EXTENSIONS.values():
            continue

        rel_path = candidate.relative_to(out_dir).as_posix()
        if rel_path in expected_files:
            continue

        candidate.unlink()
        removed += 1
    return removed


def main() -> int:
    args = parse_args()
    root = Path(".").resolve()

    in_dirs = args.input_dir if args.input_dir else DEFAULT_INPUT_DIRS
    formats = normalize_formats(args.formats)
    out_dir = (root / args.output_dir).resolve()
    manifest_path = (root / args.manifest).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    files = collect_images(root, in_dirs)
    manifest_files: dict[str, dict[str, object]] = {}
    expected_output_files: set[str] = set()

    for src in files:
        rel_src = src.relative_to(root).as_posix()
        key = make_key(Path(rel_src))

        with Image.open(src) as im:
            base = ensure_rgb(im)
            src_w, src_h = base.size
            widths = [w for w in DEFAULT_WIDTHS if w < src_w]
            widths.append(src_w)
            widths = sorted(set(widths))

            srcsets = {fmt: [] for fmt in formats}

            fallback_width = widths[min(1, len(widths) - 1)]
            fallback_file = ""

            for w in widths:
                img = resized(base, w)
                stem = f"{key}-{w}"

                for fmt in formats:
                    filename = f"{stem}{FORMAT_EXTENSIONS[fmt]}"
                    variant_path = out_dir / filename
                    if args.force or not variant_path.exists():
                        save_variant(img, fmt, variant_path, args)

                    srcsets[fmt].append(f"{args.output_dir}/{filename} {w}w")
                    expected_output_files.add(filename)

                    if w == fallback_width and (fmt == "jpg" or ("jpg" not in formats and fmt == formats[0])):
                        fallback_file = f"{args.output_dir}/{filename}"

        manifest_entry = {
            "sizes": "(max-width: 860px) 92vw, (max-width: 1280px) 46vw, 33vw",
            "fallback": fallback_file or srcsets[formats[0]][0].split(" ")[0],
            "width": src_w,
            "height": src_h,
        }
        for fmt, values in srcsets.items():
            manifest_entry[fmt] = {"srcset": ", ".join(values)}

        manifest_files[rel_src] = manifest_entry

    removed_files = remove_stale_outputs(out_dir, manifest_path, expected_output_files)

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
        "formats": formats,
        "removed": removed_files,
        "manifest": str(manifest_path),
        "output": str(out_dir),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
