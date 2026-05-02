#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_background_pixel(pixel: tuple[int, int, int, int], threshold: int, spread: int) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and min(red, green, blue) >= threshold and max(red, green, blue) - min(red, green, blue) <= spread


def remove_edge_background(path: Path, threshold: int, spread: int) -> int:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return

        index = y * width + x
        if visited[index] or not is_background_pixel(pixels[x, y], threshold, spread):
            return

        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)

    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    removed = 0
    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        removed += 1

        enqueue(x + 1, y)
        enqueue(x - 1, y)
        enqueue(x, y + 1)
        enqueue(x, y - 1)

    image.save(path)
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove edge-connected near-white PNG backgrounds in place.")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--threshold", type=int, default=238)
    parser.add_argument("--spread", type=int, default=18)
    args = parser.parse_args()

    for path in args.paths:
        removed = remove_edge_background(path, args.threshold, args.spread)
        print(f"{path}: made {removed} edge background pixels transparent")


if __name__ == "__main__":
    main()
