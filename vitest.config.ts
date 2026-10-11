import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// qiankun 的 Vite 插件对测试是空转：读它的源码，只做两件事——给 dev/preview 加 CORS 头，
// 以及构建时给 index.html 的入口 script 打 entry 标记。vitest 两件都不走，留着也不会坏。
// 仍然摘掉，是防它以后升级成会改写模块的插件（改掉动态 import() 在 ESM 沙箱下会让测试挂）。
const plugins = (viteConfig.plugins ?? []).flat().filter((plugin) => {
  const name = plugin && typeof plugin === 'object' && 'name' in plugin ? plugin.name : undefined
  return name !== 'qiankun'
})

// 别名、resolve 仍从 vite.config 来，避免测试和运行时两套真相。
export default mergeConfig(
  { ...viteConfig, plugins },
  defineConfig({
    test: {
      environment: 'jsdom',
      restoreMocks: true,
      setupFiles: ['./test/setup.ts'],
      // env.ts 在模块顶层 parse VITE_API_BASE，缺了直接抛。
      // 测试跑的是 mode=test，不会读 .env.development，所以这里补上。
      env: {
        VITE_API_BASE: '/admin/api/v1',
      },
    },
  }),
)
