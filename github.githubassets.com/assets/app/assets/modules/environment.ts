// Failbot needs to load first so we get errors from system lite.
import './github/failbot-error'

// Browser polyfills
import 'request-idle-polyfill'
import 'smoothscroll-polyfill'
import 'user-select-contain-polyfill'

import './system-lite'

// Required for Chrome <= 72, Safari <= 12.1
if (!Object.fromEntries) {
  Object.fromEntries = function fromEntries<V extends unknown>(entries: IterableIterator<[string | number, V]>) {
    const obj: Record<string | number | symbol, V> = {}
    // This must not use array destructuring, as that invokes `Symbol.iterator` which is not to-spec
    for (const record of entries) obj[record[0]] = record[1]
    return obj
  }
}

/*
  This file polyfills the following: https://github.com/whatwg/dom/issues/911
  Once all targeted browsers support this DOM feature, this polyfill can be deleted.
  This allows users to pass an AbortSignal to a call to addEventListener as part of the
  AddEventListenerOptions object. When the signal is aborted, the event listener is
  removed.

  See: https://github.com/primer/react/blob/798cfc4a2dfadc6cc9a0e3763486b2e5d8c37fa9/src/polyfills/eventListenerSignal.ts
*/

let signalSupported = false
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}
try {
  const options = Object.create(
    {},
    {
      signal: {
        get() {
          signalSupported = true
        }
      }
    }
  )
  window.addEventListener('test', noop, options)
  window.removeEventListener('test', noop, options)
} catch (e) {
  /* */
}

if (!signalSupported) {
  const originalAddEventListener = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (name, originalCallback, optionsOrCapture) {
    if (
      typeof optionsOrCapture === 'object' &&
      'signal' in optionsOrCapture &&
      optionsOrCapture.signal instanceof AbortSignal
    ) {
      if (optionsOrCapture.signal.aborted) return
      originalAddEventListener.call(optionsOrCapture.signal, 'abort', () => {
        this.removeEventListener(name, originalCallback, optionsOrCapture)
      })
    }
    return originalAddEventListener.call(this, name, originalCallback, optionsOrCapture)
  }
}

declare global {
  interface AddEventListenerOptions {
    signal?: AbortSignal
  }
}
