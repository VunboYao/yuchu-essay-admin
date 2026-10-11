import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 没开 globals，Testing Library 不会自己挂 afterEach；显式清一次，
// 否则上一个用例的 DOM 会留在 document.body 里，getBy* 直接报重复匹配。
afterEach(() => {
  cleanup()
})
