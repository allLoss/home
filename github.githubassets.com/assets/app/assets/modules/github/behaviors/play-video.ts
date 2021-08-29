import {on} from 'delegated-events'

// Like scrollIntoView() but better because:
// 1. It doesn't change scroll position if element already fits into viewport.
// 2. It supports the option padding value.
function adjustViewport(element: HTMLElement, padding = 0) {
  const position = element.getBoundingClientRect()
  const scrollAdjustUp = position.top - padding
  const scrollAdjustDown = position.bottom - window.innerHeight + padding

  if (scrollAdjustUp < 0) {
    window.scrollBy(0, scrollAdjustUp)
  } else if (scrollAdjustDown > 0) {
    window.scrollBy(0, scrollAdjustDown)
  }
}

on('click', '.js-video-play, .js-video-close', function (event) {
  const playTarget = event.currentTarget
  const container = playTarget.closest<HTMLElement>('.js-video-container')!
  const iframe = container.querySelector<HTMLIFrameElement>('.js-video-iframe')!

  if (container.tagName.toLowerCase() === 'details') {
    container.addEventListener('details-dialog-close', function () {
      iframe.removeAttribute('src')

      window.setTimeout(function () {
        container.classList.remove('is-expanded')
      }, 10)
    })
  }

  if (!container.classList.contains('is-expanded')) {
    iframe.src = iframe.getAttribute('data-src') || ''
    container.classList.add('is-expanded')
  } else {
    iframe.removeAttribute('src')
    container.classList.remove('is-expanded')
  }

  adjustViewport(iframe, 20)
})
