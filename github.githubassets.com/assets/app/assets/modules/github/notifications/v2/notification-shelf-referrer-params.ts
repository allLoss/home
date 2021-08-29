import {getItem, removeItem, setItem} from '../../session-storage'

type ShelfReferrerParams = {
  notification_referrer_id?: string
  notifications_before?: string
  notifications_after?: string
  notifications_query?: string
}

const shelfParams: Array<keyof ShelfReferrerParams> = [
  'notification_referrer_id',
  'notifications_before',
  'notifications_after',
  'notifications_query'
]

const sessionStorageKey = 'notification_shelf'

/*
 * Stores url params for the shelf in session storage if present, and returns
 * search params without any shelf params.
 */
export function storeAndStripShelfParams(
  searchParams: URLSearchParams,
  pathname: string | null = null
): URLSearchParams | null {
  if (searchParams.has('notification_referrer_id')) {
    storeShelfParams(searchParams, pathname)
    return deleteShelfParams(searchParams)
  }
  return null
}

/*
 * Loads the shelf params from sessionStorage if they are there and they match
 * the current pull request page, clear them otherwise.
 */
export function getStoredShelfParamsForCurrentPage(pathname: string | null = null): ShelfReferrerParams | null {
  // If the current page is not a pull request, then the stored data will
  // not match, so clear it and move on.
  const currentPullRequestPathname = getCurrentPullRequestPathname(pathname)
  if (!currentPullRequestPathname) {
    removeItem(sessionStorageKey)
    return null
  }

  try {
    const str = getItem(sessionStorageKey)
    if (!str) return null

    const stored = JSON.parse(str)
    if (!stored || !stored.pathname) throw new Error('Must have a pathname')

    if (stored.pathname !== currentPullRequestPathname) {
      throw new Error('Stored pathname does not match current pathname.')
    }

    const result: ShelfReferrerParams = {}

    for (const key of shelfParams) {
      result[key] = stored[key]
    }

    return result
  } catch (e) {
    removeItem(sessionStorageKey)
    return null
  }
}

function storeShelfParams(searchParams: URLSearchParams, pathname: string | null) {
  const pullRequestPathname = getCurrentPullRequestPathname(pathname)
  if (!pullRequestPathname) return

  const params: {[key: string]: string} = {
    pathname: pullRequestPathname
  }

  for (const key of shelfParams) {
    const value = searchParams.get(key)
    if (value) params[key] = value
  }

  setItem(sessionStorageKey, JSON.stringify(params))
}

function deleteShelfParams(searchParams: URLSearchParams): URLSearchParams {
  for (const key of shelfParams) {
    searchParams.delete(key)
  }
  return searchParams
}

/*
 * Returns the base pathname of the current page if it's a pull request.
 *
 * `/github/github/pull/123/files` -> `/github/github/pull/123`
 */
function getCurrentPullRequestPathname(pathname: string | null): string | null {
  pathname = pathname || window.location.pathname
  const pullRequestPathnameRegex = /^(\/[^/]+\/[^/]+\/pull\/[^/]+)/
  const match = pathname.match(pullRequestPathnameRegex)
  if (!match) return null

  return match[0]
}
