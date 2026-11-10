import type { FaceFrame } from '@murmur/face-protocol';
import { cueFromText } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import type {
  ChatMessage,
  ExpressionSignals,
  LlmAdapter,
  SpeechToTextAdapter,
  TextToSpeechAdapter,
  Viseme,
} from './adapters/types';
import type { CharacterPersona } from './persona/types';
import { buildSystemPrompt } from './persona/characters';
import { crisisResponse, detectCrisis } from './safety';
import { visemesToFaceFrames } from './visemeToFace';

export interface PipelineOptions {
  mode: 'solo' | 'ai-call';
  adultVerified: boolean;
  /** 아바타 프레임 fps. 기본 30. */
  fps?: number;
  /** 보관하는 대화 길이. 기본 40. */
  historyLimit?: number;
}

export interface PipelineResponse {
  text: string;
  frames: FaceFrame[];
  audioChunks: Uint8Array[];
  /** true 면 LLM 을 거치지 않고 위기 안내를 냈다. */
  crisis: boolean;
  /** 답 텍스트에서 뽑은 캐릭터 표정(표정 시트 10칸). 위기 안내는 항상 worried. LLM 이 감정 태그를 직접 내기 전까지의 휴리스틱. */
  expression: SpriteExpression;
}

/**
 * 음성 인식 → LLM → 음성 합성 → 표정 프레임.
 * 어댑터는 전부 주입한다. 테스트는 adapters/fake 로 돌린다.
 */
export class ConversationPipeline {
  private readonly history: ChatMessage[] = [];
  private readonly fps: number;
  private readonly historyLimit: number;
  private clockMs = 0;

  constructor(
    private readonly adapters: {
      stt: SpeechToTextAdapter;
      llm: LlmAdapter;
      tts: TextToSpeechAdapter;
    },
    private readonly persona: CharacterPersona,
    private readonly opts: PipelineOptions,
  ) {
    this.fps = opts.fps ?? 30;
    this.historyLimit = opts.historyLimit ?? 40;
  }

  /** 오디오 → 텍스트. 최종 청크들을 이어 붙인다. */
  async transcribe(audio: AsyncIterable<Uint8Array>): Promise<string> {
    const parts: string[] = [];
    for await (const chunk of this.adapters.stt.transcribe(audio)) {
      if (chunk.isFinal) parts.push(chunk.text);
    }
    return parts.join(' ').trim();
  }

  async respond(userText: string, signals: ExpressionSignals): Promise<PipelineResponse> {
    this.push({ role: 'user', content: userText });
    const crisis = detectCrisis(userText);

    let text: string;
    if (crisis) {
      // 위기 경로: 캐릭터 연기를 멈추고 서비스 말투로 안내한다. LLM 을 거치지 않는다.
      text = crisisResponse();
    } else {
      const system = buildSystemPrompt(this.persona, {
        mode: this.opts.mode,
        adultVerified: this.opts.adultVerified,
        signals,
      });
      let out = '';
      for await (const token of this.adapters.llm.stream({
        system,
        messages: [...this.history],
        userSignals: signals,
      })) {
        out += token;
      }
      text = out;
    }
    this.push({ role: 'assistant', content: text });

    const audioChunks: Uint8Array[] = [];
    const visemes: Viseme[] = [];
    for await (const chunk of this.adapters.tts.synthesize(text, this.persona.voice)) {
      audioChunks.push(chunk.audio);
      visemes.push(...chunk.visemes);
    }
    const frames = visemesToFaceFrames(visemes, { fps: this.fps, startTimestampMs: this.clockMs });
    const last = frames[frames.length - 1];
    if (last) this.clockMs = last.timestampMs + 1000 / this.fps;

    const expression: SpriteExpression = crisis ? 'worried' : cueFromText(text);
    return { text, frames, audioChunks, crisis, expression };
  }

  getHistory(): readonly ChatMessage[] {
    return this.history;
  }

  /**
   * 대화 요약. 지금은 마지막 사용자/캐릭터 발화를 돌려주는 자리표시자다.
   * TODO: LlmAdapter 로 요약을 생성하고 memoryScope 에 맞는 항목만 남긴다.
   */
  summarize(): { lastUser: string | null; lastAssistant: string | null } {
    const lastUser = [...this.history].reverse().find((m) => m.role === 'user')?.content ?? null;
    const lastAssistant =
      [...this.history].reverse().find((m) => m.role === 'assistant')?.content ?? null;
    return { lastUser, lastAssistant };
  }

  private push(msg: ChatMessage): void {
    this.history.push(msg);
    while (this.history.length > this.historyLimit) this.history.shift();
  }
}
