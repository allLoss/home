import {scorer} from './ranking'
export {scorer} from './ranking'

type PageViewSummary = {
  lastVisitedAt: number
  visitCount: number
}

export type PageViews = {[page_key: string]: PageViewSummary}

const TEAM_PAGE_REGEX = /^\/orgs\/([a-z0-9-]+)\/teams\/([\w-]+)/

// Of course this list is incomplete, but it should be good enough for the purposes of this prototype.
const REPOSITORY_PAGE_REGEXES = [
  // This will overcount some things, but since every page view is ultimately compared to entities
  // we can jump to it should be fine. Of course if we ever tried to add users or orgs to this it
  // would break.
  /^\/([^/]+)\/([^/]+)\/?$/,

  /^\/([^/]+)\/([^/]+)\/blob/,
  /^\/([^/]+)\/([^/]+)\/tree/,
  /^\/([^/]+)\/([^/]+)\/issues/,
  /^\/([^/]+)\/([^/]+)\/pulls?/,
  /^\/([^/]+)\/([^/]+)\/pulse/
]

const PROJECT_PAGE_REGEXES = [
  ['organization', /^\/orgs\/([a-z0-9-]+)\/projects\/([0-9-]+)/],
  ['repository', /^\/([^/]+)\/([^/]+)\/projects\/([0-9-]+)/]
]

const MAX_PAGE_VIEWS_TO_STORE_IN_LOCAL_STORAGE = 100

export function logPageView(path: string) {
  const teamPageMatch = path.match(TEAM_PAGE_REGEX)
  if (teamPageMatch) {
    logPageViewByKey(buildTeamKey(teamPageMatch[1], teamPageMatch[2]))
    return
  }

  let projectPageMatch
  for (let i = 0, len = PROJECT_PAGE_REGEXES.length; i < len; i++) {
    const [ownerType, projectRegex] = PROJECT_PAGE_REGEXES[i]
    projectPageMatch = path.match(projectRegex)
    if (projectPageMatch) {
      let ownerSlug: string | null = null
      let number: string | null = null
      switch (ownerType) {
        case 'organization':
          ownerSlug = projectPageMatch[1]
          number = projectPageMatch[2]
          break
        case 'repository':
          ownerSlug = `${projectPageMatch[1]}/${projectPageMatch[2]}`
          number = projectPageMatch[3]
          break
        default:
        // Should never get here.
      }
      if (ownerSlug && number) {
        logPageViewByKey(buildProjectKey(ownerSlug, number))
      }
      return
    }
  }

  let repositoryPageMatch
  for (let i = 0, len = REPOSITORY_PAGE_REGEXES.length; i < len; i++) {
    repositoryPageMatch = path.match(REPOSITORY_PAGE_REGEXES[i])
    if (repositoryPageMatch) {
      logPageViewByKey(buildRepositoryKey(repositoryPageMatch[1], repositoryPageMatch[2]))
      return
    }
  }
}

// Limits localStorage entries to 100 MAX_PAGE_VIEWS_TO_STORE_IN_LOCAL_STORAGE
function limitedPageViews(pageViews: PageViews) {
  const keys = Object.keys(pageViews)
  if (keys.length <= MAX_PAGE_VIEWS_TO_STORE_IN_LOCAL_STORAGE) {
    return pageViews
  }
  const scorePage = scorer(pageViews)
  const ranked = keys.sort((a, b) => scorePage(b) - scorePage(a)).slice(0, MAX_PAGE_VIEWS_TO_STORE_IN_LOCAL_STORAGE / 2)
  return Object.fromEntries(ranked.map(key => [key, pageViews[key]]))
}

function logPageViewByKey(key: string) {
  const views = getPageViewsMap()
  const now = currentEpochTimeInSeconds()
  const hit = views[key] || {lastVisitedAt: now, visitCount: 0}
  hit.visitCount += 1
  hit.lastVisitedAt = now
  views[key] = hit
  setPageViewsMap(limitedPageViews(views))
}

function currentEpochTimeInSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function buildTeamKey(organizationLogin: string, teamSlug: string): string {
  return `team:${organizationLogin}/${teamSlug}`
}

export function buildRepositoryKey(ownerLogin: string, name: string): string {
  return `repository:${ownerLogin}/${name}`
}

export function buildProjectKey(ownerSlug: string, number: string): string {
  return `project:${ownerSlug}/${number}`
}

const PAGE_VIEW_KEY_REGEX = /^(team|repository|project):[^/]+\/[^/]+(\/([^/]+))?$/
const VIEWS_KEY = 'jump_to:page_views'

function setPageViewsMap(views: PageViews) {
  setItem(VIEWS_KEY, JSON.stringify(views))
}

export function getPageViewsMap(): PageViews {
  const rawData = getItem(VIEWS_KEY)
  if (!rawData) return {}

  let json
  try {
    json = JSON.parse(rawData)
  } catch {
    // Clear localStorage since we know it's bad
    setPageViewsMap({})
    return {}
  }

  const pageViewMap: PageViews = {}
  for (const key in json) {
    if (key.match(PAGE_VIEW_KEY_REGEX)) {
      pageViewMap[key] = json[key]
    }
  }
  return pageViewMap
}

function setItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage quota exceeded.
  }
}

function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Storage unavailable.
    return null
  }
}
