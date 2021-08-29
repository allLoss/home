// <link rel="prefetch-viewed">
//
// See Also
//   app/helpers/prefetch_helper.rb

import {observe} from 'selector-observer'

observe('link[rel=prefetch-viewed]', {
  initialize() {
    window.requestIdleCallback(() => {
      fetch(location.href, {
        method: 'HEAD',
        credentials: 'same-origin',
        headers: {
          Purpose: 'prefetch-viewed'
        }
      })
    })
  }
})
