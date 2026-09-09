import { queryOptions } from '@tanstack/react-query'

import { getFeedbackList, type FeedbackListQuery } from './api'

export const feedbackKeys = {
  all: ['feedbacks'] as const,
  lists: () => [...feedbackKeys.all, 'list'] as const,
  list: (query: FeedbackListQuery) => [...feedbackKeys.lists(), query] as const,
}

export const feedbackQueries = {
  list: (query: FeedbackListQuery) =>
    queryOptions({
      queryKey: feedbackKeys.list(query),
      queryFn: ({ signal }) => getFeedbackList(query, signal),
    }),
}
