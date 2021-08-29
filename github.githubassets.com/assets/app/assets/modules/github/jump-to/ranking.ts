import type {PageViews} from './page-views'

const FEATURE_WEIGHTS = {frequency: 0.6, recency: 0.4}

function sortBy<T>(items: T[], map: (item: T) => number): T[] {
  return items.sort((a, b) => map(a) - map(b))
}

type Scorer = (pageKey: string) => number
export function scorer(pageViews: PageViews): Scorer {
  const frequencies = frequencyMap(pageViews)
  const recencies = recencyMap(pageViews)
  return function (pageKey: string): number {
    return score(frequencies.get(pageKey) || 0, recencies.get(pageKey) || 0)
  }
}

function score(frequency: number, recency: number): number {
  return frequency * FEATURE_WEIGHTS.frequency + recency * FEATURE_WEIGHTS.recency
}

// Scores a relative frequency in the interval [0, 1] where higher means more frequent.
function frequencyMap(pageViews: PageViews): Map<string, number> {
  const totalVisits = [...Object.values(pageViews)].reduce((total, view) => total + view.visitCount, 0)
  return new Map(Object.keys(pageViews).map(pageKey => [pageKey, pageViews[pageKey].visitCount / totalVisits]))
}

// Scores a relative recency value in the interval [0, 1] where higher means more recent.
function recencyMap(pageViews: PageViews): Map<string, number> {
  const recencyList = sortBy([...Object.keys(pageViews)], key => pageViews[key].lastVisitedAt)
  const totalUniqueVisits = recencyList.length
  return new Map(recencyList.map((key, index) => [key, (index + 1) / totalUniqueVisits]))
}
