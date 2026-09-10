import type { Context } from '@deepseek-ai/cordis';
import type * as DshChat from '@deepseek-ai/dsh-client-ui-chat/client';
import type * as DshConversation from '@deepseek-ai/dsh-client-ui-conversation/client';
import type * as DshRenderer from '@deepseek-ai/dsh-client-ui-renderer/client';
import type * as DshSession from '@deepseek-ai/dsh-client-ui-session/client';
/** References the augmentation carriers; type-only, so it emits no code. */
export type ReaderClientCarriers = typeof DshChat | typeof DshConversation | typeof DshRenderer | typeof DshSession;
export type { ReaderBlockOwner } from './types.js';
export { McpAppFrame } from './McpAppFrame.js';
export declare const name = "dsh-better-display-client";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map