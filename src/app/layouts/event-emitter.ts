/**
 * 类型安全的事件发射器 — 轻量级 pub/sub 实现
 */

export type EventListener<T> = (payload: T) => void;

export interface EventEmitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): () => void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  clear(): void;
}

export function createEventEmitter<
  Events extends Record<string, unknown>
>(prefix?: string): EventEmitter<Events> {
  const listeners: {
    [K in keyof Events]?: EventListener<Events[K]>[];
  } = {};

  return {
    on<K extends keyof Events>(
      event: K,
      listener: EventListener<Events[K]>
    ): () => void {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event]!.push(listener);

      return () => {
        const list = listeners[event];
        if (list) {
          const index = list.indexOf(listener);
          if (index > -1) {
            list.splice(index, 1);
          }
        }
      };
    },

    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      const list = listeners[event];
      if (list) {
        [...list].forEach((listener) => {
          try {
            listener(payload);
          } catch (err) {
            console.error(
            `[${prefix || 'EventEmitter'}] Event handler error for ${String(event)}:`,
            err
          );
          }
        });
      }
    },

    clear(): void {
      for (const key in listeners) {
        delete listeners[key];
      }
    }
  };
}
