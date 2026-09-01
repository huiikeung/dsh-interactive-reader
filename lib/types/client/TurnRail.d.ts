/** One loaded Turn projected into the rail (mirrors the host's TurnNavigationItem shape). */
export interface TurnRailItem {
    readonly turn: number;
    readonly anchorKey: string;
    readonly prompt: string;
    readonly response: string;
}
declare function TurnRailInner({ items, activeTurn, onNavigate }: {
    items: readonly TurnRailItem[];
    activeTurn: number | null;
    onNavigate: (item: TurnRailItem) => void;
}): import("react").JSX.Element | null;
/** Compact rail of the loaded Turns with hover/focus previews, mirrored from DSH's TurnNavigator. */
export declare const TurnRail: import("react").MemoExoticComponent<typeof TurnRailInner>;
export {};
//# sourceMappingURL=TurnRail.d.ts.map