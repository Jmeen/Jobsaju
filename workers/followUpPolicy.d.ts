export type FollowUpIntent =
  | 'industry' | 'role' | 'timing' | 'offer' | 'salary' | 'wait'
  | 'quit' | 'people' | 'compare' | 'preparation' | 'general';

export type FollowUpAnswerMode =
  | 'timing' | 'amount' | 'choice' | 'method' | 'possibility' | 'explanation';

export interface QuestionAssessment {
  allowed: boolean;
  refusalReason?: 'unsafe' | 'high_stakes' | 'private_prediction' | 'prompt_injection' | 'out_of_scope';
  primaryIntent: FollowUpIntent;
  secondaryIntents: FollowUpIntent[];
  answerMode: FollowUpAnswerMode;
  constraints: string[];
}

export interface ParsedFollowUpResponse {
  question_analysis: {
    summary: string;
    primary_intent: FollowUpIntent;
    secondary_intents: FollowUpIntent[];
    answer_mode: FollowUpAnswerMode;
    constraints: string[];
  };
  answer: string;
}

export const FOLLOW_UP_INTENTS: FollowUpIntent[];
export const FOLLOW_UP_ANSWER_MODES: FollowUpAnswerMode[];
export function assessFollowUpQuestion(question: string): QuestionAssessment;
export function buildRefusalMessage(assessment: QuestionAssessment): string;
export function parseFollowUpModelResponse(raw: string | unknown): ParsedFollowUpResponse | null;
