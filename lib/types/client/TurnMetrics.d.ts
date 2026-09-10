interface TurnTokenUsageRoute {
    readonly provider: string;
    readonly model: string;
}
interface TurnTokenUsage {
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
    readonly reasoningTokens?: number;
    readonly inputTokens?: number;
    readonly routes?: readonly TurnTokenUsageRoute[];
}
interface TurnMetricsProps {
    usage?: TurnTokenUsage;
    runMs?: number;
    tokensPerSecond?: number;
    ttftMs?: number;
}
export declare const TurnMetrics: import("react").MemoExoticComponent<({ usage, runMs, tokensPerSecond, ttftMs, }: TurnMetricsProps) => import("react").JSX.Element | null>;
export {};
//# sourceMappingURL=TurnMetrics.d.ts.map