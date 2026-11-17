import type { RouteSnapshot } from "./engine";

export type RedirectCacheLoader = {
  generation(): Promise<number>;
  snapshot(generation: number): Promise<RouteSnapshot>;
};

export class RedirectRuleCache {
  private current: RouteSnapshot | null = null;
  private lastCheckedAt = Number.NEGATIVE_INFINITY;
  private pending: Promise<RouteSnapshot | null> | null = null;

  constructor(
    private readonly loader: RedirectCacheLoader,
    private readonly checkIntervalMs = 15_000,
    private readonly refreshTimeoutMs = 2_000,
  ) {}

  get cached(): RouteSnapshot | null {
    return this.current;
  }

  invalidate(): void {
    this.lastCheckedAt = Number.NEGATIVE_INFINITY;
  }

  async get(
    now = Date.now(),
    scheduleBackground?: (refresh: Promise<unknown>) => void,
  ): Promise<RouteSnapshot | null> {
    if (now - this.lastCheckedAt < this.checkIntervalMs) return this.current;
    if (!this.pending) {
      this.lastCheckedAt = now;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const refresh = Promise.race([
        this.refresh(),
        new Promise<RouteSnapshot | null>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Redirect cache refresh timed out.")), this.refreshTimeoutMs);
        }),
      ]).catch(error => {
        console.warn("[redirects] cache refresh failed; using the last valid snapshot", error instanceof Error ? error.message : error);
        return this.current;
      }).finally(() => {
        if (timeout) clearTimeout(timeout);
        if (this.pending === refresh) this.pending = null;
      });
      this.pending = refresh;
    }
    if (this.current) {
      scheduleBackground?.(this.pending);
      return this.current;
    }
    return this.pending;
  }

  private async refresh(): Promise<RouteSnapshot | null> {
    const generation = await this.loader.generation();
    if (!this.current || this.current.generation !== generation) {
      this.current = await this.loader.snapshot(generation);
    }
    return this.current;
  }
}
