import { describe, expect, test } from 'vitest'
import { tagKeys } from '../src/features/tag/queries'
import type { TagListQuery } from '../src/features/tag/api'

const base: TagListQuery = { status: '', page: 1, pageSize: 10 }

describe('tagKeys 工厂', () => {
  test('list 的 key 是 all → lists → 具体条件', () => {
    expect(tagKeys.all).toEqual(['tags'])
    expect(tagKeys.lists()).toEqual(['tags', 'list'])
    expect(tagKeys.list(base)).toEqual(['tags', 'list', base])
  })

  test('lists 是任意一页 list 的前缀，失效一次能打掉所有列表', () => {
    const prefix = tagKeys.lists()
    const pages = [
      tagKeys.list(base),
      tagKeys.list({ ...base, page: 2 }),
      tagKeys.list({ ...base, keyword: '范文' }),
    ]

    for (const key of pages) {
      // 失效那侧只调 invalidateQueries({ queryKey: tagKeys.lists() })，
      // 不记住当前 page；这条断言就是这个约定能不能成立的证据。
      expect(key.slice(0, prefix.length)).toEqual([...prefix])
    }
  })

  test('筛选或分页变了就是另一条缓存身份', () => {
    expect(tagKeys.list(base)).not.toEqual(tagKeys.list({ ...base, page: 2 }))
    expect(tagKeys.list(base)).not.toEqual(
      tagKeys.list({ ...base, keyword: '范文' }),
    )
  })
})
