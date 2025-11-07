import { EventHandler, EventData } from './index';

export interface EventBusOptions {
  maxListeners?: number;
}

export declare class EventBus {
  private events;
  private maxListeners;

  constructor(options?: EventBusOptions);

  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data?: EventData): void;
  once(event: string, handler: EventHandler): void;
  removeAllListeners(event?: string): void;
  listenerCount(event: string): number;
}