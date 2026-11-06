import type { ReportReason } from '@murmur/shared-types';

/**
 * 신고 보존 창(초). 신고 시점 직전 이 길이만큼의 face-protocol 프레임과 음성을 증거로 보존한다.
 * 원본 카메라 영상은 애초에 기기 밖으로 나오지 않으므로 증거에 포함될 수 없다.
 */
export const EVIDENCE_WINDOW_SEC = 30;

export type ReportPriority = 'urgent' | 'normal';

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetId: string;
  reason: ReportReason;
  sessionId: string;
  evidenceWindowSec: number;
  priority: ReportPriority;
  createdAt: number;
}

/** 즉시 알림이 필요한 사유. n8n 신고 큐가 이 값을 보고 담당자에게 바로 알린다. */
const URGENT_REASONS: readonly ReportReason[] = ['self-harm-risk', 'minor'];

export function priorityFor(reason: ReportReason): ReportPriority {
  return URGENT_REASONS.includes(reason) ? 'urgent' : 'normal';
}

export class ReportStore {
  private readonly reports: ReportRecord[] = [];

  constructor(
    private readonly newId: () => string,
    private readonly now: () => number = Date.now,
  ) {}

  record(input: {
    reporterId: string;
    targetId: string;
    reason: ReportReason;
    sessionId: string;
  }): ReportRecord {
    const rec: ReportRecord = {
      id: this.newId(),
      ...input,
      evidenceWindowSec: EVIDENCE_WINDOW_SEC,
      priority: priorityFor(input.reason),
      createdAt: this.now(),
    };
    this.reports.push(rec);
    return rec;
  }

  all(): readonly ReportRecord[] {
    return this.reports;
  }

  urgent(): ReportRecord[] {
    return this.reports.filter((r) => r.priority === 'urgent');
  }
}
