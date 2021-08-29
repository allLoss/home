// pjax: <link rel="pjax-prefetch" href="/foo/bar/1">
//
// Also see Resource Hints <link rel=prefetch>
//   https://w3c.github.io/resource-hints/

import {detectContainer} from './utils'
import {isFeatureEnabled} from '../../../github/features'
import {observe} from 'selector-observer'

function getContainerSelector(container: Element): string {
  if (container.id) {
    return `#${container.id}`
  } else {
    throw new Error('pjax container has no id')
  }
}

// Fetch target as pjax. Returns response without inserting anything.
function pjaxFetch(
  target: HTMLAnchorElement | HTMLLinkElement,
  options: {
    headers?: {[key: string]: string}
  }
): Promise<Response> {
  const container = detectContainer(target)!
  const contextSelector = getContainerSelector(container)

  const url = new URL(target.href, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))

  if (!isFeatureEnabled('DEPRECATE_PJAX_PARAM_JS')) {
    params.append('_pjax', encodeURIComponent(contextSelector))
  }

  url.search = params.toString()

  return fetch(url.href, {
    headers: Object.assign(
      {
        Accept: 'text/html',
        'X-PJAX': 'true',
        'X-PJAX-Container': contextSelector,
        'X-Requested-With': 'XMLHttpRequest'
      },
      options && options.headers
    )
  })
}

observe('[data-pjax-container] link[rel=pjax-prefetch]', {
  constructor: HTMLLinkElement,
  initialize(link) {
    pjaxFetch(link, {
      headers: {Purpose: 'prefetch'}
    })
  }
})
