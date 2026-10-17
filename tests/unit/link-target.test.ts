import { describe, expect, test } from 'vitest';
import { PdfActionType, PdfZoomMode, type PdfDestinationObject } from '@embedpdf/models';
import { isOpenableUri, resolveLinkTarget } from '../../src/viewer/link-target';

const height = (i: number) => (i < 3 ? 842 : undefined);
const fit = (pageIndex: number): PdfDestinationObject => ({ pageIndex, zoom: { mode: PdfZoomMode.FitPage }, view: [] });
const xyz = (pageIndex: number, y: number): PdfDestinationObject => ({
  pageIndex,
  zoom: { mode: PdfZoomMode.XYZ, params: { x: 80, y, zoom: 0 } },
  view: [80, y, 0],
});

describe('リンクの行き先', () => {
  test('/Fit はページの先頭へ', () => {
    expect(resolveLinkTarget({ type: 'destination', destination: fit(1) }, height)).toEqual({
      kind: 'page',
      pageIndex: 1,
    });
  });
  test('/XYZ は上端からの位置（pt）に直す', () => {
    expect(resolveLinkTarget({ type: 'destination', destination: xyz(2, 372) }, height)).toEqual({
      kind: 'page',
      pageIndex: 2,
      top: 470,
    });
  });
  test('/XYZ の top が null（0 で届く）ならページの先頭へ', () => {
    expect(resolveLinkTarget({ type: 'destination', destination: xyz(2, 0) }, height)).toEqual({
      kind: 'page',
      pageIndex: 2,
    });
  });
  test('GoTo アクションも同じ扱い', () => {
    const target = { type: 'action' as const, action: { type: PdfActionType.Goto as const, destination: fit(0) } };
    expect(resolveLinkTarget(target, height)).toEqual({ kind: 'page', pageIndex: 0 });
  });
  test('存在しないページ・行き先なし・別ファイルは何もしない', () => {
    expect(resolveLinkTarget({ type: 'destination', destination: fit(5) }, height)).toBeNull();
    expect(resolveLinkTarget({ type: 'destination', destination: fit(-1) }, height)).toBeNull();
    expect(resolveLinkTarget(undefined, height)).toBeNull();
    const remote = {
      type: 'action' as const,
      action: { type: PdfActionType.RemoteGoto as const, destination: fit(0) },
    };
    expect(resolveLinkTarget(remote, height)).toBeNull();
  });
  test('URI は http(s)・mailto だけ開く', () => {
    const uri = (u: string) =>
      resolveLinkTarget({ type: 'action', action: { type: PdfActionType.URI, uri: u } }, height);
    expect(uri('https://example.com/')).toEqual({ kind: 'uri', uri: 'https://example.com/' });
    expect(uri('javascript:alert(1)')).toBeNull();
  });
});

describe('開いてよい URI', () => {
  test.each([
    ['https://example.com/a?b=1', true],
    ['http://example.com', true],
    ['mailto:someone@example.com', true],
    ['javascript:alert(1)', false],
    ['JavaScript:alert(1)', false],
    ['file:///C:/Windows/notepad.exe', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['www.example.com', false],
    ['', false],
  ])('%s → %s', (uri, ok) => {
    expect(isOpenableUri(uri)).toBe(ok);
  });
});
