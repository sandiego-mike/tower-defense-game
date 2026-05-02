#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")


def alpha_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("image has no visible alpha content")
    return bbox


def bbox_center(bbox: tuple[int, int, int, int]) -> tuple[float, float]:
    left, top, right, bottom = bbox
    return ((left + right) / 2, (top + bottom) / 2)


def expand_bbox(bbox: tuple[int, int, int, int], padding: int, width: int, height: int) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    return (max(0, left - padding), max(0, top - padding), min(width, right + padding), min(height, bottom + padding))


def normalize_sprite(
    reference_path: Path,
    target_path: Path,
    scale_multiplier: float,
    alpha_threshold: int,
    padding: int,
) -> None:
    reference = Image.open(reference_path).convert("RGBA")
    target = Image.open(target_path).convert("RGBA")
    reference_bbox = alpha_bbox(reference, alpha_threshold)
    target_bbox = alpha_bbox(target, alpha_threshold)

    reference_width, reference_height = reference.size
    target_width, target_height = target.size
    crop_bbox = expand_bbox(target_bbox, padding, target_width, target_height)
    cropped = target.crop(crop_bbox)

    _, ref_top, _, ref_bottom = reference_bbox
    _, target_top, _, target_bottom = target_bbox
    desired_height = (ref_bottom - ref_top) * scale_multiplier
    scale = desired_height / (target_bottom - target_top)

    resized_width = round(cropped.width * scale)
    resized_height = round(cropped.height * scale)
    resized = cropped.resize((resized_width, resized_height), LANCZOS)

    target_center_x, target_center_y = bbox_center(target_bbox)
    crop_left, crop_top, _, _ = crop_bbox
    target_center_in_crop = ((target_center_x - crop_left) * scale, (target_center_y - crop_top) * scale)
    reference_center_x, reference_center_y = bbox_center(reference_bbox)
    paste_x = round(reference_center_x - target_center_in_crop[0])
    paste_y = round(reference_center_y - target_center_in_crop[1])

    canvas = Image.new("RGBA", reference.size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    canvas.save(target_path)

    print(
        f"{target_path}: canvas {target_width}x{target_height} -> {reference_width}x{reference_height}, "
        f"visible height {target_bottom - target_top} -> {round((target_bottom - target_top) * scale)}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize tower sprite canvases and visible artwork size.")
    parser.add_argument("reference", type=Path)
    parser.add_argument("targets", nargs="+", type=Path)
    parser.add_argument("--scale-multiplier", type=float, default=1.05)
    parser.add_argument("--alpha-threshold", type=int, default=64)
    parser.add_argument("--padding", type=int, default=56)
    args = parser.parse_args()

    for target in args.targets:
        normalize_sprite(args.reference, target, args.scale_multiplier, args.alpha_threshold, args.padding)


if __name__ == "__main__":
    main()
