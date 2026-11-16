import type { RouteSnapshot } from "./engine";

export type RedirectCacheLoader = {
  generation(): Promise<number>;
  snapshot(generation: number): Promise<RouteSnapshot>;
};

export class RedirectRuleCache {
  private current: RouteSnapshot | null = null;
  private lastCheckedAt = 0;
  private pending: Promise<RouteSnapshot | null> | null = null;

  constructor(
    private readonly loader: RedirectCacheLoader,
    private readonly checkIntervalMs = 15_000,
  ) {}

  get cached(): RouteSnapshot | null {
    return this.current;
  }

  invalidate(): void {
    this.lastCheckedAt = 0;
  }

  async get(now = Date.now()): Promise<RouteSnapshot | null> {
    if (this.current && now - this.lastCheckedAt < this.checkIntervalMs) return this.current;
    if (this.pending) return this.pending;

    this.pending = this.refresh(now).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async refresh(now: number): Promise<RouteSnapshot | null> {
    try {
      const generation = await this.loader.generation();
      if (!this.current || this.current.generation !== generation) {
        this.current = await this.loader.snapshot(generation);
      }
      this.lastCheckedAt = now;
      return this.current;
    } catch (error) {
      this.lastCheckedAt = now;
      console.warn("[redirects] cache refresh failed; using the last valid snapshot", error instanceof Error ? error.message : error);
      return this.current;
    }
  }
}

