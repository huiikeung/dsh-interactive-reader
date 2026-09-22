import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navGlyph, pinNavGlyph } from '../src/client/nav-glyph.js';

const MARK = 'data-interactive-reader-nav-icon';
const LABELS = ['交互阅读', 'Interactive Reader'];

/** Minimal fake <svg>: records attribute and innerHTML writes. */
interface FakeSvg {
  attrs: Record<string, string>;
  innerHTMLWrites: number;
  _html: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  innerHTML: string;
}

function fakeSvg(): FakeSvg {
  const attrs: Record<string, string> = {};
  const svg: FakeSvg = {
    attrs,
    innerHTMLWrites: 0,
    _html: '',
    get innerHTML(): string {
      return this._html;
    },
    set innerHTML(value: string) {
      this._html = value;
      this.innerHTMLWrites += 1;
    },
    getAttribute(name: string): string | null {
      return Object.hasOwn(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name: string, value: string): void {
      attrs[name] = String(value);
    },
  };
  return svg;
}

/** Minimal fake nav cell: an <svg> contributes no text, so textContent is the label. */
interface FakeCell {
  textContent: string;
  svg: FakeSvg;
  querySelector(selector: string): FakeSvg | null;
}

function fakeCell(label: string): FakeCell {
  const cell: FakeCell = {
    textContent: label,
    svg: fakeSvg(),
    querySelector: (selector: string): FakeSvg | null => (selector === 'svg' ? cell.svg : null),
  };
  return cell;
}

interface FakeObserver {
  callback: () => void;
  target: unknown;
  options: unknown;
}

/**
 * Install a fake `document` / `MutationObserver` pair covering exactly what
 * pinNavGlyph touches, mirroring the real settings panel structure:
 * div[role=dialog] > nav > button (svg + label text).
 */
function installFakeDom(cells: FakeCell[], dialogOpen: boolean): { doc: { body: unknown }; observers: FakeObserver[]; restore(): void } {
  const observers: FakeObserver[] = [];
  const doc = {
    body: { tag: 'BODY' },
    querySelector: (selector: string): unknown => (selector === '[role="dialog"]' ? (dialogOpen ? {} : null) : null),
    querySelectorAll: (selector: string): FakeCell[] => (selector === '[role="dialog"] nav button' ? cells : []),
  };
  class StubMutationObserver {
    constructor(private readonly callback: () => void) {}
    observe(target: unknown, options: unknown): void {
      observers.push({ callback: this.callback, target, options });
    }
    disconnect(): void {}
    takeRecords(): unknown[] {
      return [];
    }
  }
  const globals = globalThis as unknown as { document?: unknown; MutationObserver?: unknown };
  const hadDocument = 'document' in globalThis;
  const previousDocument = globals.document;
  const previousObserver = globals.MutationObserver;
  globals.document = doc;
  globals.MutationObserver = StubMutationObserver;
  return {
    doc,
    observers,
    restore(): void {
      if (hadDocument) globals.document = previousDocument;
      else delete globals.document;
      if (previousObserver === undefined) delete globals.MutationObserver;
      else globals.MutationObserver = previousObserver;
    },
  };
}

test('navGlyph is the fill-based IconBrowseOutline16 geometry', () => {
  const spec = navGlyph();
  assert.equal(spec.viewBox, '0 0 16 16');
  // Rounded page plus the two text-line bars, all filled with currentColor.
  assert.equal((spec.markup.match(/<path/g) ?? []).length, 3);
  assert.ok(spec.markup.startsWith('<path d="M11.2426 4.80473V6.10551H4.75819V4.80473H11.2426Z" fill="currentColor">'));
  assert.ok(spec.markup.includes('M9.40858 7.84478V9.14557H4.75819V7.84478H9.40858Z'));
  assert.ok(spec.markup.includes('M9.23438 0.546389'));
  assert.ok(spec.markup.endsWith('</path>'));
  assert.equal(spec.stroke, undefined);
});

test('our nav cell is pinned in place, other cells keep the shell icon', () => {
  const model = fakeCell('模型');
  const zh = fakeCell('交互阅读');
  const en = fakeCell('Interactive Reader');
  const dom = installFakeDom([model, zh, en], true);
  try {
    pinNavGlyph(LABELS, MARK, navGlyph);
    for (const cell of [zh, en]) {
      assert.equal(cell.svg.attrs.viewBox, '0 0 16 16');
      assert.equal(cell.svg.attrs.fill, 'none');
      assert.equal(cell.svg.attrs['aria-hidden'], 'true');
      assert.equal(cell.svg.attrs[MARK], '1');
      // A fill-based glyph sets no stroke attributes.
      assert.equal(cell.svg.attrs.stroke, undefined);
      assert.equal(cell.svg.innerHTML, navGlyph().markup);
      assert.equal(cell.svg.innerHTMLWrites, 1);
    }
    // The shell's own cells are not written to at all.
    assert.deepEqual(model.svg.attrs, {});
    assert.equal(model.svg.innerHTML, '');
    assert.equal(model.svg.innerHTMLWrites, 0);
    // The observer guards against the shell re-rendering the nav.
    assert.equal(dom.observers.length, 1);
    assert.equal(dom.observers[0].target, dom.doc.body);
    assert.deepEqual(dom.observers[0].options, { childList: true, subtree: true });
  } finally {
    dom.restore();
  }
});

test('the mark keeps a second pass from rewriting the same svg', () => {
  const zh = fakeCell('交互阅读');
  const dom = installFakeDom([zh], true);
  try {
    pinNavGlyph(LABELS, MARK, navGlyph);
    assert.equal(zh.svg.innerHTMLWrites, 1);
    // The observer fires again over the very same, already-pinned cell.
    dom.observers[0].callback();
    assert.equal(zh.svg.innerHTMLWrites, 1);
    assert.equal(zh.svg.attrs[MARK], '1');
    assert.equal(zh.svg.innerHTML, navGlyph().markup);
  } finally {
    dom.restore();
  }
});

test('a shell re-render that recreates the cell is pinned again', () => {
  const zh = fakeCell('交互阅读');
  const dom = installFakeDom([zh], true);
  try {
    pinNavGlyph(LABELS, MARK, navGlyph);
    const first = zh.svg;
    // The shell swaps in a brand-new gear <svg>: no mark, so it gets pinned.
    zh.svg = fakeSvg();
    dom.observers[0].callback();
    assert.equal(zh.svg.attrs[MARK], '1');
    assert.equal(zh.svg.innerHTMLWrites, 1);
    assert.equal(zh.svg.innerHTML, navGlyph().markup);
    // The old element was left exactly as it was pinned.
    assert.equal(first.innerHTMLWrites, 1);
  } finally {
    dom.restore();
  }
});

test('a closed settings panel changes nothing', () => {
  const zh = fakeCell('交互阅读');
  const dom = installFakeDom([zh], false);
  try {
    pinNavGlyph(LABELS, MARK, navGlyph);
    assert.deepEqual(zh.svg.attrs, {});
    assert.equal(zh.svg.innerHTMLWrites, 0);
    // The observer is still installed, so a later open is covered.
    assert.equal(dom.observers.length, 1);
  } finally {
    dom.restore();
  }
});

test('a throwing glyph warns and keeps the shell icon', () => {
  const zh = fakeCell('交互阅读');
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]): void => {
    warnings.push(args);
  };
  const dom = installFakeDom([zh], true);
  try {
    pinNavGlyph(LABELS, MARK, () => {
      throw new Error('boom');
    });
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /nav glyph failed/);
    assert.deepEqual(zh.svg.attrs, {});
    assert.equal(zh.svg.innerHTML, '');
    assert.equal(zh.svg.innerHTMLWrites, 0);
  } finally {
    dom.restore();
    console.warn = originalWarn;
  }
});

test('a Node/test environment without document or MutationObserver is a no-op', () => {
  const zh = fakeCell('交互阅读');
  const globals = globalThis as unknown as { document?: unknown; MutationObserver?: unknown };
  const withDom = installFakeDom([zh], true);
  try {
    // No MutationObserver: nothing is touched and no observer is created.
    delete globals.MutationObserver;
    pinNavGlyph(LABELS, MARK, navGlyph);
    assert.equal(withDom.observers.length, 0);
    assert.deepEqual(zh.svg.attrs, {});
  } finally {
    withDom.restore();
  }
  const withoutDom = installFakeDom([zh], true);
  try {
    // No document: the guard returns before touching anything.
    delete globals.document;
    pinNavGlyph(LABELS, MARK, navGlyph);
    assert.equal(withoutDom.observers.length, 0);
    assert.deepEqual(zh.svg.attrs, {});
  } finally {
    withoutDom.restore();
  }
});
