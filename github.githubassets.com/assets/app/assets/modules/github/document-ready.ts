// Check if document has passed interactive state.
//
// The document has finished loading and the document has been parsed but
// sub-resources such as images, stylesheets and frames are still loading.
// The state indicates that the DOMContentLoaded event has been fired.
export const ready: Promise<void> = (function () {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    return Promise.resolve()
  } else {
    return new Promise<void>(resolve => {
      document.addEventListener('DOMContentLoaded', () => {
        resolve()
      })
    })
  }
})()

// Check if document has passed loaded state.
//
// The document and all sub-resources have finished loading. The state
// indicates that the load event has been fired.
export const loaded: Promise<unknown> = (function () {
  if (document.readyState === 'complete') {
    return Promise.resolve()
  } else {
    return new Promise(resolve => {
      window.addEventListener('load', resolve)
    })
  }
})()
