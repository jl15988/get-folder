/**
 * 正则工具
 */
export class RegExpUtil {
  /**
   * 测试 val 是否符合 testRegs 规则
   * @param testRegs 正则规则
   * @param val 值
   */
  static tests(testRegs: RegExp[], val: string): boolean {
    return testRegs.some(pattern => pattern.test(val));
  }
}