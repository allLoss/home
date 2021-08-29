import {fromEvent} from '../subscription'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'
import {requestSubmit} from '../form'

observe('.repository-import', {
  subscribe: el =>
    fromEvent(el, 'socket:message', function (event: Event) {
      const data = (event as CustomEvent).detail.data
      if (data.redirect_to) {
        document.location.href = data.redirect_to
        event.stopImmediatePropagation()
      }
    })
})

on('change', 'input.js-repository-import-lfs-opt', function ({currentTarget}) {
  const percentage = parseInt(currentTarget.getAttribute('data-percent-used') || '')
  const lfsContainer = currentTarget.closest<HTMLElement>('.js-repository-import-lfs-container')!
  const storageUsed = currentTarget.getAttribute('data-used') || ''

  /* eslint-disable-next-line github/no-d-none */
  lfsContainer
    .querySelector<HTMLElement>('.js-repository-import-lfs-warn')!
    .classList.toggle('d-none', !(percentage > 100))
  lfsContainer.querySelector<HTMLElement>('.js-usage-bar')!.classList.toggle('exceeded', percentage >= 100)
  lfsContainer.querySelector<HTMLElement>('.js-usage-bar')!.setAttribute('aria-label', `${percentage}%`)
  lfsContainer.querySelector<HTMLElement>('.js-repository-import-lfs-progress')!.style.width = `${percentage}%`
  lfsContainer.querySelector<HTMLElement>('span.js-usage-text')!.textContent = storageUsed
})

// TODO Replace with data-replace-remote-form behavior.
remoteForm('.js-repository-import-author-form', async function (form, wants) {
  const response = await wants.html()
  const selectedAuthor = form.closest<HTMLElement>('.js-repository-import-author')!
  selectedAuthor.replaceWith(response.html)
})

on('click', '.js-repository-import-projects-cancel-button', function () {
  const form = document.querySelector<HTMLFormElement>('.js-repository-import-projects-cancel-form')!
  requestSubmit(form)
})
