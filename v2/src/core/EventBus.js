class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  once(event, callback) {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, []);
    }
    this.onceEvents.get(event).push(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    
    if (this.onceEvents.has(event)) {
      const callbacks = this.onceEvents.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    // 处理普通事件
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`EventBus error in event '${event}':`, error);
        }
      });
    }

    // 处理一次性事件
    if (this.onceEvents.has(event)) {
      const callbacks = this.onceEvents.get(event);
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`EventBus error in once event '${event}':`, error);
        }
      });
      this.onceEvents.delete(event);
    }
  }

  clear() {
    this.events.clear();
    this.onceEvents.clear();
  }

  getEventCount(event) {
    const normalCount = this.events.has(event) ? this.events.get(event).length : 0;
    const onceCount = this.onceEvents.has(event) ? this.onceEvents.get(event).length : 0;
    return normalCount + onceCount;
  }
}

module.exports = EventBus; 