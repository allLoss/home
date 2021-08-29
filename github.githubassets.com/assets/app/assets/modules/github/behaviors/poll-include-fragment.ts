import {observe} from 'selector-observer'

observe('poll-include-fragment[data-redirect-url]', function (el) {
  const url = el.getAttribute('data-redirect-url')!
  el.addEventListener('load', function () {
    window.location.href = url
  })
})

observe('poll-include-fragment[data-reload]', function (el) {
  el.addEventListener('load', function () {
    window.location.reload()
  })
})
