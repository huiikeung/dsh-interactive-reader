/**
 * Slot types the Better Display settings page registers into.
 *
 * `settings.section` is declared by the shell's own settings package; importing
 * it for types keeps the owner share (`{ close }`) tied to the real contract
 * instead of a hand-rolled copy that a DSH bump could silently invalidate. The
 * `LocaleNamespaceMap` entry is ours — the shell resolves our page label
 * through it.
 */
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import type { SettingsCopyKey } from './settings-copy.js';

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'better-display': SettingsCopyKey;
  }
}
