import {on} from 'delegated-events'
import {saveDraft} from './releases'

on('click', '.js-release-remove-file', function (event) {
  const container = event.currentTarget.closest<HTMLElement>('.js-release-file')!
  container.classList.add('delete')
  container.querySelector<HTMLInputElement>('input.destroy')!.value = 'true'
})

on('click', '.js-release-undo-remove-file', function (event) {
  const container = event.currentTarget.closest<HTMLElement>('.js-release-file')!
  container.classList.remove('delete')
  container.querySelector<HTMLInputElement>('input.destroy')!.value = ''
})

function getReleaseId(container: Element) {
  const form = container.closest<HTMLFormElement>('form')!
  return form.querySelector<HTMLInputElement>('#release_id')!.value
}

// Delay file uploads while waiting for a release to save.
let savingDraft: Promise<unknown> | null = null

on('release:saved', '.js-release-form', function (event) {
  const form = event.currentTarget
  savingDraft = null

  // Remove assets that were marked for deletion and now deleted on the server.
  let remaining = false
  for (const el of form.querySelectorAll('.js-releases-field .js-release-file')) {
    if (el.classList.contains('delete')) {
      el.remove()
    } else if (!el.classList.contains('js-template')) {
      remaining = true
    }
  }

  const field = form.querySelector<HTMLElement>('.js-releases-field')!
  field.classList.toggle('not-populated', !remaining)
  field.classList.toggle('is-populated', remaining)
})

function addInfo(container: Element, form: FormData) {
  form.append('release_id', getReleaseId(container))

  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement>('.js-releases-field .js-release-file.delete .id')
  )
  if (candidates.length) {
    const ids = candidates.map(el => el.value)
    form.append('deletion_candidates', ids.join(','))
  }
}

on('upload:setup', '.js-upload-release-file', function (event) {
  const {form, preprocess} = event.detail
  const container = event.currentTarget

  // This release has a database record, so upload can proceed normally.
  if (getReleaseId(container)) {
    addInfo(container, form)
    return
  }

  if (!savingDraft) {
    const button = document.querySelector<HTMLButtonElement>('.js-save-draft')!
    savingDraft = saveDraft(button)
  }

  // Delay this upload by queueing until a draft has been saved.
  const after = addInfo.bind(null, container, form)
  // eslint-disable-next-line github/no-then
  preprocess.push(savingDraft.then(after))
})

on('upload:start', '.js-upload-release-file', function (event) {
  const policy = event.detail.policy

  const meter = event.currentTarget.querySelector<HTMLElement>('.js-upload-meter')!
  /* eslint-disable-next-line github/no-d-none */
  meter.classList.remove('d-none')

  const replaceId = policy.asset['replaced_asset']
  if (!replaceId) return

  for (const el of document.querySelectorAll<HTMLInputElement>('.js-releases-field .js-release-file .id')) {
    if (Number(el.value) === replaceId) {
      el.closest<HTMLElement>('.js-release-file')!.remove()
    }
  }
})

on('upload:complete', '.js-upload-release-file', function (event) {
  const {attachment} = event.detail

  const field = document.querySelector<HTMLElement>('.js-releases-field')!
  const release = field.querySelector<HTMLElement>('.js-template')!.cloneNode(true) as Element
  /* eslint-disable-next-line github/no-d-none */
  release.classList.remove('d-none', 'js-template')

  release.querySelector<HTMLInputElement>('input.id')!.value = attachment.id

  const name = attachment.name || attachment.href.split('/').pop()
  for (const el of release.querySelectorAll('.js-release-asset-filename')) {
    if (el instanceof HTMLInputElement) {
      el.value = name
    } else {
      el.textContent = name
    }
  }

  const filesize = `(${(attachment.file.size / (1024 * 1024)).toFixed(2)} MB)`
  release.querySelector<HTMLElement>('.js-release-asset-filesize')!.textContent = filesize

  field.appendChild(release)
  field.classList.remove('not-populated')
  field.classList.add('is-populated')

  const meter = event.currentTarget.querySelector<HTMLElement>('.js-upload-meter')!
  /* eslint-disable-next-line github/no-d-none */
  meter.classList.add('d-none')
})

on('upload:progress', '.js-upload-release-file', function (event) {
  const {attachment} = event.detail
  const meter = event.currentTarget.querySelector<HTMLElement>('.js-upload-meter')!
  meter.style.width = `${attachment.percent}%`
})
