import {observe} from 'selector-observer'
import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'
import {requestSubmit} from './form'

// Handles selection of ref from ref-selector.ts, which wasn't quite intended for this use case...
on('click', '.js-codespaces-branch', event => {
  const target = event.currentTarget as HTMLElement
  if (!target) return
  const refName = target.getAttribute('data-refname')!
  const refInput = document.querySelector('input#codespace_ref')! as HTMLInputElement
  refInput.setAttribute('value', refName)

  // mark the branch as set in the widget and close the <details>
  const summary = document.querySelector('.js-selected-branch')! as HTMLElement
  summary.textContent = refName
  target.closest('details')!.open = false
  event.preventDefault()
  return false
})

remoteForm('.js-new-codespace-form', async function (form, wants) {
  const container = form.closest<HTMLElement>('[data-replace-remote-form-target]')!
  const submitButton = container.querySelector('.js-new-codespace-submit-button')

  if (submitButton instanceof HTMLInputElement) {
    submitButton.disabled = true
  }

  form.classList.remove('is-error')
  form.classList.add('is-loading')

  try {
    const response = await wants.html()
    container.replaceWith(response.html)
  } catch (e) {
    form.classList.remove('is-loading')
    form.classList.add('is-error')
  }
})

type LoadingState = null | 'provisioning' | 'provisioned' | 'stuck' | 'failed'

let loadingState: LoadingState = null

function advanceLoadingState(state: LoadingState) {
  loadingState = state

  if (state !== null) {
    const loadingSteps = document.querySelector<HTMLDivElement>('.js-codespace-loading-steps')!
    loadingSteps.setAttribute('data-current-state', loadingState as string)
  }
}

observe('.js-codespace-loading-steps', {
  constructor: HTMLElement,
  add: el => {
    const currentState = el.getAttribute('data-current-state') as LoadingState
    if (currentState) advanceLoadingState(currentState)
  }
})

observe('.js-codespace-advance-state', {
  constructor: HTMLElement,
  add: el => {
    const targetState = el.getAttribute('data-state') as LoadingState
    if (targetState) advanceLoadingState(targetState)
  }
})

interface CascadeTokenResponse {
  token: string
}

let cascadeToken: string | null = null

function fetchCascadeToken(mintTokenForm: HTMLFormElement) {
  remoteForm('.js-fetch-cascade-token', async function (_form, wants) {
    try {
      const response = await wants.json()
      const payload = response.json as CascadeTokenResponse
      cascadeToken = payload.token
    } catch (e) {
      // do nothing since we have a fallback to this error and don't want to throw
    }
  })

  requestSubmit(mintTokenForm)
}

function waitForCascadeTokenWithTimeout(
  querySelector: string,
  cb: (token: string | undefined) => void,
  timeout: number
) {
  const container = document.querySelector(querySelector)
  if (container) {
    const start = Date.now()
    const checkToken = () => {
      const elapsed = Date.now() - start
      if (cascadeToken || elapsed >= timeout) {
        clearInterval(checkInterval)
        cb(cascadeToken || undefined)
        return
      }
    }
    const checkInterval = setInterval(checkToken, 50)
  }
}

observe('.js-auto-submit-form', {
  constructor: HTMLFormElement,
  initialize: requestSubmit
})

observe('.js-workbench-form-container', {
  constructor: HTMLElement,
  add: container => {
    const cascadeTokenField = container.querySelector('.js-cascade-token') as HTMLInputElement

    resolveCascadeToken(container, cascadeTokenField)
  }
})

function resolveCascadeToken(container: HTMLElement, cascadeTokenField: HTMLInputElement) {
  if (cascadeTokenField.value !== '') {
    const form = container.querySelector('form') as HTMLFormElement

    requestSubmit(form)
  } else {
    const mintTokenForm = document.querySelector('.js-fetch-cascade-token') as HTMLFormElement

    fetchCascadeToken(mintTokenForm)

    // wait 10000ms (10 seconds) for token and insert into the form if we successfully fetch a token
    waitForCascadeTokenWithTimeout('.js-workbench-form-container', insertCodespaceTokenIntoShowAuthForm, 10000)
  }
}

function insertCodespaceTokenIntoShowAuthForm(token: string | undefined) {
  const form = document.querySelector('.js-workbench-form-container form') as HTMLFormElement
  if (form && token) {
    insertCodespaceTokenIntoCascadeField(form, token)
    insertCodespaceTokenIntoPartnerInfo(form, token)
    requestSubmit(form)
  } else {
    // something happened and we couldn't get the token!
    advanceLoadingState('failed')
  }
}

function insertCodespaceTokenIntoCascadeField(form: HTMLFormElement, token: string) {
  const cascadeField = form.querySelector('.js-cascade-token')
  if (cascadeField) {
    cascadeField.setAttribute('value', token)
  }
}

function insertCodespaceTokenIntoPartnerInfo(form: HTMLFormElement, token: string) {
  const partnerInfoField = form.querySelector('.js-partner-info')
  if (partnerInfoField) {
    let partnerInfoData = partnerInfoField.getAttribute('value')
    if (partnerInfoData) {
      partnerInfoData = partnerInfoData.replace('%CASCADE_TOKEN_PLACEHOLDER%', token)
      partnerInfoField.setAttribute('value', partnerInfoData)
    }
  }
}
