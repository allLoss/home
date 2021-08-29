const sessionHistoryEntries: Array<{url: string; state: unknown}> = []
let sessionHistoryOffset = 0
let state: State

type State = {
  _id: number
}

/*
 * Array of history entries.
 *
 * Example:
 * {
 *   0: {
 *     url: "/",
 *     state: { ... }.
 *   },
 *   1: {
 *     url: "/github/github/issues/123",
 *     state: { ... }.
 *   },
 *   2: {
 *     url: "/github/github/issues/123#comment-4",
 *     state: { ... }.
 *   }.
 *  }.
 */

export function getState(): State {
  return state
}

function safeGetHistory() {
  try {
    // Clamp history.length to 0<->9007199254740991 (Number.MAX_SAFE_INTEGER isn't supported in IE)
    return Math.min(Math.max(0, history.length) || 0, 9007199254740991)
  } catch (e) {
    return 0
  }
}

function initializeState(): State {
  const newState = {_id: new Date().getTime()}
  setState(newState)
  return newState
}

// Current index into history entries stack.
function position(): number {
  return safeGetHistory() - 1 + sessionHistoryOffset
}

function setState(newState: State) {
  state = newState

  // Update entry at current position
  const url = location.href
  sessionHistoryEntries[position()] = {url, state}

  // Trim entries to match history size
  sessionHistoryEntries.length = safeGetHistory()

  // Emit public statechange
  window.dispatchEvent(new CustomEvent('statechange', {bubbles: false, cancelable: false}))
}

// Generate unique id for state object.
//
// Use a timestamp instead of a counter since ids should still be unique
// across page loads.
function uniqueId(): number {
  return new Date().getTime()
}

// Indirection for history.pushState to support tracking URL changes.
//
// Would be great if there was a standard window.addEventListener('statechange') event.
export function pushState(oldState: State | null, title: string, url: string) {
  // pushState drops any forward history entries
  sessionHistoryOffset = 0
  const newState = Object.assign({}, {_id: uniqueId()}, oldState)
  history.pushState(newState, title, url)
  setState(newState)
}

// Indirection for history.replaceState to support tracking URL changes.
//
// Would be great if there was a standard window.addEventListener('statechange') event.
export function replaceState(oldState: Record<string, unknown> | null, title: string, url: string) {
  const newState = Object.assign({}, {_id: getState()._id}, oldState)
  history.replaceState(newState, title, url)
  setState(newState)
}

// Get URL that be navigated to with history.back().
export function getBackURL(): string | undefined {
  const entry = sessionHistoryEntries[position() - 1]
  if (entry) {
    return entry.url
  }
}

// Get URL that be navigated to with history.forward().
export function getForwardURL(): string | undefined {
  const entry = sessionHistoryEntries[position() + 1]
  if (entry) {
    return entry.url
  }
}

state = initializeState()

window.addEventListener(
  'popstate',
  function onPopstate(event: PopStateEvent) {
    const currentState: State = event.state

    if (!currentState || !currentState._id) {
      // Unmanaged state in history entries
      // Or could be a hashchange pop, ignore and let hashchange handle it
      return
    }

    const id = currentState._id
    if (id < (getState()._id || NaN)) {
      sessionHistoryOffset--
    } else {
      sessionHistoryOffset++
    }

    setState(currentState)
  },
  true
)

window.addEventListener(
  'hashchange',
  function onHashchange() {
    if (safeGetHistory() > sessionHistoryEntries.length) {
      // Forward navigation
      const newState = {_id: uniqueId()}
      history.replaceState(newState, '', location.href)
      setState(newState)
    }
  },
  true
)
