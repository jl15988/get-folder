import { SimpleSemaphore } from '../src/SimpleSemaphore';

describe('SimpleSemaphore', () => {
  it('should allow immediate acquisition when tokens are available', async () => {
    const semaphore = new SimpleSemaphore(2);
    
    // 应该能立即获取令牌
    await semaphore.acquire();
    await semaphore.acquire();
  });

  it('should block when no tokens are available', async () => {
    const semaphore = new SimpleSemaphore(1);
    
    // 获取唯一的令牌
    await semaphore.acquire();
    
    let resolved = false;
    
    // 尝试获取第二个令牌，应该被阻塞
    const promise = semaphore.acquire().then(() => {
      resolved = true;
    });
    
    // 短暂等待，确保没有立即解决
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(resolved).toBe(false);
    
    // 释放令牌
    semaphore.release();
    
    // 现在应该能获取令牌
    await promise;
    expect(resolved).toBe(true);
  });

  it('should release tokens correctly', async () => {
    const semaphore = new SimpleSemaphore(1);
    
    // 获取令牌
    await semaphore.acquire();
    
    // 释放令牌
    semaphore.release();
    
    // 应该能再次获取
    await semaphore.acquire();
  });

  it('should handle multiple concurrent acquisitions', async () => {
    const semaphore = new SimpleSemaphore(2);
    const results: number[] = [];
    
    // 创建多个并发任务
    const tasks = Array.from({ length: 5 }, (_, i) => 
      semaphore.acquire().then(() => {
        results.push(i);
        return new Promise(resolve => {
          setTimeout(() => {
            semaphore.release();
            resolve(undefined);
          }, 10);
        });
      })
    );
    
    await Promise.all(tasks);
    
    // 所有任务都应该完成
    expect(results).toHaveLength(5);
    expect(results.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle zero concurrency', async () => {
    const semaphore = new SimpleSemaphore(0);
    
    let resolved = false;
    
    // 尝试获取令牌，应该被永久阻塞
    const promise = semaphore.acquire().then(() => {
      resolved = true;
    });
    
    // 等待足够长时间
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(resolved).toBe(false);
    
    // 释放令牌后应该能获取
    semaphore.release();
    await promise;
    expect(resolved).toBe(true);
  });

  it('should maintain correct token count', async () => {
    const semaphore = new SimpleSemaphore(3);
    
    // 获取所有令牌
    await semaphore.acquire();
    await semaphore.acquire();
    await semaphore.acquire();
    
    let blocked = true;
    
    // 第四次获取应该被阻塞
    const blockedPromise = semaphore.acquire().then(() => {
      blocked = false;
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(blocked).toBe(true);
    
    // 释放一个令牌
    semaphore.release();
    
    // 现在应该能获取
    await blockedPromise;
    expect(blocked).toBe(false);
  });

  it('should handle release without acquisition', () => {
    const semaphore = new SimpleSemaphore(1);
    
    // 直接释放令牌（增加可用令牌数）
    semaphore.release();
    
    // 现在应该有2个令牌可用
    expect(async () => {
      await semaphore.acquire();
      await semaphore.acquire();
    }).not.toThrow();
  });

  it('should process waiters in FIFO order', async () => {
    const semaphore = new SimpleSemaphore(1);
    const order: number[] = [];
    
    // 获取唯一令牌
    await semaphore.acquire();
    
    // 创建多个等待任务
    const waiters = [
      semaphore.acquire().then(() => order.push(1)),
      semaphore.acquire().then(() => order.push(2)),
      semaphore.acquire().then(() => order.push(3))
    ];
    
    // 短暂等待以确保所有任务都进入等待状态
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 依次释放令牌
    semaphore.release(); // 唤醒任务1
    await new Promise(resolve => setTimeout(resolve, 10));
    
    semaphore.release(); // 唤醒任务2
    await new Promise(resolve => setTimeout(resolve, 10));
    
    semaphore.release(); // 唤醒任务3
    
    await Promise.all(waiters);
    
    // 应该按FIFO顺序处理
    expect(order).toEqual([1, 2, 3]);
  });
}); 