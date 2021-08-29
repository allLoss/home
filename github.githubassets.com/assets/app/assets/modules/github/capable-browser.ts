export function capableBrowser() {
  return (
    typeof Blob === 'function' &&
    typeof PerformanceObserver === 'function' &&
    typeof Intl !== 'undefined' &&
    typeof MutationObserver !== 'undefined' &&
    typeof URLSearchParams !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof IntersectionObserver !== 'undefined' &&
    typeof AbortController !== 'undefined' &&
    typeof queueMicrotask !== 'undefined' &&
    typeof TextEncoder !== 'undefined' &&
    typeof TextDecoder !== 'undefined' &&
    typeof customElements !== 'undefined' &&
    typeof HTMLDetailsElement !== 'undefined' &&
    'entries' in FormData.prototype &&
    'toggleAttribute' in Element.prototype &&
    'flatMap' in Array.prototype
  )
}
