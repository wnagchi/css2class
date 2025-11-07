import { EventHandler, EventData } from '../../types';

interface EventBusOptions {
  maxListeners?: number;
}

export class EventBus {
  private events: Map<string, EventHandler[]> = new Map();
  private maxListeners: number = 10;

  constructor(options: EventBusOptions = {}) {
    this.maxListeners = options.maxListeners || 10;
  }

  /**
   * 注册事件监听器
   */
  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const handlers = this.events.get(event)!;
    if (handlers.length >= this.maxListeners) {
      console.warn(`EventBus: Maximum listeners (${this.maxListeners}) exceeded for event "${event}"`);
    }

    handlers.push(handler);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }

      if (handlers.length === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, data?: EventData): void {
    const handlers = this.events.get(event);
    if (handlers && handlers.length > 0) {
      // 复制数组避免在执行过程中被修改
      const handlersCopy = [...handlers];
      handlersCopy.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventBus: Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * 注册一次性事件监听器
   */
  once(event: string, handler: EventHandler): void {
    const onceHandler: EventHandler = (data?: EventData) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * 移除所有监听器或指定事件的监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * 获取指定事件的所有监听器
   */
  listeners(event: string): EventHandler[] {
    const handlers = this.events.get(event);
    return handlers ? [...handlers] : [];
  }

  /**
   * 设置最大监听器数量
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  /**
   * 获取最大监听器数量
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

export default EventBus;