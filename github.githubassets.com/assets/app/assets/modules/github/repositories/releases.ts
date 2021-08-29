import {fire, on} from 'delegated-events'
import {getState} from '../behaviors/pjax'
import {observe} from 'selector-observer'
import {replaceState} from '../history'

// Save a release as a draft.
export async function saveDraft(button: HTMLButtonElement): Promise<unknown> {
  const form = button.form!

  const draftField = form.querySelector<HTMLInputElement>('#release_draft')!
  draftField.value = '1'

  setState(button, 'saving')

  const response = await fetch(form.action, {
    method: form.method,
    body: new FormData(form),
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  if (!response.ok) {
    setState(button, 'failed')
    return
  }
  const release = await response.json()
  setState(button, 'saved')
  setTimeout(setState, 5000, button, 'default')
  fire(form, 'release:saved', {release})
  return release
}

on('change', '.js-releases-marketplace-publish-field', function (event) {
  processMarketplacePublishCheckbox(event.currentTarget as HTMLInputElement)
})

observe('.js-releases-marketplace-publish-field', function (input) {
  processMarketplacePublishCheckbox(input as HTMLInputElement)
})

function processMarketplacePublishCheckbox(input: HTMLInputElement) {
  const container = input.closest<HTMLElement>('.js-releases-marketplace-publish-container')!
  const previewPane = container.querySelector<HTMLElement>('.js-releases-marketplace-publish-preview')!

  if (input.checked) {
    /* eslint-disable-next-line github/no-d-none */
    previewPane.classList.remove('d-none')
  } else {
    /* eslint-disable-next-line github/no-d-none */
    previewPane.classList.add('d-none')
  }
}

on('click', '.js-save-draft', function (event) {
  const button = event.currentTarget as HTMLButtonElement
  saveDraft(button)
  event.preventDefault()
})

on('click', '.js-timeline-tags-expander', function (event) {
  const expander = event.currentTarget
  const tags = expander.closest<HTMLElement>('.js-timeline-tags')!
  tags.classList.remove('is-collapsed')
})

function setState(el: HTMLButtonElement, state: string) {
  for (const message of el.querySelectorAll<HTMLElement>('.js-save-draft-button-state')) {
    message.hidden = message.getAttribute('data-state') !== state
  }
  el.disabled = state === 'saving'
}

// TODO: This can be removed if the form submission reloads the page or fresh
// form markup is served and replaced in the tree rather than a JSON response.
on('release:saved', '.js-release-form', function (event) {
  const release = event.detail.release
  const form = event.currentTarget
  const repoUrl = form.getAttribute('data-repo-url')!

  const updateUrl = release.update_url || releasesUrl('tag', repoUrl, release.tag_name)
  form.setAttribute('action', updateUrl)

  if (release.update_authenticity_token) {
    // eslint-disable-next-line github/authenticity-token
    const tokenInput = form.querySelector('input[name=authenticity_token]') as HTMLInputElement
    tokenInput.value = release.update_authenticity_token
  }

  const editUrl = release.edit_url || releasesUrl('edit', repoUrl, release.tag_name)
  replaceState(getState(), document.title, editUrl)

  const deleteForm = document.querySelector('#delete_release_confirm form')
  if (deleteForm) {
    const deleteUrl = release.delete_url || releasesUrl('tag', repoUrl, release.tag_name)
    deleteForm.setAttribute('action', deleteUrl)

    if (release.delete_authenticity_token) {
      // eslint-disable-next-line github/authenticity-token
      const deleteTokenInput = deleteForm.querySelector<HTMLInputElement>('input[name=authenticity_token]')!
      deleteTokenInput.value = release.delete_authenticity_token
    }
  }

  const input = form.querySelector('#release_id') as HTMLInputElement
  if (!input.value) {
    input.value = release.id
    const methodInput = document.createElement('input')
    methodInput.type = 'hidden'
    methodInput.name = '_method'
    methodInput.value = 'put'
    form.appendChild(methodInput)
  }
})

// Publish a release
on('click', '.js-publish-release', function () {
  document.querySelector<HTMLInputElement>('#release_draft')!.value = '0'
})

// Tag validations
function setTagWrapperState(state: string) {
  const wrapper = document.querySelector<HTMLElement>('.js-release-target-wrapper')

  if (wrapper == null) {
    return
  }

  setTagState(state)

  switch (state) {
    case 'valid':
    case 'invalid':
    case 'duplicate':
      wrapper.hidden = true
      break
    case 'loading':
      break
    default:
      wrapper.hidden = false
  }

  for (const status of document.querySelectorAll<HTMLElement>('.js-tag-status-message')) {
    status.hidden = status.getAttribute('data-state') !== state
  }

  const generateNotesButton = document.querySelector<HTMLElement>('.js-generate-release-notes')
  if (generateNotesButton) {
    generateNotesButton.hidden = state !== 'valid' && state !== 'pending'
  }
}

export function getTagState() {
  const tagInput = document.querySelector('.js-release-tag')!
  return tagInput.getAttribute('data-state')
}

function setTagState(state: string) {
  const tagInput = document.querySelector('.js-release-tag')!
  tagInput.setAttribute('data-state', state)
}

const lastChecked = new WeakMap()

function getTagName(container: ParentNode) {
  const selectedRadio = container.querySelector<HTMLInputElement>('input[name="release[tag_name]"]:checked')

  return selectedRadio
    ? selectedRadio.value
    : container.querySelector<HTMLInputElement>('input[name="release[tag_name]"][type=text]')?.value
}

export async function checkTag(tagElement: Element) {
  const tagValue = getTagName(tagElement)
  if (!tagValue) {
    setTagWrapperState('empty')
    return
  }

  if (tagValue === lastChecked.get(tagElement)) {
    return
  }

  setTagWrapperState('loading')
  lastChecked.set(tagElement, tagValue)

  const urlStr = tagElement.getAttribute('data-url')!
  const url = new URL(urlStr, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))
  params.append('tag_name', tagValue)
  url.search = params.toString()

  type Data = {status: string; release_id: string; url: string}
  const response = await fetch(url.toString(), {
    headers: {Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
  })
  if (!response.ok) {
    setTagWrapperState('invalid')
    return
  }
  const data: Data = await response.json()
  if (
    data.status === 'duplicate' &&
    parseInt(tagElement.getAttribute('data-existing-id')!) === parseInt(data.release_id)
  ) {
    setTagWrapperState('valid')
  } else {
    document.querySelector<HTMLElement>('.js-release-tag .js-edit-release-link')!.setAttribute('href', data['url'])
    setTagWrapperState(data.status)
  }

  processChangedTag(tagElement)
}

on('click', '.js-generate-release-notes', function (event) {
  const button = event.currentTarget as HTMLButtonElement
  if (button.disabled) return
  generateNotes(button)
})

export async function generateNotes(button: HTMLButtonElement) {
  setGeneratedNotesFetchState('loading')
  button.disabled = true

  const repoUrl = button.getAttribute('data-repo-url')!
  const notesUrl = `${repoUrl}/releases/notes`
  const url = new URL(notesUrl, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))
  params.append('commitish', getCommitish())
  params.append('tag_name', getTagName(document) || '')
  url.search = params.toString()

  type NotesData = {body: string; commitish: string; title: string}
  const response = await fetch(url.toString(), {
    headers: {Accept: 'application/json'}
  })

  if (response.ok) {
    const data: NotesData = await response.json()

    if (data.commitish === getCommitish()) {
      const bodyInput = document.getElementById('release_body') as HTMLInputElement
      bodyInput.value = data.body

      const titleInput = document.getElementById('release_name') as HTMLInputElement
      if (!titleInput.value) {
        titleInput.value = data.title
      }

      setGeneratedNotesFetchState('succeed')
      setNotesTrackingState('generated')
      // Keep button disabled until tag or branch changes
    }
  } else {
    setGeneratedNotesFetchState('failed')
    button.disabled = false

    const data: {error: string} = await response.json()
    if (data && data.error) {
      // TODO Use better place to show error
      button.setAttribute('aria-label', data.error)
    }
  }
}

type GeneratedNotesFetchState = 'pending' | 'loading' | 'succeed' | 'failed'
const generatedNotesFetchStates = ['pending', 'loading', 'succeed', 'failed']

function setGeneratedNotesFetchState(newState: GeneratedNotesFetchState) {
  generatedNotesFetchStates.map((state: string) => {
    const icon = document.getElementById(`generate-icon-${state}`)
    if (icon) {
      if (state === newState) {
        icon.removeAttribute('hidden')
      } else {
        icon.setAttribute('hidden', 'true')
      }
    }
  })
}

/**
 * State used to track how the user interacts with generated notes
 * i.e. whether they generate notes at all, or generate them and edit them.
 */
type NotesTrackingState = 'initial' | 'generated' | 'generated-and-edited'

/**
 * Set generated notes state on hidden tracking input
 */
function setNotesTrackingState(state: NotesTrackingState) {
  const input = document.getElementById('generated_notes_state') as HTMLInputElement
  input.value = state
}

/**
 * Get generated notes state from hidden tracking input
 */
function getNotesTrackingState() {
  const input = document.getElementById('generated_notes_state') as HTMLInputElement
  return input.value
}

/**
 * The ref to use to generate notes.
 * If we have an existing tag, use it. Use branch instead.
 */
function getCommitish() {
  if (getTagState() === 'valid') {
    return getTagName(document) || ''
  }

  return document.querySelector<HTMLInputElement>('input[name="release[target_commitish]"]:checked')?.value || ''
}

function releasesUrl(action: string, repoUrl: string, tagName: string): string {
  return `${repoUrl}/releases/${action}/${tagName}`
}

observe('.js-release-tag', function initialize(tagElement) {
  checkTag(tagElement)
})

observe('input.js-release-tag-field', {
  constructor: HTMLInputElement,
  initialize(input) {
    const tagElement = input.closest('.js-release-tag')!
    input.addEventListener('blur', function () {
      checkTag(tagElement)
    })
  }
})

function processChangedTag(tagElement: Element) {
  const form = tagElement.closest<HTMLFormElement>('form')!
  const previewable = form.querySelector('.js-previewable-comment-form')
  if (!previewable) return

  let baseUrl = previewable.getAttribute('data-base-preview-url')
  if (!baseUrl) {
    baseUrl = String(previewable.getAttribute('data-preview-url'))
    previewable.setAttribute('data-base-preview-url', baseUrl)
  }

  const inputs = tagElement.querySelectorAll<HTMLInputElement>(
    'input[name="release[tag_name]"], input[name="release[target_commitish]"]:checked'
  )
  const url = new URL(baseUrl, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))
  for (const input of inputs) {
    if (input.value) {
      params.append(input.name, input.value)
    }
  }
  url.search = params.toString()
  previewable.setAttribute('data-preview-url', url.toString())
}

function setGenerateNotesButtonDisabled(disabled: boolean) {
  const generateNotesButton = document.querySelector<HTMLButtonElement>('.js-generate-release-notes')
  if (generateNotesButton) {
    generateNotesButton.disabled = disabled
  }
}

function processChangedBody(body: HTMLInputElement) {
  if (body.value === '') {
    setGenerateNotesButtonDisabled(false)
    setGeneratedNotesFetchState('pending')
    setNotesTrackingState('initial')
  } else {
    setGenerateNotesButtonDisabled(true)
    if (getNotesTrackingState() === 'generated') {
      setNotesTrackingState('generated-and-edited')
    }
  }
}

// initial check for body content
observe('#release_body', function (el) {
  const input = el as HTMLInputElement
  input.addEventListener('input', function () {
    processChangedBody(input)
  })

  // call once for initialization
  processChangedBody(input)
})

// Dynamically update "data-preview-url" attribute when "tag_name" or "target_commitish" change
on('change', '.js-release-tag', function (event) {
  checkTag(event.currentTarget)
})

observe('.js-release-form .js-previewable-comment-form', function (el) {
  const tag = el.closest<HTMLElement>('form')!.querySelector<HTMLElement>('.js-release-tag')!
  processChangedTag(tag)
})
