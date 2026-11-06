/** 신고 사유. 통화 화면에서 한 번 탭으로 접근 (DESIGN_SYSTEM.md §7). */
export type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'hate'
  | 'minor'
  | 'impersonation'
  | 'self-harm-risk'
  | 'other';

export type ModerationAction = 'warn' | 'suspend' | 'ban' | 'device-block';

/** 연령 게이트. 18세 미만은 랜덤 매칭과 로맨스형 AI 대화에서 제외한다. */
export type AgeGate = 'unverified' | 'under-18' | 'adult';

/**
 * 솔로 모드 안전 장치 (PLANNING.md "솔로 모드 설계 원칙").
 * 위기 신호가 감지되면 캐릭터 연기를 멈추고 서비스의 차분한 말투로 상담 연결을 안내한다.
 */
export type SafetySignal = 'none' | 'fatigue' | 'late-night' | 'long-session' | 'crisis';

/** 한국 자살예방 상담전화. 위기 안내 문구에서 참조한다. */
export const CRISIS_HOTLINE_KR = '109';

/** 솔로 모드 휴식 권유 기준 (분). 체류 시간을 늘리는 설계는 하지 않는다. */
export const SOLO_LONG_SESSION_MINUTES = 90;
/** 심야 기준 시각 (현지 시각, 시). */
export const SOLO_LATE_NIGHT_START_HOUR = 1;
export const SOLO_LATE_NIGHT_END_HOUR = 5;
