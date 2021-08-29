import {loaded} from '../document-ready'
;(async function () {
  await loaded

  if (window._octo) {
    window._octo.push(['enablePerformance'])
    window._octo.push(['recordPageView'])
  }
})()

// PJAX should be treated like pageloads
document.addEventListener('pjax:complete', function () {
  if (window._octo) window._octo.push(['recordPageView'])
})
