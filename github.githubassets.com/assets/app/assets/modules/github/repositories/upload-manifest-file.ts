import FileAttachmentElement, {Attachment} from '@github/file-attachment-element'

import type Batch from '../upload/batch'
import {fetchPoll} from '../fetch'
import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import pjax from '../behaviors/pjax'
import {remoteForm} from '@github/remote-form'

// Delay file uploads while waiting for a manifest to save.
let savingManifest: Promise<Response> | null = null

// Track saved manifests for delayed uploads.
const manifests = new WeakMap()

function showProgress(target: Element, batch: Batch) {
  const container = target.closest<HTMLElement>('.js-upload-manifest-file-container')!
  const progress = container.querySelector<HTMLElement>('.js-upload-progress')!
  progress.hidden = false
  target.classList.add('is-progress-bar')

  const text = progress.querySelector<HTMLElement>('.js-upload-meter-text')!

  const start = text.querySelector<HTMLElement>('.js-upload-meter-range-start')!
  start.textContent = String(batch.uploaded() + 1)

  const end = text.querySelector<HTMLElement>('.js-upload-meter-range-end')!
  end.textContent = String(batch.size)
}

function hideProgress(target: Element) {
  target.classList.remove('is-progress-bar')

  const container = target.closest<HTMLElement>('.js-upload-manifest-file-container')!
  const progress = container.querySelector<HTMLElement>('.js-upload-progress')!
  progress.hidden = true

  const text = container.querySelector<HTMLElement>('.js-upload-meter-text .js-upload-meter-filename')!
  text.textContent = ''
}

on('file-attachment-accept', '.js-upload-manifest-file', function (event) {
  const {attachments} = event.detail
  const max = parseInt(event.currentTarget.getAttribute('data-directory-upload-max-files') || '', 10)
  if (attachments.length > max) {
    event.preventDefault()
    event.currentTarget.classList.add('is-too-many')
  }
})

on('document:drop', '.js-upload-manifest-tree-view', async function (event) {
  const {transfer} = event.detail
  const target = event.currentTarget
  const files = await Attachment.traverse(transfer, true)

  // Start file upload after pjax to uploads page.
  const container = document.querySelector<HTMLElement>('#js-repo-pjax-container')!
  container.addEventListener(
    'pjax:success',
    () => {
      container.querySelector<FileAttachmentElement>('.js-upload-manifest-file')!.attach(files)
    },
    {once: true}
  )

  const url = target.getAttribute('data-drop-url')!
  pjax({url, container})
})

on('upload:setup', '.js-upload-manifest-file', async function (event) {
  const {batch, form: policyForm, preprocess} = event.detail
  const container = event.currentTarget

  showProgress(container, batch)

  function addInfo() {
    policyForm.append('upload_manifest_id', manifests.get(container))
  }

  // Manifest has already been saved, so uploader can do its thing.
  if (manifests.get(container)) {
    addInfo()
    return
  }

  // Queue ready function while manifest saves.
  if (savingManifest) {
    // eslint-disable-next-line github/no-then
    preprocess.push(savingManifest.then(addInfo))
    return
  }

  // Save manifest then trigger file uploads.
  const parent = container.closest<HTMLElement>('.js-upload-manifest-file-container')!
  const form = parent.querySelector('.js-upload-manifest-form') as HTMLFormElement
  savingManifest = fetch(form.action, {
    method: form.method,
    body: new FormData(form),
    headers: {Accept: 'application/json'}
  })

  const [first, resolve] = makeDeferred()
  // eslint-disable-next-line github/no-then
  preprocess.push(first.then(addInfo))

  const response = await savingManifest
  if (!response.ok) return
  const result = (await response.json()) as {upload_manifest: {id: string}}

  const commit = document.querySelector<HTMLFormElement>('.js-manifest-commit-form')!
  const manifestIdField = commit.elements.namedItem('manifest_id') as HTMLInputElement
  manifestIdField.value = result.upload_manifest.id

  // Mark manifest as saved so file uploads can begin.
  manifests.set(container, result.upload_manifest.id)
  savingManifest = null

  resolve()
})

function makeDeferred(): [Promise<void>, () => void] {
  let resolve: () => void
  const promise = new Promise<void>(_resolve => {
    resolve = _resolve
  })
  return [promise, resolve!]
}

on('upload:start', '.js-upload-manifest-file', function (event) {
  const {attachment, batch} = event.detail
  const container = event.currentTarget.closest<HTMLElement>('.js-upload-manifest-file-container')!
  const progress = container.querySelector<HTMLElement>('.js-upload-progress')!
  const text = progress.querySelector<HTMLElement>('.js-upload-meter-text')!

  const start = text.querySelector<HTMLElement>('.js-upload-meter-range-start')!
  start.textContent = batch.uploaded() + 1

  const name = text.querySelector<HTMLElement>('.js-upload-meter-filename')!
  name.textContent = attachment.fullPath
})

on('upload:complete', '.js-upload-manifest-file', function (event) {
  const {attachment, batch} = event.detail

  // Add uploaded file to list.
  const template = document.querySelector<HTMLElement>('.js-manifest-commit-file-template')!
  const row = template.querySelector<HTMLElement>('.js-manifest-file-entry')!.cloneNode(true) as HTMLElement
  const name = row.querySelector<HTMLElement>('.js-filename')!
  name.textContent = attachment.fullPath

  const fileID = attachment.id
  const form = row.querySelector<HTMLFormElement>('.js-remove-manifest-file-form')!
  const input = form.elements.namedItem('file_id') as HTMLInputElement
  input.value = fileID

  const list = document.querySelector<HTMLElement>('.js-manifest-file-list')!
  list.hidden = false
  event.currentTarget.classList.add('is-file-list')

  const root = list.querySelector<HTMLElement>('.js-manifest-file-list-root')!
  root.appendChild(row)
  if (batch.isFinished()) {
    hideProgress(event.currentTarget)
  }
})

on('upload:progress', '.js-upload-manifest-file', function (event) {
  const {batch} = event.detail
  const container = event.currentTarget.closest<HTMLElement>('.js-upload-manifest-file-container')!
  const meter = container.querySelector<HTMLElement>('.js-upload-meter')!
  meter.style.width = `${batch.percent()}%`
})

function onerror(event: Event) {
  hideProgress(event.currentTarget as Element)
}

on('upload:error', '.js-upload-manifest-file', onerror)
on('upload:invalid', '.js-upload-manifest-file', onerror)

remoteForm('.js-remove-manifest-file-form', async function (form, wants) {
  await wants.html()

  const root = form.closest<HTMLElement>('.js-manifest-file-list-root')!
  const entry = form.closest<HTMLElement>('.js-manifest-file-entry')!
  entry.remove()

  if (!root.hasChildNodes()) {
    const list = root.closest<HTMLElement>('.js-manifest-file-list')!
    list.hidden = true

    const container = document.querySelector<HTMLElement>('.js-upload-manifest-file')!
    container.classList.remove('is-file-list')
  }
})

async function manifestReadyCheck(el: Element) {
  const url = el.getAttribute('data-redirect-url')!
  try {
    await fetchPoll(el.getAttribute('data-poll-url')!)
    window.location.href = url
  } catch (e) {
    document.querySelector<HTMLElement>('.js-manifest-ready-check')!.hidden = true
    document.querySelector<HTMLElement>('.js-manifest-ready-check-failed')!.hidden = false
  }
}

// Navigate to pull request page when manifest commit is ready.
observe('.js-manifest-ready-check', {
  initialize(el) {
    manifestReadyCheck(el)
  }
})
