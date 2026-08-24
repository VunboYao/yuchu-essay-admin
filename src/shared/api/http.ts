import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { env } from '../config/env'
import { useAuthStore } from '@/features/auth/auth-store'
import type { ApiResponse } from '../types'
import { ApiError } from './api-error'

const http = axios.create({
  baseURL: env.VITE_API_BASE,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function isLoginRequest(url: string | undefined): boolean {
  return (url?.split('?')[0] ?? '') === '/auth/login'
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // 登录 401 是密码错误，不是会话过期；清态会冲掉 ?redirect=
      if (!isLoginRequest(error.config?.url)) {
        useAuthStore.getState().clear()
      }
    }
    return Promise.reject(error)
  },
)

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null) return false
  if (!('code' in value) || !('message' in value)) return false
  return typeof value.code === 'number' && typeof value.message === 'string'
}

function unpack<T>(envelope: ApiResponse<T>, httpStatus?: number): T {
  if (envelope.code === 0 && envelope.data !== undefined && envelope.data !== null) {
    return envelope.data
  }
  throw new ApiError({
    message: envelope.message || '请求失败',
    status: httpStatus,
    code: envelope.code,
    isUnauthorized: httpStatus === 401,
  })
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    if (!isApiResponse<T>(response.data)) {
      throw new ApiError({
        message: '响应格式错误',
        status: response.status,
        isUnauthorized: response.status === 401,
      })
    }
    return unpack(response.data, response.status)
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (!axios.isAxiosError(error)) {
      throw new ApiError({ message: '请求失败', isUnauthorized: false })
    }
    const { response } = error
    if (!response) {
      throw new ApiError({ message: '网络异常', isUnauthorized: false })
    }
    if (isApiResponse<T>(response.data)) {
      return unpack(response.data, response.status)
    }
    throw new ApiError({
      message: error.message || '请求失败',
      status: response.status,
      isUnauthorized: response.status === 401,
    })
  }
}

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'GET', url })
}

export function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'POST', url, data: body })
}
