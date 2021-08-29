import {announce} from '../aria-live'

document.addEventListener('pjax:start', function () {
  // eslint-disable-next-line i18n-text/no-en
  announce('Loading page')
})

document.addEventListener('pjax:error', function () {
  // eslint-disable-next-line i18n-text/no-en
  announce('Loading failed')
})

document.addEventListener('pjax:end', function () {
  // eslint-disable-next-line i18n-text/no-en
  announce('Loading complete')
})
