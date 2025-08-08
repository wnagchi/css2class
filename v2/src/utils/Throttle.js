class SmartThrottle {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.timers = new Map();
    this.pending = new Set();
    this.priorities = new Map();
    this.taskCount = 0;
  }

  throttle(key, fn, delay = 200, priority = 0) {
    this.taskCount++;
    const taskId = `${key}_${this.taskCount}`;
    
    // 如果有更高优先级的任务，取消当前任务
    if (this.pending.has(key)) {
      const currentPriority = this.priorities.get(key) || 0;
      if (priority <= currentPriority) {
        this.eventBus.emit('throttle:task:ignored', { key, priority, currentPriority });
        return; // 当前任务优先级不够高，忽略
      } else {
        // 取消当前较低优先级的任务
        this.cancel(key);
        this.eventBus.emit('throttle:task:cancelled', { key, reason: 'higher_priority' });
      }
    }
    
    this.pending.add(key);
    this.priorities.set(key, priority);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.pending.delete(key);
      this.timers.delete(key);
      this.priorities.delete(key);
      
      try {
        this.eventBus.emit('throttle:task:executing', { key, priority });
        fn();
        this.eventBus.emit('throttle:task:completed', { key, priority });
      } catch (error) {
        this.eventBus.emit('throttle:task:error', { key, error });
      }
    }, delay);
    
    this.timers.set(key, timer);
    this.eventBus.emit('throttle:task:scheduled', { key, delay, priority });
  }

  cancel(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
      this.pending.delete(key);
      this.priorities.delete(key);
      this.eventBus.emit('throttle:task:cancelled', { key, reason: 'manual' });
    }
  }

  cancelAll() {
    const cancelledCount = this.timers.size;
    
    this.timers.forEach((timer, key) => {
      clearTimeout(timer);
    });
    
    this.timers.clear();
    this.pending.clear();
    this.priorities.clear();
    
    this.eventBus.emit('throttle:all:cancelled', { cancelledCount });
  }

  // 批量节流处理
  batchThrottle(tasks, delay = 200, priority = 0) {
    const batchId = `batch_${Date.now()}`;
    const results = [];
    
    this.throttle(batchId, () => {
      tasks.forEach((task, index) => {
        try {
          const result = task();
          results[index] = { success: true, result };
        } catch (error) {
          results[index] = { success: false, error };
        }
      });
      
      this.eventBus.emit('throttle:batch:completed', { batchId, results });
    }, delay, priority);
    
    return batchId;
  }

  // 优先级队列处理
  addToPriorityQueue(key, fn, priority = 0) {
    if (!this.priorityQueue) {
      this.priorityQueue = [];
    }
    
    this.priorityQueue.push({ key, fn, priority });
    this.priorityQueue.sort((a, b) => b.priority - a.priority); // 高优先级在前
    
    this.eventBus.emit('throttle:queue:added', { key, priority, queueSize: this.priorityQueue.length });
  }

  processPriorityQueue(delay = 100) {
    if (!this.priorityQueue || this.priorityQueue.length === 0) {
      return;
    }
    
    const task = this.priorityQueue.shift();
    this.throttle(task.key, task.fn, delay, task.priority);
    
    this.eventBus.emit('throttle:queue:processed', { 
      key: task.key, 
      priority: task.priority, 
      remainingTasks: this.priorityQueue.length 
    });
  }

  // 状态查询
  isPending(key) {
    return this.pending.has(key);
  }

  getPendingCount() {
    return this.pending.size;
  }

  getTimerCount() {
    return this.timers.size;
  }

  getPriority(key) {
    return this.priorities.get(key) || 0;
  }

  getStats() {
    return {
      pendingCount: this.pending.size,
      timerCount: this.timers.size,
      priorityQueueSize: this.priorityQueue ? this.priorityQueue.length : 0,
      taskCount: this.taskCount
    };
  }

  // 清理过期任务
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // 这里可以添加更复杂的清理逻辑
    // 比如清理长时间未执行的任务
    
    this.eventBus.emit('throttle:cleanup:completed', { cleanedCount });
    return cleanedCount;
  }
}

module.exports = SmartThrottle; 