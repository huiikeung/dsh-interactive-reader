export declare const ROUTE_SKILL_STATUS = "/interactive-reader/skill-status";
export declare const ROUTE_METRICS = "/interactive-reader/metrics";
export declare const ROUTE_HITS: readonly ["/interactive-reader/skill-status", "/interactive-reader/metrics"];
export interface RouteTiming {
    count: number;
    totalMs: number;
    maxMs: number;
}
export declare function recordRouteHit(route: string): number;
export declare function recordRouteDuration(route: string, elapsedMs: number): RouteTiming;
export declare function metricsPayload(): {
    counters: {
        dsh_interactive_reader_route_hits_total: Record<string, number>;
    };
    timingsMs: Record<string, RouteTiming>;
};
//# sourceMappingURL=metrics.d.ts.map