import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { ApiError } from '../src/shared/api/api-error'
import { useAuthStore } from '../src/features/auth/auth-store'

type Reply = { status: number; data: unknown }

let reply: Reply = { status: 200, data: { code: 0, message: 'ok', data: null } }
const sent: Array<{ url: string; method: string; authorization?: string }> = []

// http.ts 在模块顶层 axios.create()，实例 defaults 是那一刻从 axios.defaults 合并来的。
// 所以必须先换掉 adapter，再动态 import http —— 顺序反了这个测试就测的是真网络。
axios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
  sent.push({
    url: config.url ?? '',
    method: (config.method ?? 'get').toLowerCase(),
    authorization: config.headers?.Authorization as string | undefined,
  })

  const response = {
    data: reply.data,
    status: reply.status,
    statusText: '',
    headers: {},
    config,
  } as AxiosResponse

  // status === 0 用来模拟「请求没出去」：没有 response 的 AxiosError
  if (reply.status === 0) {
    throw new AxiosError('Network Error', 'ERR_NETWORK', config)
  }
  if (reply.status >= 400) {
    throw new AxiosError('Request failed', String(reply.status), config, undefined, response)
  }
  return response
}

let api: typeof import('../src/shared/api/http')

beforeAll(async () => {
  api = await import('../src/shared/api/http')
})

beforeEach(() => {
  reply = { status: 200, data: { code: 0, message: 'ok', data: { id: 1 } } }
  sent.length = 0
  localStorage.clear()
  useAuthStore.setState({ token: null, adminInfo: null, skipRedirect: false })
})

describe('解包', () => {
  test('code === 0 时直接拿到 data', async () => {
    await expect(api.get<{ id: number }>('/tags')).resolves.toEqual({ id: 1 })
  })

  test('HTTP 200 但 code !== 0 一样是失败，带业务码和 message', async () => {
    reply = { status: 200, data: { code: 1001, message: '标签名已存在', data: null } }

    const error = await api.get('/tags').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: '标签名已存在', code: 1001 })
  })

  test('body 不是信封时按「响应格式错误」处理，不把半截数据交给页面', async () => {
    reply = { status: 200, data: { hello: 'world' } }
    await expect(api.get('/tags')).rejects.toThrow('响应格式错误')
  })

  test('请求没出去（没有 response）时报「网络异常」', async () => {
    reply = { status: 0, data: null }
    await expect(api.get('/tags')).rejects.toThrow('网络异常')
  })
})

describe('鉴权', () => {
  test('有 token 时请求带 Authorization 头', async () => {
    useAuthStore.setState({ token: 'abc123', adminInfo: null, skipRedirect: false })

    await api.get('/tags')

    expect(sent.at(-1)?.authorization).toBe('Bearer abc123')
  })

  test('业务接口 401 清会话，并抛出 isUnauthorized 的 ApiError', async () => {
    useAuthStore.setState({ token: 'expired', adminInfo: null, skipRedirect: false })
    reply = { status: 401, data: { code: 401, message: '登录已过期', data: null } }

    const error = await api.get('/tags').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ isUnauthorized: true, status: 401 })
    expect(useAuthStore.getState().token).toBeNull()
  })

  test('登录接口 401 不清会话 —— 那是密码错，不是会话过期', async () => {
    useAuthStore.setState({ token: 'stale', adminInfo: null, skipRedirect: false })
    reply = { status: 401, data: { code: 401, message: '账号或密码错误', data: null } }

    await api.post('/auth/login', { username: 'admin', password: 'x' }).catch(() => null)

    // 清了会把地址上的 ?redirect= 一起冲掉，用户再登录就回不到原页面
    expect(useAuthStore.getState().token).toBe('stale')
  })

  test('登录接口带 query 时仍算登录接口', async () => {
    useAuthStore.setState({ token: 'stale', adminInfo: null, skipRedirect: false })
    reply = { status: 401, data: { code: 401, message: '账号或密码错误', data: null } }

    await api.post('/auth/login?from=web', {}).catch(() => null)

    expect(useAuthStore.getState().token).toBe('stale')
  })
})
