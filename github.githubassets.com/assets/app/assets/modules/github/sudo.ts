import {dialog} from './details-dialog'
import {fetchSafeDocumentFragment} from './fetch'
import {remoteForm} from '@github/remote-form'
import {webauthnSupportLevel} from './webauthn-support-level'

let sudoPromptExist = false

/**
 * Take a URL and add webauthn params to it.
 *
 * @param {string} oldURL - The old URL.
 * @returns {string} - The new URL with added params.
 */
function urlWithParams(oldURL: string): string {
  const newURL = new URL(oldURL, window.location.origin)
  const params = new URLSearchParams(newURL.search.slice(1))
  params.set('webauthn-support', webauthnSupportLevel())
  newURL.search = params.toString()
  return newURL.toString()
}

async function loadPromptTemplate(): Promise<HTMLTemplateElement> {
  const link = document.querySelector<HTMLLinkElement>('link[rel=sudo-modal]')!
  const template = document.querySelector('.js-sudo-prompt')
  if (template instanceof HTMLTemplateElement) {
    return template
  } else if (link) {
    const fragment = await fetchSafeDocumentFragment(document, urlWithParams(link.href))
    document.body.appendChild(fragment)
    return document.querySelector<HTMLTemplateElement>('.js-sudo-prompt')!
  } else {
    throw new Error("couldn't load sudo prompt")
  }
}

let succeeded = false

/**
 * Provide a sudo prompt, and return when it has been filled in or dismissed.
 *
 * @returns {Promise<boolean>} - Resolves to `true` if the user successfully authed with sudo.
 */
async function sudoPrompt(): Promise<boolean> {
  if (sudoPromptExist) return false
  sudoPromptExist = true
  succeeded = false
  const template = await loadPromptTemplate()
  const content = template.content.cloneNode(true)
  const prompt = await dialog({content})
  await new Promise<void>(resolve => {
    prompt.addEventListener(
      'dialog:remove',
      function () {
        sudoPromptExist = false
        resolve()
      },
      {once: true}
    )
  })
  return succeeded
}

remoteForm('.js-sudo-form', async function (form, wants) {
  try {
    await wants.text()
  } catch (error) {
    if (!error.response) throw error
    let errorMessage
    switch (error.response.status) {
      case 401:
        // eslint-disable-next-line i18n-text/no-en
        errorMessage = 'Incorrect password.'
        break
      case 429:
        // eslint-disable-next-line i18n-text/no-en
        errorMessage = 'Too many password attempts. Please wait and try again later.'
        break
      default:
        // eslint-disable-next-line i18n-text/no-en
        errorMessage = 'Failed to receive a response. Please try again later.'
    }

    form.querySelector<HTMLElement>('.js-sudo-error')!.textContent = errorMessage
    form.querySelector<HTMLElement>('.js-sudo-error')!.hidden = false
    form.querySelector<HTMLInputElement>('.js-sudo-password')!.value = ''

    return
  }
  succeeded = true
  form.closest<HTMLElement>('details')!.removeAttribute('open')
})

/**
 * Check if user is in sudo mode. If not, show a sudo prompt.
 *
 * @returns {Promise<boolean>} - Will be `true` if user is in or got in sudo mode after prompt.
 */
export default async function triggerSudoPrompt(): Promise<boolean> {
  const response = await fetch('/sessions/in_sudo', {
    headers: {accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
  })
  if (response.ok) {
    const sudoResponse = await response.text()
    if (sudoResponse === 'true') {
      return true
    } else {
      return sudoPrompt()
    }
  }
  return sudoPrompt()
}
