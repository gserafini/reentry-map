import { getAllCategories } from './categories'
import type { ResourceCategory } from '@/lib/types/database'

/** A category URL fixes the category; query filters apply only on general result routes. */
export function getSelectedCategories(
  params: { get: (key: string) => string | null },
  pathname: string
): ResourceCategory[] {
  const routeCategory = pathname.match(/\/category\/([^/]+)/)?.[1]
  const values = routeCategory ? [routeCategory] : (params.get('categories') || '').split(',')
  const valid = getAllCategories()
  return [
    ...new Set(
      values.filter((value): value is ResourceCategory => valid.includes(value as ResourceCategory))
    ),
  ]
}
