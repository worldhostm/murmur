import { describe, expect, it } from 'vitest';
import { EVIDENCE_WINDOW_SEC, ReportStore } from '../src/moderation';

describe('ReportStore', () => {
  it('marks self-harm-risk and minor as urgent, others normal', () => {
    let n = 0;
    const store = new ReportStore(
      () => `r${++n}`,
      () => 0,
    );
    const a = store.record({
      reporterId: 'u1',
      targetId: 'u2',
      reason: 'self-harm-risk',
      sessionId: 's',
    });
    const b = store.record({ reporterId: 'u1', targetId: 'u2', reason: 'minor', sessionId: 's' });
    const c = store.record({
      reporterId: 'u1',
      targetId: 'u2',
      reason: 'harassment',
      sessionId: 's',
    });
    expect(a.priority).toBe('urgent');
    expect(b.priority).toBe('urgent');
    expect(c.priority).toBe('normal');
    expect(a.evidenceWindowSec).toBe(EVIDENCE_WINDOW_SEC);
    expect(store.urgent().map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});
