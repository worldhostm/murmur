export * from './adapters/types';
export * from './adapters/fake';
export * from './adapters/openai';
export { expressionSignalsFromFrame, smoothSignals, NEUTRAL_SIGNALS } from './signals';
export { visemesToFaceFrames, VISEME_TABLE } from './visemeToFace';
export type { VisemeToFaceOptions } from './visemeToFace';
export * from './persona';
export {
  detectCrisis,
  crisisResponse,
  shouldSuggestRest,
  restSuggestion,
  CRISIS_KEYWORDS,
} from './safety';
export type { RestCheckInput } from './safety';
export { ConversationPipeline } from './pipeline';
export type { PipelineOptions, PipelineResponse } from './pipeline';
