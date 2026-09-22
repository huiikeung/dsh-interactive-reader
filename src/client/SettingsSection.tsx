import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Button, Input, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives';
import { foldIntensityOf, frostedGlassOf, type FoldIntensity } from './fold-intensity.js';
import { deliverableOpenModeOf, type DeliverableOpenMode } from './open-file.js';
import { settingsCopyFor, type SettingsCopy, type SettingsCopyKey } from './settings-copy.js';
import { CONVENTIONAL_SKILL_ROOTS, detectGenerativeMcpappsSkill, shortestInstallCommand, type SkillStatusProbe, type SkillStatusSnapshot } from './skill-status.js';
import css from './SettingsSection.module.css';

/**
 * The Interactive Reader section.
 *
 * The section title sits outside any border, and **each module carries its own** — so the
 * panel reads as a list of independent settings instead of one slab. Modules whose body is
 * long (the fnOS template, the skill report) keep that body behind a click, so the panel
 * stays scannable; a module that is nothing but a labelled switch stays open, because its
 * description is the setting.
 *
 * Controls come from the shell's own `Switch` / `Input` / `Button` / `Tag` primitives, so
 * the section looks like the rest of Settings rather than like a plugin.
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

type ModuleAttrs = Record<`data-${string}`, string | undefined>;

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

/** Chevron for a module that opens. */
function Chevron() {
  return (
    <svg className={css.chevron} viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6.5 4 10.5 8 6.5 12" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A module whose whole content is a labelled switch: title, description, control on the
 * first line's right. Always open, because the description is what the switch does.
 */
function SwitchModule({ title, description, checked, onChange, ...rest }: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
} & ModuleAttrs) {
  return (
    <section className={css.module} {...rest}>
      <div className={css.moduleHead}>
        <div className={css.moduleText}>
          <div className={css.moduleTitle}>{title}</div>
          <p className={css.moduleDesc}>{description}</p>
        </div>
        <div className={css.moduleControl}>
          <Switch checked={checked} onChange={onChange} label={title} />
        </div>
      </div>
    </section>
  );
}

/**
 * A module with a long body: its header is the toggle, and the body only renders once the
 * user opens it.
 */
function FoldModule({ title, trailing, children, ...rest }: {
  title: string;
  /** Always-visible status for the header, e.g. the skill badge. */
  trailing?: ReactNode;
  children: ReactNode;
} & ModuleAttrs) {
  const [open, setOpen] = useState(false);
  return (
    <section className={css.module} data-open={open || undefined} {...rest}>
      <button
        type="button"
        className={css.moduleToggle}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <Chevron />
        <span className={css.moduleTitle}>{title}</span>
        {trailing ? <span className={css.moduleTail}>{trailing}</span> : null}
      </button>
      {open ? <div className={css.moduleBody}>{children}</div> : null}
    </section>
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
    <div className={css.section} data-interactive-reader-settings>
      <header className={css.header}>
        <div className={css.headerTitle}>{text(props, copy, 'nav')}</div>
        <p className={css.headerDesc}>{text(props, copy, 'sectionSubtitle')}</p>
      </header>

      <SwitchModule
        title={text(props, copy, 'openTitle')}
        description={text(props, copy, 'openDescription')}
        checked={on}
        data-interactive-reader-open-mode={mode}
        onChange={next => { props.prefs.actions.setDeliverableOpenMode(next ? 'sidebar' : 'external'); }}
      />

      <SwitchModule
        title={text(props, copy, 'glassTitle')}
        description={text(props, copy, 'glassDescription')}
        checked={glass}
        data-interactive-reader-glass={glass ? 'on' : 'off'}
        onChange={next => { props.prefs.actions.setFrostedGlass(next); }}
      />

      <SwitchModule
        title={text(props, copy, 'foldTitle')}
        description={text(props, copy, 'foldDescription')}
        checked={autoFold}
        data-interactive-reader-auto-fold={autoFold ? 'on' : 'off'}
        onChange={next => {
          props.prefs.actions.setAutoFold?.(next);
          props.prefs.actions.setFoldIntensity?.(next ? 1 : 0);
        }}
      />

      <FoldModule
        title={text(props, copy, 'fnosTitle')}
        data-interactive-reader-fnos
        data-fnos-configured={fnosUrl.trim() !== '' || undefined}
      >
        <p className={css.moduleDesc}>{text(props, copy, 'fnosDescription')}</p>
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
      </FoldModule>

      <FoldModule
        title={text(props, copy, 'skillTitle')}
        trailing={
          <Tag tone={skill?.installed ? 'success' : 'neutral'}>
            {skill?.installed ? text(props, copy, 'skillInstalled') : text(props, copy, 'skillMissing')}
          </Tag>
        }
        data-interactive-reader-skill={skill?.installed ? 'installed' : 'missing'}
      >
        <p className={css.moduleDesc}>{text(props, copy, 'skillPurpose')}</p>
        <p className={css.moduleDesc}>{text(props, copy, 'skillPluginNote')}</p>
        {skill && !skill.installed ? (
          <>
            <p className={css.moduleDesc}>{skill.hostReached ? text(props, copy, 'skillInstall') : text(props, copy, 'skillUnavailable')}</p>
            <pre className={css.pre}>{shortestInstallCommand()}</pre>
            <ul className={css.roots} data-interactive-reader-skill-roots>
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
      </FoldModule>
    </div>
  );
}
