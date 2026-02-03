/**
 * 统一数据结果接口
 * @template T - 数据字段的类型（支持任意类型：基本类型、数组、对象等）
 */
export interface Result<T = unknown> {
  /** 操作是否成功 */
  success: boolean;
  /** 错误码（成功时通常为 0，失败时为具体错误编号） */
  code: number;
  /** 错误信息（成功时可为空字符串，失败时为具体描述） */
  message: string;
  /** 业务数据（成功时为具体数据，失败时可能为 null/undefined） */
  data: T;
}