import { get, post, put } from '@/shared/api'
import type { TaxonomyUnit, PageData } from '@/shared/types'
import type { EnableStatus, Grade, Semester } from '@/shared/constants/options'
import type { TaxonomyUnitWriteOutput } from './schemas'

export type getTaxonomyUnitsList = {
  grade: Grade | ''
  semester: Semester | ''
  status: EnableStatus | ''
  page: number
  pageSize: number
}

function toTaxonomyUnitsListParams(query: getTaxonomyUnitsList) {
  return {
    grade: query.grade === '' ? undefined : query.grade,
    semester: query.semester === '' ? undefined : query.semester,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listTaxonomyUnits(
  query: getTaxonomyUnitsList,
  signal?: AbortSignal,
): Promise<PageData<TaxonomyUnit>> {
  return get<PageData<TaxonomyUnit>>('/taxonomy-units', {
    params: toTaxonomyUnitsListParams(query),
    signal,
  })
}

export function createTaxonomyUnit(input: TaxonomyUnitWriteOutput): Promise<TaxonomyUnit> {
  return post<TaxonomyUnit>('/taxonomy-units', input)
}

export function updateTaxonomyUnit(options: {
  id: number
  input: TaxonomyUnitWriteOutput
}): Promise<TaxonomyUnit> {
  return put<TaxonomyUnit>(`/taxonomy-units/${options.id}`, options.input)
}
