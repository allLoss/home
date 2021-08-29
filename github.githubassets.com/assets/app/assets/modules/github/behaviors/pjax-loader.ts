import {ready} from '../document-ready'
;(async function () {
  await ready

  // loading bar at the top of the page for pjax actions
  const bar = document.querySelector('.js-pjax-loader-bar')
  if (!bar) {
    return
  }

  const progressEl = bar.firstElementChild
  if (!(progressEl instanceof HTMLElement)) {
    return
  }

  let width = 0
  let incTimer: number | null = null
  let originalTransition: string | null = null

  function initiateLoader() {
    setWidth(0)
    if (bar) bar.classList.add('is-loading')
    incTimer = window.setTimeout(increment, 0)
  }

  // Set the new width of the progress bar.
  function setWidth(newWidth: number) {
    if (!(progressEl instanceof HTMLElement)) return
    if (newWidth === 0) {
      if (originalTransition == null) originalTransition = getComputedStyle(progressEl).transition
      progressEl.style.transition = 'none'
    }

    width = newWidth
    progressEl.style.width = `${width}%`

    if (newWidth === 0) {
      progressEl.clientWidth // ensure previous style gets fully applied without transition
      progressEl.style.transition = originalTransition || ''
    }
  }

  function increment() {
    // First animation should be more
    if (width === 0) width = 12
    setWidth(Math.min(width + 3, 95))
    incTimer = window.setTimeout(increment, 500)
  }

  function finishLoader() {
    if (incTimer) {
      clearTimeout(incTimer)
    }
    setWidth(100)
    if (bar) bar.classList.remove('is-loading')
  }

  document.addEventListener('pjax:start', initiateLoader)
  document.addEventListener('pjax:end', finishLoader)
})()
