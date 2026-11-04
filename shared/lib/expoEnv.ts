/**
 * Expo/RN 环境变量静态映射。
 *
 * Metro 只会在打包时内联**静态成员表达式** `process.env.EXPO_PUBLIC_*`；
 * 动态访问（如 `process.env[`EXPO_PUBLIC_${key}`]`）永远不会被内联进
 * bundle，因此必须把每个变量写成字面量表达式。
 *
 * 新增 EXPO_PUBLIC_* 变量时：
 *   1. 在下方 switch 中追加一个 case（与 .env.example 保持同步）；
 *   2. key 使用去掉 EXPO_PUBLIC_ 前缀的 bare 名。
 */
export function getExpoPublicEnv(bareKey: string): string | undefined {
  // typeof 守卫：Vite 客户端构建中 process 未定义，避免运行时 ReferenceError
  if (typeof process === 'undefined' || !process.env) return undefined
  switch (bareKey) {
    case 'SUPABASE_URL':
      return process.env.EXPO_PUBLIC_SUPABASE_URL
    case 'SUPABASE_ANON_KEY':
      return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    case 'API_BASE_URL':
      return process.env.EXPO_PUBLIC_API_BASE_URL
    case 'DESKTOP_API_BASE_URL':
      return process.env.EXPO_PUBLIC_DESKTOP_API_BASE_URL
    case 'IOS_API_BASE_URL':
      return process.env.EXPO_PUBLIC_IOS_API_BASE_URL
    case 'ANDROID_API_BASE_URL':
      return process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL
    case 'MOBILE_API_BASE_URL':
      return process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL
    case 'SYNC_SERVER_URL':
      return process.env.EXPO_PUBLIC_SYNC_SERVER_URL
    default:
      return undefined
  }
}
