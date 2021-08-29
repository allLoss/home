import {detectContainer, preserveScrollTo} from './utils'
import pjaxRequest, {PjaxOptions} from '../pjax'
import {on} from 'delegated-events'
import {serialize} from '../../form'

on('submit', 'form[data-pjax]', function (event) {
  const form = event.currentTarget as HTMLFormElement
  const container = detectContainer(form)

  if (!container) {
    return
  }

  const scrollTo = preserveScrollTo(form)

  const opts: PjaxOptions = {
    type: (form.method || 'GET').toUpperCase(),
    url: form.action,
    target: form,
    scrollTo,
    container
  }

  if (opts.type === 'GET') {
    // Can't handle file uploads, exit
    if (form.querySelector('input[type=file]')) {
      return
    }

    const url = parseURL(opts.url!)
    url.search += (url.search ? '&' : '') + serialize(form)
    opts.url = url.toString()
  } else {
    opts.data = new FormData(form)
  }

  pjaxRequest(opts)
  event.preventDefault()
})

function parseURL(url: string): HTMLAnchorElement {
  const a = document.createElement('a')
  a.href = url
  return a
}
