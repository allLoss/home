import {fetchSafeDocumentFragment} from './github/fetch'
import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'

on('click', '.js-accept-topic-button', function (event: Event) {
  const button = event.currentTarget as HTMLButtonElement
  const container = button.closest<HTMLElement>('.js-topic-form-area')!
  const suggestionContainer = button.closest<HTMLElement>('.js-topic-suggestion')!

  // Put the newly applied suggestion in the list with the other applied topics
  const template = container.querySelector<HTMLElement>('.js-template')!
  const selections = container.querySelector<HTMLElement>('.js-tag-input-selected-tags')!
  const el = template.cloneNode(true) as HTMLElement

  const topic = button.getAttribute('data-topic-name')!
  el.querySelector<HTMLInputElement>('input')!.value = topic
  el.querySelector<HTMLElement>('.js-placeholder-tag-name')!.replaceWith(topic)
  /* eslint-disable-next-line github/no-d-none */
  el.classList.remove('d-none', 'js-template')
  selections.appendChild(el)

  // Remove the topic from the suggestions list
  suggestionContainer.remove()

  removeEmptySuggestionList(container)
})

remoteForm('.js-accept-topic-form', async function (form, wants) {
  await wants.html()

  const container = form.closest<HTMLElement>('.js-topic-form-area')!
  const suggestionContainer = form.closest<HTMLElement>('.js-topic-suggestion')!

  // Put the newly applied suggestion in the list with the other applied topics
  const template = container.querySelector<HTMLElement>('.js-template')!
  const selections = container.querySelector<HTMLElement>('.js-tag-input-selected-tags')!
  const el = template.cloneNode(true) as HTMLElement

  const topic = suggestionContainer.querySelector<HTMLInputElement>('input[name="input[name]"]')!.value
  el.querySelector<HTMLInputElement>('input')!.value = topic
  el.querySelector<HTMLElement>('.js-placeholder-tag-name')!.replaceWith(topic)
  /* eslint-disable-next-line github/no-d-none */
  el.classList.remove('d-none', 'js-template')
  selections.appendChild(el)

  // Remove the topic from the suggestions list
  suggestionContainer.remove()

  refreshSuggestions(container)
  removeEmptySuggestionList(container)
  flashNotice(form)
})

on('click', '.js-decline-topic-button', function (event: Event) {
  const button = event.currentTarget as HTMLButtonElement
  const container = button.closest<HTMLElement>('.js-topic-form-area')!
  const suggestionContainer = button.closest<HTMLElement>('.js-topic-suggestion')!

  // Remove the topic from the suggestions list
  // setTimeout here so the .js-decline-topic-form submits before button removal
  setTimeout(() => {
    suggestionContainer.remove()
    removeEmptySuggestionList(container)
  }, 0)
})

remoteForm('.js-decline-topic-form', async function (form, wants) {
  await wants.html()

  flashNotice(form)

  const container = form.closest<HTMLElement>('.js-topic-form-area')!

  // Remove the topic from the suggestions list
  const suggestionContainer = form.closest<HTMLElement>('.js-topic-suggestion')!
  suggestionContainer.remove()

  refreshSuggestions(container)
  removeEmptySuggestionList(container)
})

function removeEmptySuggestionList(formArea: Element) {
  const box = formArea.querySelector<HTMLElement>('.js-topic-suggestions-box')!
  const suggestions = box.querySelector('.js-topic-suggestion')
  if (!suggestions) {
    box.remove()
  }
}

function flashNotice(form: Element) {
  const container = form.closest<HTMLElement>('.js-topic-save-notice-container')!
  const notice = container.querySelector<HTMLElement>('.js-repo-topics-save-notice')!
  /* eslint-disable-next-line github/no-d-none */
  notice.classList.remove('d-none')
  notice.classList.add('d-inline-block', 'anim-fade-in')

  setTimeout(() => {
    notice.classList.remove('d-inline-block')
    /* eslint-disable-next-line github/no-d-none */
    notice.classList.add('d-none')
  }, 1900)
}

async function refreshSuggestions(formArea: Element) {
  const container = formArea.querySelector('.js-topic-suggestions-container')
  if (!container) return

  const url = container.getAttribute('data-url')!
  const html = await fetchSafeDocumentFragment(document, url)
  container.innerHTML = ''
  container.appendChild(html)
}
