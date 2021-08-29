// pjax behavior
//
// Pjaxifies any links with data-pjax or inside a container with
// data-pjax.
//
// The container must be annotated with data-pjax-container and
// have an ID.
//
//   <div id="my-container" data-pjax-container>
//
//     <a href="/foo" data-pjax>Foo</a>
//
//     <ul data-pjax>
//       <li><a href="/bar">Bar</a></li>
//       <li><a href="/baz">Baz</a></li>
//     </ul>
//
//  </div>
//
//  <ul data-pjax="#my-container">
//    <li><a href="/bar">Bar</a></li>
//    <li><a href="/baz">Baz</a></li>
//  </ul>
//

import {pushState, replaceState} from '../history'
import {replaceCachedElements, replaceTransientTags} from '../behaviors/pjax/head'

import {findFragmentTarget} from '../fragment-target'
import {isFeatureEnabled} from '../../github/features'
import {parseHTML} from '../parse-html'
import {sendStats} from '../stats'

declare global {
  interface Document {
    addEventListener(
      type: 'pjax:start',
      listener: (this: Document, ev: CustomEvent<{url?: string}>) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void
    addEventListener(
      type: 'pjax:beforeReplace',
      listener: (
        this: Document,
        ev: CustomEvent<{contents?: Array<Node | null>; state: State; previousState: State}>
      ) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void
    addEventListener(
      type: 'pjax:hardLoad',
      listener: (this: Document, ev: CustomEvent<{reason?: string}>) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void
  }

  interface Window {
    addEventListener(
      type: 'pjax:beforeReplace',
      listener: (
        this: Document,
        ev: CustomEvent<{contents?: Array<Node | null>; state: State; previousState: State}>
      ) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void
  }
}

export interface PjaxOptions {
  id?: number
  url: string
  container: Element
  type?: string
  push?: boolean
  replace?: boolean
  scrollTo?: number | false
  dataType?: string
  fragment?: string
  data?: FormData
  requestUrl?: string
  target?: HTMLElement
}

const maxCacheLength = 20

type State = {
  id: number
  url: string
  title: string
  container: string | null
  fragment?: string
}

let currentState: State | null
let previousController: AbortController | null = null

function dispatch(target: Element, name: string, detail?: unknown): boolean {
  return target.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail
    })
  )
}

// Loads a URL with ajax, puts the response body inside a container,
// then pushState()'s the loaded URL.
export default async function pjaxRequest(opts: PjaxOptions) {
  const options = {
    push: true,
    replace: false,
    type: 'GET',
    dataType: 'html',
    scrollTo: 0,
    ...opts
  }

  options.requestUrl = options.url!
  const url = parseURL(options.url!)
  const hash = url.hash

  const context = options.container as HTMLElement
  const contextSelector = getContainerSelector(context)

  // We want the browser to maintain two separate internal caches: one
  // for pjax'd partial page loads and one for normal page loads.
  // Without adding this secret parameter, some browsers will often
  // confuse the two.
  if (!isFeatureEnabled('DEPRECATE_PJAX_PARAM_JS') && options.type === 'GET') {
    url.search += `${url.search ? '&' : ''}_pjax=${encodeURIComponent(contextSelector)}`
    options.url = url.toString()
  }

  // Initialize currentState for the initial page load. Assume we're
  // using the container and options of the link we're loading for the
  // back button to the initial page. This ensures good back button
  // behavior.
  if (!currentState) {
    currentState = {
      id: uniqueId(),
      url: window.location.href,
      title: document.title,
      container: contextSelector,
      fragment: options.fragment
    }
    replaceState(currentState, currentState.title, currentState.url)
  }

  previousController?.abort()
  const {signal} = (previousController = new AbortController())

  if (options.push === true && options.replace !== true) {
    // Cache current container element before replacing it
    cachePush(currentState.id, cloneContents(context))

    pushState(null, '', options.requestUrl!)
  }

  dispatch(context, 'pjax:start', {url: options.url})
  dispatch(context, 'pjax:send')

  let response = undefined

  try {
    response = await fetch(options.url!, {
      signal,
      method: options.type,
      body: options.data,
      headers: {
        Accept: 'text/html',
        'X-PJAX': 'true',
        'X-PJAX-Container': contextSelector,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
  } catch (e) {
    response = undefined
  }

  if (!response || !response.ok) {
    const allowed = dispatch(context, 'pjax:error')

    if (options.type === 'GET' && allowed) {
      // Prefer X-PJAX-URL header if it was set, otherwise fallback to
      // using the original requested url.
      const serverUrl = response && response.headers.get('X-PJAX-URL')
      const responseUrl = serverUrl ? stripInternalParams(parseURL(serverUrl)) : options.requestUrl

      sendStats({pjaxFailureReason: 'response_error', requestUrl: options.requestUrl})
      locationReplace(responseUrl)
    }

    dispatch(context, 'pjax:complete')
    dispatch(context, 'pjax:end')
    return
  }

  const previousState = currentState
  const currentVersion = findVersion()
  const latestVersion = response.headers.get('X-PJAX-Version')
  const data = await response.text()

  const container = extractContainer(data, response, options)
  const {contents} = container

  const containerUrl = parseURL(container.url)
  if (hash) {
    containerUrl.hash = hash
    container.url = containerUrl.href
  }

  // If there is a layout version mismatch, hard load the new url
  if (currentVersion && latestVersion && currentVersion !== latestVersion) {
    dispatch(context, 'pjax:hardLoad', {reason: 'version_mismatch'})
    sendStats({pjaxFailureReason: 'version_mismatch', requestUrl: options.requestUrl})

    locationReplace(container.url)
    return
  }

  // If the new response is missing a body, hard load the page
  if (!contents) {
    dispatch(context, 'pjax:hardLoad', {reason: 'missing_response_body'})
    sendStats({pjaxFailureReason: 'missing_response_body', requestUrl: options.requestUrl})
    locationReplace(container.url)
    return
  }

  currentState = {
    id: options.id != null ? options.id : uniqueId(),
    url: container.url,
    title: container.title,
    container: contextSelector,
    fragment: options.fragment
  }

  if (options.push === true || options.replace === true) {
    replaceState(currentState, container.title, container.url)
  }

  // Only blur the focus if the focused element is within the container.
  const activeElement = document.activeElement
  const blurFocus = options.container != null && options.container.contains(activeElement)

  // Clear out any focused controls before inserting new page contents.
  if (activeElement instanceof HTMLElement && blurFocus) {
    try {
      // eslint-disable-next-line github/no-blur
      activeElement.blur()
    } catch (e) {
      // nothing
    }
  }

  if (container.title) document.title = container.title

  dispatch(context, 'pjax:beforeReplace', {
    contents,
    state: currentState,
    previousState
  })

  replaceWithNodes(context, contents)
  replaceCachedElements()
  replaceTransientTags()

  // FF bug: Won't autofocus fields that are inserted via JS.
  // This behavior is incorrect. So if theres no current focus, autofocus
  // the last field.
  //
  // http://www.w3.org/html/wg/drafts/html/master/forms.html
  const autofocusEl = context.querySelector<HTMLElement>('input[autofocus], textarea[autofocus]')
  if (autofocusEl && document.activeElement !== autofocusEl) {
    autofocusEl.focus()
  }

  if (container.scripts) {
    executeScriptTags(container.scripts)
  }

  if (container.stylesheets) {
    injectStyleTags(container.stylesheets)
  }

  let scrollTo = options.scrollTo

  // Ensure browser scrolls to the element referenced by the URL anchor
  if (hash) {
    const target = findFragmentTarget(document, hash)
    if (target) {
      const targetRect = target.getBoundingClientRect()
      scrollTo = targetRect.top + window.pageYOffset
    }
  }

  if (typeof scrollTo === 'number') {
    window.scrollTo(window.pageXOffset, scrollTo)
  }

  dispatch(context, 'pjax:success')
  dispatch(context, 'pjax:complete')
  dispatch(context, 'pjax:end')
}

// Hard replace current state with url.
//
// Work for around WebKit
//   https://bugs.webkit.org/show_bug.cgi?id=93506
function locationReplace(url: string) {
  if (currentState) {
    replaceState(null, '', currentState.url)
  }
  window.location.replace(url)
}

let initialPop = true
const initialURL: string = window.location.href
const initialState: State | null = window.history.state

// Initialize currentState if possible
// Happens when reloading a page and coming forward from a different
// session history.
if (initialState && initialState.container) {
  currentState = initialState
}

// Non-webkit browsers don't fire an initial popstate event
if ('state' in window.history) {
  initialPop = false
}

// popstate handler takes care of the back and forward buttons
//
// You probably shouldn't use pjax on pages with other pushState
// stuff yet.
function onPjaxPopstate(event: PopStateEvent) {
  // Hitting back or forward should override any pending PJAX request.
  if (!initialPop) {
    previousController?.abort()
  }

  const previousState = currentState
  const state: State | null = event.state
  let direction: Direction = null

  if (state && state.container) {
    // When coming forward from a separate history session, will get an
    // initial pop with a state we are already at. Skip reloading the current
    // page.
    if (initialPop && initialURL === state.url) return

    if (previousState) {
      // If popping back to the same state, just skip.
      // Could be clicking back from hashchange rather than a pushState.
      if (previousState.id === state.id) return

      // Since state IDs always increase, we can deduce the navigation direction
      direction = previousState.id < state.id ? 'forward' : 'back'
    }

    const [containerSelector, contents, cachedAt] = cacheMapping[state.id] || []
    const container = document.querySelector(containerSelector || state.container)

    if (container instanceof HTMLElement) {
      if (previousState) {
        // Cache current container before replacement and inform the
        // cache which direction the history shifted.
        cachePop(direction, previousState.id, cloneContents(container))
      }

      dispatch(container, 'pjax:popstate', {state, direction, cachedAt})

      const options: PjaxOptions = {
        id: state.id,
        url: state.url,
        container,
        push: false,
        fragment: state.fragment || '',
        scrollTo: false
      }

      if (contents) {
        dispatch(container, 'pjax:start')

        currentState = state
        if (state.title) document.title = state.title
        dispatch(container, 'pjax:beforeReplace', {contents, state, previousState})

        replaceWithNodes(container, contents)
        replaceCachedElements()
        replaceTransientTags()
        dispatch(container, 'pjax:end')
      } else {
        pjaxRequest(options)
      }

      // Force reflow/relayout before the browser tries to restore the
      // scroll position.
      container.offsetHeight
    } else {
      // No pjax container is an error on the source page, report using the previous state's url
      sendStats({pjaxFailureReason: 'no_container', requestUrl: previousState?.url})
      locationReplace(location.href)
    }
  }
  initialPop = false
}

// Generate unique id for state object.
//
// Use a timestamp instead of a counter since ids should still be
// unique across page loads.
function uniqueId(): number {
  return new Date().getTime()
}

function cloneContents(container: Element): CacheItem {
  const cloned = container.cloneNode(true)
  const contextSelector = getContainerSelector(container)
  return [contextSelector, Array.from(cloned.childNodes), Date.now()]
}

function stripInternalParams(url: HTMLAnchorElement): string {
  if (!isFeatureEnabled('DEPRECATE_PJAX_PARAM_JS')) {
    url.search = url.search.replace(/([?&])(_pjax|_)=[^&]*/g, '')
    return url.href.replace(/\?($|#)/, '$1')
  }

  return url.href
}

function parseURL(url: string): HTMLAnchorElement {
  const a = document.createElement('a')
  a.href = url
  return a
}

function getContainerSelector(container: Element): string {
  if (container.id) {
    return `#${container.id}`
  } else {
    throw new Error('pjax container has no id')
  }
}

function findAll<T extends Element>(nodes: Node[], selector: string, klass: new () => T): T[] {
  let matches: T[] = []
  for (const node of nodes) {
    if (node instanceof Element) {
      if (node instanceof klass && node.matches(selector)) {
        matches.push(node)
      }
      matches = matches.concat(Array.from(node.querySelectorAll(selector)))
    }
  }
  return matches
}

// Clear the container and append all the given nodes to it
function replaceWithNodes(container: Element, nodes: Node[]) {
  container.innerHTML = ''
  for (const node of nodes) {
    // A node may be null if a pjax:beforeReplace listener nulls them out
    // directly from the array emitted with the event
    if (node != null) {
      container.appendChild(node)
    }
  }
}

function resolveUrl(response: Response, fallbackUrl: string) {
  // Prefer X-PJAX-URL header if it was set, otherwise fallback to
  // using the original requested url.
  const serverUrl = response.headers.get('X-PJAX-URL')
  return serverUrl ? stripInternalParams(parseURL(serverUrl)) : fallbackUrl
}

type extractedContainer = {
  url: string
  title: string
  contents?: Node[]
  scripts?: HTMLScriptElement[]
  stylesheets?: HTMLLinkElement[]
}

// Extracts container and metadata from response.
//
// 1. Extracts X-PJAX-URL header if set
// 2. Extracts inline <title> tags
// 3. Builds response Element and extracts fragment if set
function extractContainer(data: string, response: Response, options: PjaxOptions): extractedContainer {
  const obj: extractedContainer = {
    url: resolveUrl(response, options.requestUrl!),
    title: ''
  }

  const fullDocument = /<html/i.test(data)

  // Return fast if response is of a type other than HTML
  const contentType = (response.headers.get('Content-Type') || '').split(';', 1)[0].trim()
  if (contentType !== 'text/html') {
    return obj
  }

  let head
  let body

  // Attempt to parse response html into elements
  if (fullDocument) {
    const headMatch = data.match(/<head[^>]*>([\s\S.]*)<\/head>/i)
    const bodyMatch = data.match(/<body[^>]*>([\s\S.]*)<\/body>/i)
    head = headMatch ? Array.from(parseHTML(document, headMatch[0]).childNodes) : []
    body = bodyMatch ? Array.from(parseHTML(document, bodyMatch[0]).childNodes) : []
  } else {
    head = body = Array.from(parseHTML(document, data).childNodes)
  }

  // If response data is empty, return fast
  if (body.length === 0) return obj

  // If there's a <title> tag in the header, use it as
  // the page's title.
  const titles = findAll(head, 'title', HTMLTitleElement)
  obj.title = titles.length > 0 ? titles[titles.length - 1].textContent || '' : ''

  let fragment
  if (options.fragment) {
    // If they specified a fragment, look for it in the response
    // and pull it out.
    if (options.fragment === 'body') {
      fragment = body
    } else {
      const matchingFragments = findAll(body, options.fragment, Element)
      // Use first fragment if multiple matches
      fragment = matchingFragments.length > 0 ? [matchingFragments[0]] : []
    }

    if (fragment.length) {
      if (options.fragment === 'body') {
        obj.contents = fragment
      } else {
        obj.contents = fragment.flatMap(node => Array.from(node.childNodes))
      }

      // If there's no title, look for data-title and title attributes
      // on the fragment
      if (!obj.title) {
        const firstNode = fragment[0]
        if (firstNode instanceof Element) {
          obj.title = firstNode.getAttribute('title') || firstNode.getAttribute('data-title') || ''
        }
      }
    }
  } else if (!fullDocument) {
    obj.contents = body
  }

  // Clean up any <title> tags
  if (obj.contents) {
    // Remove any parent title elements
    obj.contents = obj.contents.filter(function (node) {
      if (node instanceof Element) {
        return !node.matches('title')
      }
      return true
    })

    // Then scrub any titles from their descendants
    for (const node of obj.contents) {
      if (node instanceof Element) {
        for (const title of node.querySelectorAll('title')) {
          title.remove()
        }
      }
    }

    // Gather all script[src] elements
    const scripts = findAll(obj.contents, 'script[src]', HTMLScriptElement)
    for (const script of scripts) {
      script.remove()
    }
    obj.scripts = scripts
    obj.contents = obj.contents!.filter(node => scripts.indexOf(node as HTMLScriptElement) === -1)

    // Gather all stylesheet elements
    const stylesheets = findAll(obj.contents, 'link[rel=stylesheet]', HTMLLinkElement)
    for (const stylesheet of stylesheets) {
      stylesheet.remove()
    }
    obj.stylesheets = stylesheets
    obj.contents = obj.contents!.filter(node => !stylesheets.includes(node as HTMLLinkElement))
  }

  // Trim any whitespace off the title
  if (obj.title) obj.title = obj.title.trim()

  return obj
}

// Load and execute scripts using standard script request.
function executeScriptTags(scripts: HTMLScriptElement[]) {
  const existingScripts = document.querySelectorAll<HTMLScriptElement>('script[src]')

  for (const script of scripts) {
    const {src} = script
    if (Array.from(existingScripts).some(s => s.src === src)) {
      continue
    }

    const newScript = document.createElement('script')
    const type = script.getAttribute('type')
    if (type) newScript.type = type
    newScript.src = src
    if (document.head) {
      document.head.appendChild(newScript)
    }
  }
}

// Inject `link` elements that don't exist in the current document into the
// documents <head>.
function injectStyleTags(stylesheets: HTMLLinkElement[]) {
  const existingStylesheets = document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')

  for (const stylesheet of stylesheets) {
    if (Array.from(existingStylesheets).some(s => s.href === stylesheet.href)) {
      continue
    }

    if (document.head) {
      document.head.appendChild(stylesheet)
    }
  }
}

type CacheItem = [string, Node[], number]

// History DOM caching class.
const cacheMapping: {[key: number]: CacheItem} = {}
const cacheForwardStack: number[] = []
const cacheBackStack: number[] = []

// Push previous state id and container contents into the history
// cache. Should be called in conjunction with `pushState` to save the
// previous container contents.
function cachePush(id: number, value: CacheItem) {
  cacheMapping[id] = value
  cacheBackStack.push(id)

  // Remove all entries in forward history stack after pushing a new page.
  trimCacheStack(cacheForwardStack, 0)

  // Trim back history stack to max cache length.
  trimCacheStack(cacheBackStack, maxCacheLength)
}

type Direction = 'forward' | 'back' | null

// Shifts cache from directional history cache. Should be
// called on `popstate` with the previous state id and container
// contents.
function cachePop(direction: Direction, id: number, value: CacheItem) {
  let pushStack
  let popStack
  cacheMapping[id] = value

  if (direction === 'forward') {
    pushStack = cacheBackStack
    popStack = cacheForwardStack
  } else {
    pushStack = cacheForwardStack
    popStack = cacheBackStack
  }

  pushStack.push(id)
  const poppedId = popStack.pop()
  if (poppedId) delete cacheMapping[poppedId]

  // Trim whichever stack we just pushed to to max cache length.
  trimCacheStack(pushStack, maxCacheLength)
}

// Trim a cache stack (either cacheBackStack or cacheForwardStack) to be no
// longer than the specified length, deleting cached DOM elements as necessary.
//
// stack  - Array of state IDs
// length - Maximum length to trim to
function trimCacheStack(stack: number[], length: number) {
  while (stack.length > length) {
    const id = stack.shift()
    if (id == null) return
    delete cacheMapping[id]
  }
}

// Find version identifier for the initial page load.
function findVersion(): string | null {
  for (const meta of document.getElementsByTagName('meta')) {
    const name = meta.getAttribute('http-equiv')
    if (name && name.toUpperCase() === 'X-PJAX-VERSION') {
      return meta.content
    }
  }
  return null
}

export function getState(): State | null {
  return currentState
}

window.addEventListener('popstate', onPjaxPopstate)
