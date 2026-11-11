import type { AgeGate } from '@murmur/shared-types';
export type { ClientMessage, ServerEvent, ErrorCode } from '@murmur/shared-types';

export interface QueuedUser {
  id: string;
  ageGate: AgeGate;
  enqueuedAt: number;
}
