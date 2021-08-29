import {compare, fuzzyScore} from '../../fuzzy-filter'
import {compose, fromEvent} from '../../subscription'
import {fire, on} from 'delegated-events'
import {persistResumableFields, restoreResumableFields} from '@github/session-resume'
import SlashCommandExpanderElement from '../../slash-command-expander-element'
import {fetchSafeDocumentFragment} from '../../fetch'
import {filterSort} from '../../filter-sort'
import {getPageID} from '../../session-resume-helpers'
import memoize from '@github/memoize'
import {observe} from 'selector-observer'

const SLASH_COMMAND_STRING_BEGINNING = '/'

function search(items: Element[], searchQuery: string): Element[] {
  const query = searchQuery.toLowerCase().trim()
  const key = (item: Element) => {
    const text = (item.getAttribute('data-text') || '').trim().toLowerCase()
    const score = fuzzyScore(text, query)
    return score > 0 ? {score, text} : null
  }

  if (query) {
    return filterSort(items, key, compare)
  } else {
    return items
  }
}

observe('slash-command-expander[data-slash-command-url]', {
  subscribe: el =>
    compose(fromEvent(el, 'text-expander-change', onChange), fromEvent(el, 'text-expander-value', onValue))
})

// Trigger the menu from the markdown toolbar button
on('click', '.js-slash-command-toolbar-button', async event => {
  if (!(event.target instanceof Element)) return

  const container = event.target.closest<HTMLElement>('.js-previewable-comment-form')
  if (!container) return

  const textarea = container.querySelector<HTMLTextAreaElement>('textarea.js-comment-field')
  if (!textarea) return

  // similar to the `insertText` utility behavior, but with different cursor positioning
  const text = SLASH_COMMAND_STRING_BEGINNING
  const point = textarea.selectionEnd || 0
  const beginning = textarea.value.substring(0, point)
  const remaining = textarea.value.substring(point)
  const space = textarea.value === '' || beginning.match(/\s$/) ? '' : ' '
  const cursorPosition = point + text.length + 1 // place cursor after the slash

  textarea.value = beginning + space + text + remaining
  textarea.selectionStart = cursorPosition
  textarea.selectionEnd = cursorPosition
  textarea.focus()

  fire(textarea, 'input')
})

async function onValue(event: Event) {
  const detail = (event as CustomEvent).detail
  const {key, item}: {key: string; item: HTMLElement} = detail
  if (key !== SLASH_COMMAND_STRING_BEGINNING) return

  const url = item.getAttribute('data-url')
  if (!url) return

  // find form to hide
  const currentTarget = event.currentTarget as SlashCommandExpanderElement

  // Leaving this here so that a linter doesn't complain
  const form = item.querySelector<HTMLFormElement>('.js-slash-command-suggestion-form')
  if (!form) return

  const token = form.querySelector<HTMLInputElement>('.js-data-url-csrf')
  if (!token) return

  const formData = new FormData(form)
  currentTarget.isLoading()

  try {
    const response = await fetchSafeDocumentFragment(document, url, {
      method: 'PATCH',
      body: formData,
      headers: {
        Accept: 'text/html',
        'Scoped-CSRF-Token': token.value
      }
    })

    if (!response) return
    handleResponse(currentTarget, response)
  } catch {
    currentTarget.showError()
  }
}

function handleResponse(expander: SlashCommandExpanderElement, response: DocumentFragment) {
  const component = response.firstElementChild
  if (!component) return

  if (response.children.length > 1) {
    showFooter(response.lastElementChild as HTMLElement, expander)
  }

  if (component.hasAttribute('data-reload-suggestions')) {
    // re-fetch the commands if the resource state has changed
    cachedCommands = memoize(fetchSlashCommands)
  }

  const responseType = component.getAttribute('data-component-type')
  if (responseType === 'fill') {
    // if the content contains html tags, we'll use innerHTML
    if (/<\/?[a-z][\s\S]*>/i.test(component.innerHTML)) {
      expander.setValue(component.innerHTML.trim())
    } else {
      // otherwise we'll use textContent so we aren't inserting unnecessary HTML entity characters
      expander.setValue(component.textContent?.trim() || '')
    }
  } else if (responseType === 'menu' || responseType === 'error') {
    expander.setMenu(component.querySelector('.js-slash-command-menu') as HTMLElement)
  } else if (responseType === 'action') {
    expander.closeMenu()
  } else if (responseType === 'embedded_form') {
    handleEmbeddedForm(expander, component)
  } else if (responseType === 'dialog_form') {
    handleDialogForm(expander, component)
  } else if (responseType === 'modal_form') {
    handleModalForm(expander, component)
  }

  restoreResumableFields(getPageID())
}

function submitOnCommandEnter(event: KeyboardEvent) {
  if (!(event.metaKey && event.key === 'Enter')) return

  event.preventDefault()
  event.stopPropagation()

  const input = event.target as HTMLInputElement | null
  const form = input?.form as HTMLFormElement | null

  if (!form) return

  if (form.requestSubmit) {
    form.requestSubmit()
  } else {
    // Handle browsers that don't support support `requestSubmit`, like Safari.
    // This relies on the presence of a submit button. If absent, Cmd-Enter won't do anything.
    const submitButton = form.querySelector("[type='submit']") as HTMLElement
    submitButton?.click()
  }
}

function getFormContents(form: HTMLFormElement) {
  const formData = new FormData(form)
  let contents = ''

  for (const fieldPair of formData) {
    contents = contents + fieldPair[0]
    contents = contents + fieldPair[1].toString()
  }

  return contents
}

function focusFirstFormInput(formElement: HTMLFormElement) {
  let inputFocused = false
  for (const element of formElement.querySelectorAll('select,input,textarea')) {
    const input = element as HTMLInputElement

    if (input.type !== 'hidden') {
      if (!inputFocused) {
        input.focus()
        inputFocused = true
      }

      input.addEventListener('keydown', submitOnCommandEnter)
    }
  }
}

function hookUpCancelActionListeners(element: HTMLElement, closeForm: () => void) {
  const closeElements = element.querySelectorAll('[data-close-dialog]')
  for (const closeElement of closeElements) {
    closeElement.addEventListener('click', (event: Event) => {
      event.preventDefault()
      persistResumableFields(getPageID(), {selector: '.js-session-resumable'})
      closeForm()
    })
  }
}

function addDismissAlertListener(
  formElement: HTMLFormElement,
  elementToListenOn: HTMLElement,
  previouslyFocused: HTMLElement,
  closeForm: () => void
) {
  const originalFormContents = getFormContents(formElement)
  elementToListenOn.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // eslint-disable-next-line i18n-text/no-en
      const confirmationMessage = 'Are you sure you want to dismiss the form?'
      const currentFormContents = getFormContents(formElement)
      const isUnchanged = originalFormContents === currentFormContents

      if (isUnchanged || confirm(confirmationMessage)) {
        persistResumableFields(getPageID(), {selector: '.js-session-resumable'})
        closeForm()

        if (previouslyFocused) {
          previouslyFocused.focus()
        }
      }
    }
  })
}

function addSubmitButtonListener(
  formElement: HTMLFormElement,
  expander: SlashCommandExpanderElement,
  closeForm: () => void
) {
  formElement.addEventListener('submit', async (event: Event) => {
    event.preventDefault()
    const form = event.target as HTMLFormElement
    const token = form.querySelector<HTMLInputElement>('.js-data-url-csrf')
    if (!token) return

    const url = form.getAttribute('action')
    if (!url) return

    reenableParentFormButtons(expander)

    const formData = new FormData(form)
    const response = await fetchSafeDocumentFragment(document, url, {
      method: 'PATCH',
      body: formData,
      headers: {
        Accept: 'text/html',
        'Scoped-CSRF-Token': token.value
      }
    })
    closeForm()
    if (!response) return
    handleResponse(expander, response)
  })
}

/*
  When a slash command form is "submitted", the parent form's buttons can become
  inadvertently disabled if they have a `data-disable-with` attribute, due to the
  behavior defined in the `disable-with` module, which binds its event listeners ahead
  of slash commands and cannot be prevented using stopPropagation.

  Therefore, the parent form's buttons will need to be manually re-enabled
  when the nested slash command form has been submitted.
*/
function reenableParentFormButtons(expander: SlashCommandExpanderElement) {
  const siblingSurface = expander.closest('.js-slash-command-surface') as HTMLElement
  const formSurface = expander.closest('form') as HTMLElement
  const surface = siblingSurface || formSurface

  if (surface) {
    for (const button of surface.querySelectorAll('[data-disable-with][disabled]')) {
      ;(button as HTMLInputElement | HTMLButtonElement).disabled = false
    }
  }
}

function handleDialogForm(expander: SlashCommandExpanderElement, component: Element) {
  const menu = component.querySelector('.js-slash-command-menu') as HTMLElement
  expander.setMenu(menu, true)

  const componentForm = menu.querySelector('form') as HTMLFormElement
  const previouslyFocused = document.activeElement as HTMLElement

  focusFirstFormInput(componentForm)

  const closeForm = () => {
    expander.closeMenu()
  }

  addDismissAlertListener(componentForm, componentForm, previouslyFocused, closeForm)

  hookUpCancelActionListeners(componentForm, closeForm)

  addSubmitButtonListener(componentForm, expander, closeForm)
}

function handleModalForm(expander: SlashCommandExpanderElement, component: Element) {
  const surfaceForm = expander.closest('form')

  if (!surfaceForm) return

  const commandFormContainer = component.querySelector('[data-component="form"]') as HTMLFormElement
  surfaceForm.insertAdjacentElement('afterend', commandFormContainer)

  const previouslyFocused = document.activeElement as HTMLElement

  focusFirstFormInput(commandFormContainer)

  const closeForm = () => {
    surfaceForm.hidden = false
    commandFormContainer.remove()
  }

  hookUpCancelActionListeners(commandFormContainer, closeForm)

  const commandForm = commandFormContainer.getElementsByTagName('form')[0]
  addDismissAlertListener(commandForm, commandFormContainer, previouslyFocused, closeForm)

  addSubmitButtonListener(commandFormContainer, expander, closeForm)
}

function handleEmbeddedForm(expander: SlashCommandExpanderElement, component: Element) {
  const siblingSurface = expander.closest('.js-slash-command-surface') as HTMLElement
  const formSurface = expander.closest('form') as HTMLElement
  const surface = siblingSurface || formSurface

  if (!surface) return
  surface.hidden = true

  const commandFormContainer = component.querySelector('[data-component="form"]') as HTMLFormElement
  surface.insertAdjacentElement('afterend', commandFormContainer)

  const previouslyFocused = document.activeElement as HTMLElement

  focusFirstFormInput(commandFormContainer)

  const closeForm = () => {
    surface.hidden = false
    commandFormContainer.remove()
  }

  hookUpCancelActionListeners(commandFormContainer, closeForm)

  const commandForm = commandFormContainer.getElementsByTagName('form')[0]
  addDismissAlertListener(commandForm, commandFormContainer, previouslyFocused, closeForm)

  addSubmitButtonListener(commandFormContainer, expander, closeForm)
}

const durationToDisplayNotice = 5000
function showFooter(footer: HTMLElement, slashCommandExpander: SlashCommandExpanderElement) {
  const commentArea = slashCommandExpander.parentElement?.parentElement
  if (!commentArea) return

  const defaultFooter = commentArea.querySelector('.drag-and-drop .default') as HTMLElement

  let previousDefaultFooterHidden = false
  if (defaultFooter) {
    previousDefaultFooterHidden = defaultFooter.hidden
    defaultFooter.hidden = true
  }

  defaultFooter?.parentElement?.prepend(footer)

  setTimeout(() => {
    if (defaultFooter) {
      defaultFooter.hidden = previousDefaultFooterHidden
    }
    footer.remove()
  }, durationToDisplayNotice)
}

function onChange(event: Event) {
  const {key, provide, text} = (event as CustomEvent).detail
  if (key !== SLASH_COMMAND_STRING_BEGINNING) return
  const menu = event.target as SlashCommandExpanderElement
  menu.isLoading()
  const url = menu.getAttribute('data-slash-command-url')!
  provide(slashCommandMenu(url, text, menu))
}

async function slashCommandMenu(
  url: string,
  query: string,
  target: SlashCommandExpanderElement
): Promise<{fragment: HTMLElement; matched: boolean}> {
  try {
    const [root, children] = await cachedCommands(url)
    const list = root.querySelector('.js-slash-command-menu-items') as HTMLElement
    const results = search(children, query)

    if (list) {
      list.innerHTML = ''

      // we loop over `children` to ensure that the group sort order is maintained
      // and so that we can include the relevant group headers for any search results
      for (const el of children) {
        if (el.classList.contains('js-group-divider')) {
          // if it's a divider row, only append it if there are results for this group
          const groupId = el.getAttribute('data-group-id')
          const groupResults = results.filter(r => r.getAttribute('data-group-id') === groupId)

          if (groupResults.length > 0) {
            list.append(el)
          }
        } else if (results.includes(el)) {
          // append the element if it is contained in the results
          list.append(el)
        }
      }
    }

    return {fragment: root, matched: results.length > 0}
  } catch (error) {
    target.showError()
    throw new Error(error)
  }
}

async function fetchSlashCommands(url: string): Promise<[HTMLElement, Element[]]> {
  const fragment = await fetchSafeDocumentFragment(document, url)
  const root = fragment.firstElementChild as HTMLElement
  const children = root.querySelectorAll('.js-slash-command-menu-items li')
  return [root, [...children]]
}
let cachedCommands = memoize(fetchSlashCommands)
