/**
 * 简化的信号量类，用于控制并发数量
 *
 * 工作原理：
 * 1. 维护一个固定数量的"令牌"（tokens）
 * 2. 每个并发操作需要先获取令牌才能执行
 * 3. 没有令牌时，操作会被挂起等待
 * 4. 操作完成后释放令牌，唤醒等待的操作
 *
 * 这样确保同时运行的操作数量不会超过设定的并发限制，
 * 避免文件句柄耗尽、内存占用过高等问题
 */
export class SimpleSemaphore {
  /**
   * 当前可用的令牌数量
   */
  private available: number;

  /**
   * 等待队列：存储等待令牌的 resolve 函数
   */
  private waiters: Array<() => void> = [];

  /**
   * 构造函数
   * @param concurrency 最大并发数（令牌总数）
   */
  constructor(concurrency: number) {
    this.available = concurrency;
  }

  /**
   * 获取令牌（申请执行权限）
   *
   * 执行逻辑：
   * 1. 如果有可用令牌，立即获取并返回
   * 2. 如果没有令牌，创建 Promise 并加入等待队列
   * 3. 当前操作会被挂起，直到有令牌释放时被唤醒
   *
   * @returns Promise<void> 当获得令牌时 resolve
   */
  async acquire(): Promise<void> {
    // 情况1：有可用令牌，立即获取
    if (this.available > 0) {
      // 消耗一个令牌
      this.available--;
      // 立即返回，继续执行
      return;
    }

    // 情况2：没有可用令牌，需要等待
    return new Promise<void>((resolve) => {
      // 将 resolve 函数包装后放入等待队列
      // 当有令牌释放时，会调用这个函数唤醒等待者
      this.waiters.push(() => {
        // 消耗令牌
        this.available--;
        // 唤醒等待的 acquire() 调用
        resolve();
      });
    });
  }

  /**
   * 释放令牌（归还执行权限）
   *
   * 执行逻辑：
   * 1. 优先唤醒等待队列中的第一个等待者
   * 2. 如果没有等待者，增加可用令牌数
   *
   * 这样确保令牌总数始终保持不变
   */
  release(): void {
    // 情况1：有等待者，立即唤醒第一个
    if (this.waiters.length > 0) {
      // 取出队列头部的 resolve 函数
      const resolve = this.waiters.shift()!;
      // 调用 resolve，唤醒对应的 acquire() 调用
      resolve();
      // 注意：这里不增加 available，因为令牌直接转给了等待者
    }
    // 情况2：没有等待者，归还令牌到令牌池
    else {
      // 增加可用令牌数
      this.available++;
    }
  }

  /**
   * 并发映射处理静态方法
   *
   * 类似于 Promise.all(array.map(fn))，但具有并发数量控制
   *
   * @param items 待处理的数组项目
   * @param concurrency 最大并发数量
   * @param processor 处理函数，接收数组项目，返回处理结果的Promise
   * @param errorHandler 错误处理策略，'ignore' = 忽略错误返回null，'throw' = 抛出错误，默认 'ignore'
   * @returns Promise<T[]> 处理结果数组，忽略错误时可能包含null值
   */
  static async concurrentMap<T, R>(
    items: T[],
    concurrency: number,
    processor: (item: T) => Promise<R>,
    errorHandler: 'ignore' | 'throw' = 'ignore'
  ): Promise<(R | null)[]> {
    const semaphore = new SimpleSemaphore(concurrency);

    const promises = items.map(async (item) => {
      await semaphore.acquire();
      try {
        return await processor(item);
      } catch (error) {
        if (errorHandler === 'throw') {
          throw error;
        }
        // errorHandler === 'ignore'，返回null
        return null;
      } finally {
        semaphore.release();
      }
    });

    return await Promise.all(promises);
  }

  /**
   * 并发映射处理静态方法（过滤null值版本）
   *
   * 与 concurrentMap 相同，但会自动过滤掉null/undefined结果
   *
   * @param items 待处理的数组项目
   * @param concurrency 最大并发数量
   * @param processor 处理函数，接收数组项目，返回处理结果的Promise
   * @returns Promise<R[]> 处理结果数组，已过滤null/undefined值
   */
  static async concurrentMapFiltered<T, R>(
    items: T[],
    concurrency: number,
    processor: (item: T) => Promise<R | null | undefined>
  ): Promise<R[]> {
    const results = await SimpleSemaphore.concurrentMap(items, concurrency, processor, 'ignore');
    return results.filter((result): result is R => result != null);
  }
}
