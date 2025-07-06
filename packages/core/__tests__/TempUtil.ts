import {promises as fs} from "fs";
import {join} from "path";
import os from "os";

export class TempUtil {

  /**
   * 基础目录，用于记录构造函数参数
   */
  private readonly baseDir: string;

  /**
   * 临时目录空间，指不同测试的临时目录
   */
  private readonly dir: string;

  /**
   * 临时目录，指整个测试的临时目录
   */
  private static tempDir = '';

  /**
   * 初始化临时目录，可选主动调用，因为调用 of 方法会先执行此方法
   */
  static async init() {
    if (!TempUtil.tempDir) {
      TempUtil.tempDir = await fs.mkdtemp(join(os.tmpdir(), 'folder-size-test-'));
    }
  }

  constructor(dir: string = '') {
    this.baseDir = dir;
    this.dir = join(TempUtil.tempDir, dir);
  }

  /**
   * 创建 TempUtil 对象，可选指定临时目录下的目录
   * @param dir 临时目录，用以区分不同测试
   */
  static async of(dir: string = '') {
    await this.init();
    const tempUtil = new TempUtil(dir);
    // 确保目录存在
    await fs.mkdir(tempUtil.dirPath, {recursive: true});
    return tempUtil;
  }

  /**
   * 临时目录路径
   */
  get dirPath() {
    return this.dir;
  }

  join(dir: string) {
    return TempUtil.of(join(this.baseDir, dir));
  }

  /**
   * 写入文件
   * @param fileName 文件名
   * @param content 文件内容
   */
  async write(fileName: string, content: string) {
    // 构建文件路径
    const filePath = join(this.dir, fileName);
    await fs.writeFile(filePath, content);
  }

  /**
   * 清理临时目录（所有）
   */
  static async clearTempDir() {
    await fs.rmdir(TempUtil.tempDir, {recursive: true});
  }
}

export function createTemp(dir: string) {

}
