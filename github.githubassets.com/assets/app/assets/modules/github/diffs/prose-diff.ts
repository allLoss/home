import {on} from 'delegated-events'

on('click', '.js-rich-diff.collapsed .js-expandable', function (event) {
  if (!(event.target instanceof Element)) return
  event.preventDefault()
  const container = event.target.closest('.js-rich-diff')!
  container.classList.remove('collapsed')
})

on('click', '.js-show-rich-diff', function (event) {
  const warn = event.currentTarget.closest('.js-warn-no-visible-changes')
  if (!warn) return

  /* eslint-disable-next-line github/no-d-none */
  warn.classList.add('d-none')

  const container = warn.parentElement!

  const message = container.querySelector('.js-no-rich-changes')
  if (message) {
    /* eslint-disable-next-line github/no-d-none */
    message.classList.remove('d-none')
  }
})
