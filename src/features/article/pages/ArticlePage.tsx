import { ArticleForm } from '../components/ArticleForm'
import { articleWriteSchema, type ArticleWriteInput, type ArticleWriteOutput } from '../schemas'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const initialValues: ArticleWriteInput = {
  title: '',
  slug: '',
  grade: 1,
  unit: 1,
  semester: '上册',
  textbookVersion: '',
  essayTopic: '',
  contentType: 'unit_guide',
  audience: '',
  summary: '',
  coverImg: '',
  bodyImages: [],
  tagIds: [],
  isRecommended: false,
  isHot: false,
  sortOrder: 0,
  viewAccessType: 'free',
}
export function Component() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArticleWriteInput, unknown, ArticleWriteOutput>({
    defaultValues: initialValues,
    resolver: zodResolver(articleWriteSchema),
  })
  return <ArticleForm control={control} errors={errors} />
}
