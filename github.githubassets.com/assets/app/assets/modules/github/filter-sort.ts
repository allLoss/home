import {filterMap} from './iterables'

type Comparator<T> = (a: T, b: T) => number

export function filterSort<T, K>(items: T[], map: (item: T) => K | null | undefined, compare: Comparator<K>): T[] {
  const sortKey = (item: T): [T, K] | null => {
    const key = map(item)
    return key != null ? [item, key] : null
  }
  return [...filterMap(items, sortKey)].sort((a, b) => compare(a[1], b[1])).map(([item]) => item)
}
