import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import type { SpriteExpression } from '@murmur/expression-cues';
import type { LlmAdapter } from './adapters/types';
import { FakeStt, FakeTts } from './adapters/fake';
import { PERSONAS } from './persona';
import { ConversationPipeline } from './pipeline';
import { NEUTRAL_SIGNALS } from './signals';

export interface ChatRequestBody {
  sessionId: string;
  characterId: AiCharacterId;
  text: string;
  adultVerified?: boolean;
}

export interface ChatResponseBody {
  text: string;
  expression: SpriteExpression;
  crisis: boolean;
}

export interface ChatServerOptions {
  llm: LlmAdapter;
  /** /health 에 보여줄 모델 이름. */
  model?: string;
  /** 비활성 세션을 지우는 기준. 기본 30분. */
  sessionTtlMs?: number;
  /** 테스트용 시계. */
  now?: () => number;
}

interface Session {
  pipeline: ConversationPipeline;
  characterId: AiCharacterId;
  adultVerified: boolean;
  lastUsed: number;
}

const CHARACTER_IDS = new Set<string>(AI_CHARACTERS.map((c) => c.id));
const MAX_TEXT_LENGTH = 2000;
const MAX_BODY_BYTES = 64 * 1024;

/**
 * 솔로 채팅용 HTTP 서버 (프레임워크 없음).
 *   POST /chat { sessionId, characterId, text, adultVerified? } → { text, expression, crisis }
 *   GET  /health → { ok, model }
 * sessionId 별로 ConversationPipeline 을 메모리에 두어 대화 기록을 잇는다. 서버가 재시작되면 기록은 사라진다.
 * STT/TTS 는 텍스트 채팅에 필요 없어 가짜 어댑터를 꽂고, 프레임·오디오는 버린다.
 */
export class ChatServer {
  readonly sessions = new Map<string, Session>();
  private readonly llm: LlmAdapter;
  private readonly model: string;
  private readonly ttl: number;
  private readonly now: () => number;

  constructor(opts: ChatServerOptions) {
    this.llm = opts.llm;
    this.model = opts.model ?? 'unknown';
    this.ttl = opts.sessionTtlMs ?? 30 * 60 * 1000;
    this.now = opts.now ?? Date.now;
  }

  async chat(body: ChatRequestBody): Promise<ChatResponseBody> {
    this.evictStale();
    const session = this.sessionFor(body);
    session.lastUsed = this.now();
    const res = await session.pipeline.respond(body.text, NEUTRAL_SIGNALS);
    return { text: res.text, expression: res.expression, crisis: res.crisis };
  }

  private sessionFor(body: ChatRequestBody): Session {
    const existing = this.sessions.get(body.sessionId);
    // 같은 세션에서 캐릭터가 바뀌면 기록을 새로 시작한다 (다른 페르소나에 이전 대화를 섞지 않는다).
    if (existing && existing.characterId === body.characterId) return existing;
    const adultVerified = body.adultVerified ?? false;
    const pipeline = new ConversationPipeline(
      { stt: new FakeStt([]), llm: this.llm, tts: new FakeTts() },
      PERSONAS[body.characterId],
      { mode: 'solo', adultVerified },
    );
    const session: Session = {
      pipeline,
      characterId: body.characterId,
      adultVerified,
      lastUsed: this.now(),
    };
    this.sessions.set(body.sessionId, session);
    return session;
  }

  private evictStale(): void {
    const cutoff = this.now() - this.ttl;
    for (const [id, s] of this.sessions) if (s.lastUsed < cutoff) this.sessions.delete(id);
  }

  /** node:http 서버. listen 은 호출자가 한다. */
  createHttpServer(): Server {
    return createServer((req, res) => {
      void this.handle(req, res);
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        return json(res, 200, { ok: true, model: this.model });
      }
      if (req.method === 'POST' && req.url === '/chat') {
        const parsed = parseChatBody(await readBody(req));
        if ('error' in parsed) return json(res, 400, { error: parsed.error });
        const out = await this.chat(parsed.body);
        return json(res, 200, out);
      }
      return json(res, 404, { error: 'not found' });
    } catch (e) {
      const status = typeof (e as { status?: unknown }).status === 'number' ? 502 : 500;
      // 키·응답 원문은 남기지 않는다. 메시지만.
      console.error('[ai-character] chat failed:', (e as Error).message);
      return json(res, status, { error: status === 502 ? 'LLM 응답 실패' : '서버 오류' });
    }
  }
}

export function parseChatBody(raw: string): { body: ChatRequestBody } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: 'JSON 본문이 필요하다' };
  }
  if (typeof value !== 'object' || value === null) return { error: '객체 본문이 필요하다' };
  const v = value as Record<string, unknown>;
  if (typeof v.sessionId !== 'string' || v.sessionId.length === 0 || v.sessionId.length > 128)
    return { error: 'sessionId 가 필요하다' };
  if (typeof v.characterId !== 'string' || !CHARACTER_IDS.has(v.characterId))
    return { error: '모르는 characterId' };
  if (typeof v.text !== 'string' || v.text.trim().length === 0)
    return { error: 'text 가 필요하다' };
  if (v.text.length > MAX_TEXT_LENGTH) return { error: `text 는 ${MAX_TEXT_LENGTH}자 이하` };
  if (v.adultVerified !== undefined && typeof v.adultVerified !== 'boolean')
    return { error: 'adultVerified 는 boolean' };
  const body: ChatRequestBody = {
    sessionId: v.sessionId,
    characterId: v.characterId as AiCharacterId,
    text: v.text.trim(),
  };
  if (v.adultVerified !== undefined) body.adultVerified = v.adultVerified;
  return { body };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}
