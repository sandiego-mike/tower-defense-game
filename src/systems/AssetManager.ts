import { AssetDefinition } from "../types";

type LoadedImage = HTMLImageElement | HTMLCanvasElement;

export class AssetManager {
  private readonly images = new Map<string, LoadedImage>();
  private readonly failedKeys = new Set<string>();

  constructor(private readonly manifest: AssetDefinition[]) {}

  async loadAll(): Promise<void> {
    const loads = this.manifest.map((asset) => this.loadImage(asset));
    await Promise.all(loads);
  }

  getImage(key: string | undefined): LoadedImage | null {
    if (!key) return null;
    // Config spriteKey values resolve through this map. Missing/failed images return null,
    // so entity renderers can keep their canvas fallback drawing.
    return this.images.get(key) ?? null;
  }

  getFirstAvailableImage(keys: readonly (string | undefined)[]): LoadedImage | null {
    for (const key of keys) {
      const image = this.getImage(key);
      if (image) return image;
    }

    return null;
  }

  hasFailed(key: string | undefined): boolean {
    return Boolean(key && this.failedKeys.has(key));
  }

  private loadImage(asset: AssetDefinition): Promise<void> {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        this.images.set(asset.key, asset.removeBackground ? this.removeEdgeBackground(image) : image);
        resolve();
      };

      image.onerror = () => {
        this.failedKeys.add(asset.key);
        resolve();
      };

      image.src = asset.src;
    });
  }

  private removeEdgeBackground(image: HTMLImageElement): LoadedImage {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return image;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    const shouldRemove = (pixelIndex: number): boolean => {
      const offset = pixelIndex * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];
      const channelSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

      return alpha > 0 && red >= 226 && green >= 226 && blue >= 226 && channelSpread <= 10;
    };

    const enqueue = (x: number, y: number): void => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const pixelIndex = y * width + x;
      if (visited[pixelIndex] || !shouldRemove(pixelIndex)) return;
      visited[pixelIndex] = 1;
      queue.push(pixelIndex);
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    while (queue.length > 0) {
      const pixelIndex = queue.pop();
      if (pixelIndex === undefined) continue;

      data[pixelIndex * 4 + 3] = 0;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}
