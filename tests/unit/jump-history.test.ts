import { describe, expect, test } from 'vitest';
import { createJumpHistory } from '../../src/viewer/jump-history';

const at = (pageIndex: number, top = 0) => ({ pageIndex, top });

describe('前の画面 / 次の画面の履歴', () => {
  test('移動のたびに元の位置を積み、前の画面で戻ると次の画面へ移る', () => {
    const h = createJumpHistory();
    h.record('d', at(0));
    h.record('d', at(19, 100));
    // Now on page 50: back to page 20, then page 1
    expect(h.back('d', at(49))).toEqual(at(19, 100));
    expect(h.back('d', at(19, 100))).toEqual(at(0));
    expect(h.back('d', at(0))).toBeUndefined();
    expect(h.stacks('d')).toEqual({ back: [], forward: [at(49), at(19, 100)] });
    // Next view retraces forward
    expect(h.forward('d', at(0))).toEqual(at(19, 100));
    expect(h.forward('d', at(19, 100))).toEqual(at(49));
    expect(h.forward('d', at(49))).toBeUndefined();
  });
  test('戻ったあとに新しく移動すると、次の画面は消える（ブラウザと同じ）', () => {
    const h = createJumpHistory();
    h.record('d', at(0));
    h.back('d', at(5));
    h.record('d', at(0));
    expect(h.stacks('d')).toEqual({ back: [at(0)], forward: [] });
  });
  test('文書ごとに別の履歴を持ち、50 件で古いものから捨てる', () => {
    const h = createJumpHistory();
    for (let i = 0; i < 60; i++) h.record('a', at(i));
    expect(h.stacks('a').back).toHaveLength(50);
    expect(h.stacks('a').back[0]).toEqual(at(10));
    expect(h.stacks('b')).toEqual({ back: [], forward: [] });
  });
  test('変更を購読者に知らせる', () => {
    const h = createJumpHistory();
    let calls = 0;
    const off = h.subscribe(() => calls++);
    h.record('d', at(0));
    h.back('d', at(1));
    off();
    h.forward('d', at(0));
    expect(calls).toBe(2);
  });
});
