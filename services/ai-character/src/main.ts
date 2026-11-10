import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAiLlm } from './adapters/openai';
import { loadDotEnv } from './env';
import { ChatServer } from './server';

/**
 * 로컬 개발 서버 진입점. `pnpm --filter @murmur/ai-character dev`
 * 환경 변수: OPENAI_API_KEY(필수), OPENAI_MODEL(기본 gpt-4o-mini), PORT(기본 8787). 같은 폴더 .env 도 읽는다.
 */
loadDotEnv(join(dirname(fileURLToPath(import.meta.url)), '..', '.env'));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    '[ai-character] OPENAI_API_KEY 가 없다. services/ai-character/.env 에 넣어라 (.env.example 참고).',
  );
  process.exit(1);
}
const llm = new OpenAiLlm({
  apiKey,
  ...(process.env.OPENAI_MODEL ? { model: process.env.OPENAI_MODEL } : {}),
});
const port = Number(process.env.PORT ?? 8787);
const server = new ChatServer({ llm, model: llm.model }).createHttpServer();
server.listen(port, '0.0.0.0', () => {
  console.log(`[ai-character] listening on http://0.0.0.0:${port} (model ${llm.model})`);
  console.log(
    '[ai-character] Android emulator: http://10.0.2.2:' +
      port +
      ' / iOS simulator: http://localhost:' +
      port,
  );
});
