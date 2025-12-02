import type { AppContainer } from '../../container/types.js';
import type { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  state: string;
  data: Record<string, unknown>;
}

export interface BotContext extends Context, SessionFlavor<SessionData> {
  container: AppContainer;
}
