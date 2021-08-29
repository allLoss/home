import {observe} from 'selector-observer'

export function getPlatform(): string | null {
  if (/Windows/.test(navigator.userAgent)) {
    return 'windows'
  }
  if (/Macintosh/.test(navigator.userAgent)) {
    return 'mac'
  }
  return null
}

function runningOnPlatform(element: Element): boolean {
  const platforms = (element.getAttribute('data-platforms') || '').split(',')
  const platform = getPlatform()
  return Boolean(platform && platforms.includes(platform))
}

observe('.js-remove-unless-platform', function (el) {
  if (!runningOnPlatform(el)) {
    el.remove()
  }
})

observe('.js-show-for-platform', {
  constructor: HTMLElement,
  add(el) {
    if (runningOnPlatform(el)) {
      el.hidden = false
    }
  }
})

observe('.js-hide-for-platform', {
  constructor: HTMLElement,
  add(el) {
    if (runningOnPlatform(el)) {
      el.hidden = true
    }
  }
})
