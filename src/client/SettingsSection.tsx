import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Button, Input, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives';
import { foldIntensityOf, frostedGlassOf, type FoldIntensity } from './fold-intensity.js';
import { deliverableOpenModeOf, type DeliverableOpenMode } from './open-file.js';
import { settingsCopyFor, type SettingsCopy, type SettingsCopyKey } from './settings-copy.js';
import { CONVENTIONAL_SKILL_ROOTS, detectGenerativeMcpappsSkill, shortestInstallCommand, type SkillStatusProbe, type SkillStatusSnapshot } from './skill-status.js';
import css from './SettingsSection.module.css';

/**
 * The Better Display section.
 *
 * One card: a titled header, then hairline-separated rows whose control rides the first
 * line of the label instead of centring against a multi-line description, and full-width
 * fields with their hint underneath. Controls come from the shell's own `Switch` /
 * `Input` / `Button` / `Tag` primitives so the section looks like the rest of Settings
 * rather than like a plugin.
 */

export interface ReaderPrefsSnapshot {
  deliverableOpenMode?: DeliverableOpenMode;
  frostedGlass?: boolean;
  foldIntensity?: FoldIntensity;
  autoFold?: boolean;
  processOnly?: boolean;
  /** fnOS file-manager URL template; empty means "use the Host opener only". */
  fnosFileManagerUrl?: string;
}

export interface OpenPrefs {
  getSnapshot: () => ReaderPrefsSnapshot;
  subscribe: (fn: () => void) => () => void;
  actions: {
    setDeliverableOpenMode: (value: DeliverableOpenMode) => void;
    setFrostedGlass: (value: boolean) => void;
    setFoldIntensity?: (value: FoldIntensity) => void;
    setAutoFold?: (value: boolean) => void;
    setFnosFileManagerUrl?: (value: string) => void;
  };
}

export interface BetterDisplaySettingsInjected {
  prefs: OpenPrefs;
  copy?: SettingsCopy;
  languageTag?: string;
  checkSkill: SkillStatusProbe;
}

type SettingsProps = BetterDisplaySettingsInjected & {
  /** Official settings.section owner share; unused here. */
  close?: () => void;
  t?: (key: SettingsCopyKey) => string;
};

function text(props: SettingsProps, copy: SettingsCopy, key: keyof SettingsCopy): string {
  if (typeof props.t === 'function') {
    try {
      const value = props.t(key);
      if (typeof value === 'string' && value.length > 0 && value !== key) return value;
    } catch {
      // Fall through to the bundled dictionaries.
    }
  }
  return copy[key];
}

/** One row: label and description on the left, its control on the first line's right. */
function Row({ title, description, control, ...rest }: {
  title: string;
  description: string;
  control: ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  return (
    <div className={css.row} {...rest}>
      <div className={css.rowText}>
        <div className={css.rowTitle}>{title}</div>
        <p className={css.rowDesc}>{description}</p>
      </div>
      <div className={css.rowControl}>{control}</div>
    </div>
  );
}

export function SettingsSection(props: SettingsProps) {
  const copy = props.copy ?? settingsCopyFor(props.languageTag);
  const snap = useSyncExternalStore(
    props.prefs.subscribe,
    () => props.prefs.getSnapshot() ?? ({} as ReaderPrefsSnapshot),
    () => ({} as ReaderPrefsSnapshot),
  );
  const mode = deliverableOpenModeOf(snap.deliverableOpenMode);
  const glass = frostedGlassOf(snap);
  const autoFold = snap.autoFold !== false && snap.foldIntensity !== 0;
  const [fnosUrl, setFnosUrl] = useState(snap.fnosFileManagerUrl ?? '');
  useEffect(() => { setFnosUrl(snap.fnosFileManagerUrl ?? ''); }, [snap.fnosFileManagerUrl]);

  const on = mode === 'sidebar';
  const [skill, setSkill] = useState<SkillStatusSnapshot | undefined>();
  const [checking, setChecking] = useState(false);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      setSkill(await detectGenerativeMcpappsSkill(props.checkSkill));
    } catch {
      setSkill({
        name: 'generative-mcpapps',
        installed: false,
        via: null,
        roots: [],
        hostReached: false,
      });
    } finally {
      setChecking(false);
    }
  }, [props.checkSkill]);

  useEffect(() => { void recheck(); }, [recheck]);

  return (
    <div className={css.section} data-better-display-settings>
      <header className={css.header}>
        <div className={css.headerText}>
          <div className={css.headerTitle}>{text(props, copy, 'nav')}</div>
          <p className={css.headerDesc}>{text(props, copy, 'sectionSubtitle')}</p>
        </div>
      </header>

      <div className={css.rows}>
        <Row
          title={text(props, copy, 'openTitle')}
          description={text(props, copy, 'openDescription')}
          data-better-display-open-mode={mode}
          control={
            <Switch
              checked={on}
              label={text(props, copy, 'openTitle')}
              onChange={next => { props.prefs.actions.setDeliverableOpenMode(next ? 'sidebar' : 'external'); }}
            />
          }
        />

        <Row
          title={text(props, copy, 'glassTitle')}
          description={text(props, copy, 'glassDescription')}
          data-better-display-glass={glass ? 'on' : 'off'}
          control={
            <Switch
              checked={glass}
              label={text(props, copy, 'glassTitle')}
              onChange={next => { props.prefs.actions.setFrostedGlass(next); }}
            />
          }
        />

        <Row
          title={text(props, copy, 'foldTitle')}
          description={text(props, copy, 'foldDescription')}
          data-better-display-auto-fold={autoFold ? 'on' : 'off'}
          control={
            <Switch
              checked={autoFold}
              label={text(props, copy, 'foldTitle')}
              onChange={next => {
                props.prefs.actions.setAutoFold?.(next);
                props.prefs.actions.setFoldIntensity?.(next ? 1 : 0);
              }}
            />
          }
        />

        <div className={css.field} data-better-display-fnos data-fnos-configured={fnosUrl.trim() !== '' || undefined}>
          <div className={css.rowTitle}>{text(props, copy, 'fnosTitle')}</div>
          <p className={css.rowDesc}>{text(props, copy, 'fnosDescription')}</p>
          <Input
            type="url"
            className={css.input}
            value={fnosUrl}
            spellCheck={false}
            autoComplete="off"
            aria-label={text(props, copy, 'fnosTitle')}
            placeholder={text(props, copy, 'fnosPlaceholder')}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setFnosUrl(event.target.value);
              props.prefs.actions.setFnosFileManagerUrl?.(event.target.value);
            }}
          />
          <p className={css.hint}>{text(props, copy, 'fnosTokens')}</p>
        </div>

        <div className={css.block} data-better-display-skill={skill?.installed ? 'installed' : 'missing'}>
          <div className={css.blockHead}>
            <div className={css.rowTitle}>{text(props, copy, 'skillTitle')}</div>
            <Tag tone={skill?.installed ? 'success' : 'neutral'}>
              {skill?.installed ? text(props, copy, 'skillInstalled') : text(props, copy, 'skillMissing')}
            </Tag>
          </div>
          <p className={css.rowDesc}>{text(props, copy, 'skillPurpose')}</p>
          <p className={css.rowDesc}>{text(props, copy, 'skillPluginNote')}</p>
          {skill && !skill.installed ? (
            <>
              <p className={css.rowDesc}>{skill.hostReached ? text(props, copy, 'skillInstall') : text(props, copy, 'skillUnavailable')}</p>
              <pre className={css.pre}>{shortestInstallCommand()}</pre>
              <ul className={css.roots} data-better-display-skill-roots>
                {CONVENTIONAL_SKILL_ROOTS.map(root => (
                  <li key={root}>{root}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div className={css.actions}>
            <Button variant="outline" size="sm" disabled={checking} onClick={() => { void recheck(); }}>
              {checking ? text(props, copy, 'skillChecking') : text(props, copy, 'skillRecheck')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
