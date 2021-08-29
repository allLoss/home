import {isFeatureEnabled} from '../../../github/features'
import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'

interface Request {
  url: string
  headers: Headers
}

function getTimelineLastModified(): string | null {
  const marker = document.querySelector('.js-timeline-marker')
  return marker != null ? marker.getAttribute('data-last-modified') : null
}

// Add the X-Timeline-Last-Modified header to the request based on the
// the last modified time from the timeline marker element.
function addTimelineLastModifiedHeader(request: Request) {
  if (isCrossDomain(request) || isPjax(request)) {
    return
  }

  const lastModified = getTimelineLastModified()
  if (lastModified) {
    request.headers.set('X-Timeline-Last-Modified', lastModified)
  }
}

function isPjax(request: Request): boolean {
  if (isFeatureEnabled('DEPRECATE_PJAX_PARAM_JS')) {
    return request.headers.get('X-PJAX') === 'true'
  }

  return /[?&]_pjax=/.test(request.url)
}

function isCrossDomain(request: Request): boolean {
  let requestURL
  try {
    // eslint-disable-next-line no-restricted-syntax
    requestURL = new URL(request.url)
  } catch (urlError) {
    return true
  }
  return requestURL.host !== window.location.host
}

remoteForm('.js-needs-timeline-marker-header', function (form, wants, request) {
  addTimelineLastModifiedHeader(request)
})

on('deprecatedAjaxSend', '[data-remote]', function (event) {
  const {request} = event.detail
  addTimelineLastModifiedHeader(request)
})
