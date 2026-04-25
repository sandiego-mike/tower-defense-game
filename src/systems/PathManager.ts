import { Vector2, clamp, distanceSquared } from "../types";
import type { CameraBounds } from "./CameraManager";

export type PathSegment = {
  start: Vector2;
  end: Vector2;
  length: number;
  lengthSquared: number;
  cumulativeDistance: number;
};

export class PathManager {
  readonly points: Vector2[] = [];
  readonly segments: PathSegment[] = [];
  totalDistance = 0;

  rebuild(points: readonly Vector2[]): void {
    this.points.length = 0;
    this.segments.length = 0;
    this.totalDistance = 0;

    for (const point of points) {
      this.points.push({ x: point.x, y: point.y });
    }

    for (let index = 0; index < this.points.length - 1; index += 1) {
      const start = this.points[index];
      const end = this.points[index + 1];
      const lengthSquared = distanceSquared(start, end);
      const length = Math.sqrt(lengthSquared);
      this.segments.push({
        start,
        end,
        length,
        lengthSquared,
        cumulativeDistance: this.totalDistance
      });
      this.totalDistance += length;
    }
  }

  get startPoint(): Vector2 {
    return this.points[0] ?? { x: 0, y: 0 };
  }

  get endPoint(): Vector2 {
    return this.points[this.points.length - 1] ?? this.startPoint;
  }

  getSegment(index: number): PathSegment | undefined {
    return this.segments[index];
  }

  getBounds(): CameraBounds | undefined {
    if (this.points.length === 0) return undefined;

    let minX = this.points[0].x;
    let minY = this.points[0].y;
    let maxX = this.points[0].x;
    let maxY = this.points[0].y;

    for (const point of this.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, minY, maxX, maxY };
  }

  distanceToPath(point: Vector2): number {
    let closestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const segment of this.segments) {
      const segmentDistanceSquared = this.distanceSquaredToSegment(point, segment);
      if (segmentDistanceSquared < closestDistanceSquared) {
        closestDistanceSquared = segmentDistanceSquared;
      }
    }

    return Math.sqrt(closestDistanceSquared);
  }

  private distanceSquaredToSegment(point: Vector2, segment: PathSegment): number {
    if (segment.lengthSquared === 0) return distanceSquared(point, segment.start);

    const t = clamp(
      ((point.x - segment.start.x) * (segment.end.x - segment.start.x) +
        (point.y - segment.start.y) * (segment.end.y - segment.start.y)) /
        segment.lengthSquared,
      0,
      1
    );
    const projectionX = segment.start.x + t * (segment.end.x - segment.start.x);
    const projectionY = segment.start.y + t * (segment.end.y - segment.start.y);
    const dx = point.x - projectionX;
    const dy = point.y - projectionY;
    return dx * dx + dy * dy;
  }
}
