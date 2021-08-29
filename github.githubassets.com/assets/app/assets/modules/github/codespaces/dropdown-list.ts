import {on} from 'delegated-events'
import {parseHTML} from '../parse-html'
import {prefetchCodespaceLocation} from '../prefetch-codespace-location'

on('submit', '.js-toggle-hidden-codespace-form', function (event) {
  const form = event.currentTarget as HTMLFormElement
  toggleFormSubmissionInFlight(form)
})

on('click', '.js-create-codespace-with-sku-button', async function (event) {
  const skuButton = event.currentTarget
  const form =
    (skuButton.closest("[data-target*='new-codespace.createCodespaceForm']") as HTMLFormElement) ||
    (skuButton.closest("[data-target*='new-codespace.createCodespaceWithSkuSelectForm']") as HTMLFormElement)

  await prefetchCodespaceLocation(form)

  toggleFormSubmissionInFlight(form)

  if (form.classList.contains('js-open-in-vscode-form')) {
    createCodespaceIntoVscode(form)
  } else {
    form.submit()
  }
})

export function toggleFormSubmissionInFlight(form: HTMLFormElement) {
  const elementsToHide = form.querySelectorAll<HTMLElement>('.js-toggle-hidden')
  for (const element of elementsToHide) {
    element.hidden = !element.hidden
  }

  const elementsToDisable = form.querySelectorAll<HTMLElement>('.js-toggle-disabled')
  for (const element of elementsToDisable) {
    if (element.getAttribute('aria-disabled')) {
      element.removeAttribute('aria-disabled')
    } else {
      element.setAttribute('aria-disabled', 'true')
    }
  }
}

function getFormTarget(form: HTMLFormElement): Element | null {
  return form.closest('[data-replace-remote-form-target]')
}

on('submit', 'form.js-codespaces-delete-form', async function (event) {
  event.preventDefault()

  const form = event.currentTarget as HTMLFormElement
  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        // We're passing *both* the Accept header and the XHR header. Ideally
        // we'd *only* pass Accept but currently the SAML filter only returns a
        // 401 for XHR requests. So we need to pass both headers to get the
        // behavior we want here.
        Accept: 'text/fragment+html',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    if (response.ok) {
      const html = parseHTML(document, await response.text())
      const target = getFormTarget(form)!
      target.replaceWith(html)
    } else if (response.status === 401) {
      // If we get a 401 then it _probably_ means they need to re-auth
      // (e.g., session expired), so try doing a full form submission instead,
      // which should bounce them through the appropriate authentication flow.
      form.submit()
    } else {
      throw new Error(`Unexpected response: ${response.statusText}`)
    }
  } finally {
    toggleFormSubmissionInFlight(form)
  }
})

on('submit', 'form.js-open-in-vscode-form', async function (event) {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  await createCodespaceIntoVscode(form)
})

async function createCodespaceIntoVscode(form: HTMLFormElement) {
  const response = await fetch(form.action, {
    method: form.method,
    body: new FormData(form),
    headers: {
      // We're passing *both* the Accept header and the XHR header. Ideally
      // we'd *only* pass Accept but currently the SAML filter only returns a
      // 401 for XHR requests. So we need to pass both headers to get the
      // behavior we want here.
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  if (response.ok) {
    const json = await response.json()
    if (json.codespace_url) {
      window.location.href = json.codespace_url
      toggleFormSubmissionInFlight(form)
    } else {
      const dropdown = form.closest('get-repo') || form.closest('new-codespace')
      if (dropdown) {
        form.setAttribute('data-src', json.loading_url)
        form.dispatchEvent(new CustomEvent('pollvscode'))
      } else if (form.closest('prefetch-pane')) {
        form.setAttribute('data-src', json.loading_url)
        form.dispatchEvent(new CustomEvent('prpollvscode'))
      }
      toggleFormSubmissionInFlight(form)
    }
  } else if (response.status === 422) {
    const json = await response.json()
    const errorMessage = form.querySelector('.js-open-in-vscode-error') as HTMLElement
    if (errorMessage) {
      errorMessage.insertAdjacentHTML('afterbegin', json.error)
      errorMessage.hidden = false
    }
  }
}
