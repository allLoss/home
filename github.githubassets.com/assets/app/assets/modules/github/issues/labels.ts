import {fire, on} from 'delegated-events'
import {onFocus, onInput, onKey} from '../onfocus'
import {resetCharactersRemainingCounts, updateInputRemainingCharacters} from '../behaviors/characters-remaining'
import {RGB} from 'color-convert/conversions'
import {changeValue} from '../form'
import convert from 'color-convert'
import {debounce} from '@github/mini-throttle'
import {dialog} from '../details-dialog'
import {fetchSafeDocumentFragment} from '../fetch'
import {getUtf8StringLength} from '../text'
import {remoteForm} from '@github/remote-form'
import {toggleDetailsTarget} from '../behaviors/details'

function randomRGBColor(): RGB {
  return [
    Math.floor(Math.random() * (255 - 0) + 0),
    Math.floor(Math.random() * (255 - 0) + 0),
    Math.floor(Math.random() * (255 - 0) + 0)
  ]
}

// Given a button element and a hex color code, this will style the button and
// the octicon within it based on the given color.
function setColorSwatch(colorButton: HTMLButtonElement, rgb: RGB) {
  const hsl = convert.rgb.hsl(rgb)
  colorButton.style.setProperty('--label-r', rgb[0].toString())
  colorButton.style.setProperty('--label-g', rgb[1].toString())
  colorButton.style.setProperty('--label-b', rgb[2].toString())

  colorButton.style.setProperty('--label-h', hsl[0].toString())
  colorButton.style.setProperty('--label-s', hsl[1].toString())
  colorButton.style.setProperty('--label-l', hsl[2].toString())
}

// Fill the color input field in the 'new label' modal when a button is clicked.
// Sets the color of the button that acts as the preview of the chosen color.
function setInputColorFromButton(clickedButton: HTMLButtonElement, rgb: RGB) {
  // eslint-disable-next-line github/no-blur
  clickedButton.blur()

  const container = clickedButton.closest<HTMLElement>('form')!

  const colorInput = container.querySelector<HTMLInputElement>('.js-new-label-color-input')!
  changeValue(colorInput, `#${convert.rgb.hex(rgb)}`)

  const colorButton = container.querySelector<HTMLButtonElement>('.js-new-label-color')!
  setColorSwatch(colorButton, rgb)
}

function addErrorToField(errorEl: HTMLElement, errorMessage: string) {
  const container = errorEl.closest<HTMLElement>('.js-label-error-container')!
  container.classList.add('errored')
  errorEl.textContent = errorMessage
  errorEl.hidden = false
}

function removeErrorFromField(errorEl: HTMLElement) {
  const container = errorEl.closest<HTMLElement>('.js-label-error-container')!
  container.classList.remove('errored')
  errorEl.hidden = true
}

function showOrHideLabelError(errorSelector: string, form: HTMLFormElement, errorMessages?: string[] | null) {
  const errorEl = form.querySelector<HTMLElement>(errorSelector)
  if (!errorEl) {
    return
  }

  if (errorMessages) {
    addErrorToField(errorEl, errorMessages[0])
  } else {
    removeErrorFromField(errorEl)
  }
}

interface labelError {
  name?: string[]
  description?: string[]
  color?: string[]
}

function showLabelErrors(form: HTMLFormElement, json: labelError) {
  showOrHideLabelError('.js-label-name-error', form, json.name)
  showOrHideLabelError('.js-label-description-error', form, json.description)
  showOrHideLabelError('.js-label-color-error', form, json.color)
}

function hideLabelErrors(form: HTMLFormElement) {
  showOrHideLabelError('.js-label-name-error', form, null)
  showOrHideLabelError('.js-label-description-error', form, null)
  showOrHideLabelError('.js-label-color-error', form, null)
}

function labelPreviewUrl(
  baseUrl: string,
  name: string,
  color: string,
  description: string | null,
  labelID: string | null
): string {
  const url = new URL(`${baseUrl}${encodeURIComponent(name)}`, window.location.origin)
  const params = new URLSearchParams(url.search.slice(1))
  params.append('color', color)
  if (description) {
    params.append('description', description)
  }
  if (labelID) {
    params.append('id', labelID)
  }
  url.search = params.toString()
  return url.toString()
}

function labelDescriptionFrom(form: HTMLFormElement): string | null {
  let description = null
  const descriptionInput = form.querySelector('.js-new-label-description-input')
  if (descriptionInput instanceof HTMLInputElement && descriptionInput.value.trim().length > 0) {
    description = descriptionInput.value.trim()
  }
  return description
}

function labelColorFrom(form: HTMLFormElement): string {
  const colorInput = form.querySelector<HTMLInputElement>('.js-new-label-color-input')!
  if (colorInput.checkValidity()) {
    return colorInput.value.trim().replace(/^#/, '')
  }
  return 'ededed'
}

function labelNameFrom(form: HTMLFormElement, previewArea: HTMLElement): string {
  const nameInput = form.querySelector<HTMLInputElement>('.js-new-label-name-input')!
  let name = nameInput.value.trim()
  if (name.length < 1) {
    name = previewArea.getAttribute('data-default-name')!
  }
  return name
}

async function updateLabelPreview(startEl: HTMLElement) {
  const previewContainer = startEl.closest('.js-label-preview-container')
  if (!previewContainer) {
    return
  }

  const form = startEl.closest<HTMLFormElement>('.js-label-form')!
  const fullErrorMessageEl = form.querySelector<HTMLElement>('.js-new-label-error')
  const labelID = form.getAttribute('data-label-id')
  const previewArea = previewContainer.querySelector<HTMLElement>('.js-label-preview')!
  const name = labelNameFrom(form, previewArea)

  // Default case of "Label preview" is also counted as 'invalid' but we still want to update the preview.
  if (!form.checkValidity() && name !== 'Label preview') {
    return
  }

  const color = labelColorFrom(form)
  const description = labelDescriptionFrom(form)

  const urlTemplate = previewArea.getAttribute('data-url-template')!
  const url = labelPreviewUrl(urlTemplate, name, color, description, labelID)

  if (previewContainer.hasAttribute('data-last-preview-url')) {
    const lastPreviewUrl = previewContainer.getAttribute('data-last-preview-url')!
    if (url === lastPreviewUrl) {
      return
    }
  }

  let fragment
  try {
    fragment = await fetchSafeDocumentFragment(document, url)
  } catch (error) {
    const json = await error.response.json()
    showLabelErrors(form, json)

    if (fullErrorMessageEl) {
      fullErrorMessageEl.textContent = json.message
      fullErrorMessageEl.hidden = false
    }

    return
  }

  if (fullErrorMessageEl) {
    fullErrorMessageEl.textContent = ''
    fullErrorMessageEl.hidden = true
  }

  hideLabelErrors(form)

  previewArea.innerHTML = ''
  previewArea.appendChild(fragment)
  previewContainer.setAttribute('data-last-preview-url', url)
}

function onLabelFormInputChange(event: Event) {
  updateLabelPreview(event.target as HTMLInputElement)
}

function toggleBlankSlate(el: Element, show: boolean) {
  const detailsContainer = el.closest<HTMLElement>('.js-details-container')!
  detailsContainer.classList.toggle('is-empty', show)
}

function updateCount(delta: number) {
  const counter = document.querySelector<HTMLElement>('.js-labels-count')!
  const oldCount = Number(counter.textContent!)
  const newCount = oldCount + delta
  counter.textContent = newCount.toString()

  const label = document.querySelector<HTMLElement>('.js-labels-label')!
  label.textContent = label.getAttribute(newCount === 1 ? 'data-singular-string' : 'data-plural-string')
  return newCount
}

// Update the preview text of the new label based on what the user types in the
// label filter input.
onInput('.js-label-filter-field', function (event) {
  const filterInput = event.target as HTMLInputElement
  const container = filterInput.closest<HTMLElement>('details-menu')!
  const labelNameEl = container.querySelector('.js-new-label-name')
  if (!labelNameEl) {
    return
  }
  const labelName = filterInput.value.trim()
  labelNameEl.textContent = labelName
})

// As the user filters existing labels, make sure the 'Add new label' and 'Edit labels'
// links are visible as appropriate.
on('filterable:change', '.js-filterable-issue-labels', function (event) {
  const menu = event.currentTarget.closest<HTMLElement>('details-menu')!
  const addLabelButton = menu.querySelector<HTMLElement>('.js-add-label-button')
  if (!addLabelButton) return

  const filterInput = event.detail.inputField
  const newLabelName = filterInput.value.trim().toLowerCase()

  // TODO This could use namedItems.
  let matchingExistingLabel = false
  for (const input of menu.querySelectorAll('input[data-label-name]')) {
    const labelName = input.getAttribute('data-label-name') || ''
    if (labelName.toLowerCase() === newLabelName) {
      matchingExistingLabel = true
      break
    }
  }

  addLabelButton.hidden = newLabelName.length === 0 || matchingExistingLabel
})

// Show the color swatches when the user focuses the color input field.
onFocus('.js-new-label-color-input', function (input) {
  const container = input.closest<HTMLElement>('form')!
  const swatchesContainer = container.querySelector<HTMLElement>('.js-new-label-swatches')!
  swatchesContainer.hidden = false

  input.addEventListener(
    'blur',
    function () {
      swatchesContainer.hidden = true
    },
    {once: true}
  )
})

// Update the color swatch as the user types new hex color codes manually into
// the input.
onInput('.js-new-label-color-input', function (event) {
  const input = event.target as HTMLInputElement
  let color = input.value.trim()
  if (color.length < 1) {
    return
  }

  if (color.indexOf('#') !== 0) {
    color = `#${color}`
    input.value = color
  }

  if (input.checkValidity()) {
    input.classList.remove('color-text-danger')
    const container = input.closest<HTMLElement>('form')!
    const colorButton = container.querySelector<HTMLButtonElement>('.js-new-label-color')!
    setColorSwatch(colorButton, convert.hex.rgb(color))
  } else {
    input.classList.add('color-text-danger')
  }
})

// Disable save button as the user types if they enter an invalid hex color code.
onKey('keyup', '.js-new-label-color-input', function (event) {
  const input = event.target as HTMLInputElement
  let color = input.value.trim()

  if (color.indexOf('#') !== 0) {
    color = `#${color}`
    input.value = color
  }

  if (input.checkValidity()) {
    const container = input.closest<HTMLElement>('form')!
    const colorButton = container.querySelector<HTMLButtonElement>('.js-new-label-color')!
    setColorSwatch(colorButton, convert.hex.rgb(color))
  }
  fire(input, 'change', false)

  const form = input.closest<HTMLFormElement>('form')!
  hideLabelErrors(form)
})

onKey('keyup', '.js-new-label-description-input', function (event) {
  const input = event.target as HTMLInputElement
  const form = input.form!
  hideLabelErrors(form)
})

onKey('keyup', '.js-new-label-color-input', function (event) {
  const input = event.target as HTMLInputElement
  const form = input.form!
  hideLabelErrors(form)
})

// Get a random color for the new label when the user hits the button that acts as
// a preview of the selected color.
on('click', '.js-new-label-color', async function (event) {
  const colorButton = event.currentTarget as HTMLButtonElement
  const rgb = randomRGBColor()
  setInputColorFromButton(colorButton, rgb)
  updateLabelPreview(colorButton)
})

// Choose one of the predefined colors when it's clicked.
on('mousedown', '.js-new-label-color-swatch', function (event) {
  const swatchButton = event.currentTarget as HTMLButtonElement
  const color = swatchButton.getAttribute('data-color')!
  setInputColorFromButton(swatchButton, convert.hex.rgb(color))
  updateLabelPreview(swatchButton)

  const swatchesContainer = swatchButton.closest<HTMLElement>('.js-new-label-swatches')!
  swatchesContainer.hidden = true
})

on(
  'toggle',
  '.js-new-label-modal',
  function (event) {
    if ((event.target as Element).hasAttribute('open')) {
      initLabelModal(event.target as Element)
    }
  },
  {capture: true}
)

// When the new label form is displayed in the modal, set the label and its color
// in the form fields. Also update the color of the color swatch.
async function initLabelModal(modal: Element) {
  const labelNameInput = modal.querySelector<HTMLInputElement>('.js-new-label-name-input')
  if (!labelNameInput) return

  const colorInput = modal.querySelector<HTMLInputElement>('.js-new-label-color-input')!
  const rgb = randomRGBColor()
  const hex = `#${convert.rgb.hex(rgb)}`
  colorInput.value = hex
  const colorButton = modal.querySelector<HTMLButtonElement>('.js-new-label-color')!
  setColorSwatch(colorButton, rgb)

  const labelNameEl = document.querySelector<HTMLElement>('.js-new-label-name')!
  const labelName = labelNameEl.textContent!
  changeValue(labelNameInput, labelName)
  updateInputRemainingCharacters(labelNameInput)

  updateLabelPreview(colorButton)
}

// When the user creates a new label, close the modal containing the 'new label'
// form. Also update the list of available labels to choose from, so the user
// can immediately apply their new label.
remoteForm('.js-new-label-modal-form', async function (form, wants) {
  const errorEl = form.querySelector<HTMLElement>('.js-new-label-error')!

  let response
  try {
    response = await wants.html()
  } catch (error) {
    const json = error.response.json
    errorEl.textContent = json.message
    errorEl.hidden = false
  }

  if (!response) {
    return
  }

  errorEl.hidden = true // Hide error message for the form

  // close modal containing the label form
  document.querySelector<HTMLElement>('.js-new-label-modal')!.removeAttribute('open')

  const list = document.querySelector<HTMLElement>('.js-filterable-issue-labels')!
  const input = response.html.querySelector('input')
  list.prepend(response.html)
  // A selected menu item is inserted programmatically so we need to trigger a
  // change event, which when trigger a details-menu-selected event.
  if (input) input.dispatchEvent(new Event('change', {bubbles: true}))

  const field = document.querySelector<HTMLInputElement>('.js-label-filter-field')!
  field.value = field.defaultValue
  field.focus()
})

// New and Edit remote form
// Click "Cancel" leaves "edit mode"
on('click', '.js-edit-label-cancel', function (event) {
  const form = (event.target as Element).closest<HTMLFormElement>('form')!
  hideLabelErrors(form)
  form.reset()

  // Grab the color we just resetted to and set the background color of the
  // refresh button to that color since resetting the form doesn't do that for us
  const colorInput = form.querySelector<HTMLInputElement>('.js-new-label-color-input')!
  const color = colorInput.value
  const refreshButton = form.querySelector<HTMLButtonElement>('.js-new-label-color')!
  setColorSwatch(refreshButton, convert.hex.rgb(color))

  resetCharactersRemainingCounts(form)
  updateLabelPreview(colorInput)

  // If editing an existing label, hide the form on Cancel:
  const item = event.currentTarget.closest('.js-labels-list-item')
  if (item) {
    const editForm = item.querySelector<HTMLElement>('.js-update-label')!
    /* eslint-disable-next-line github/no-d-none */
    editForm.classList.add('d-none')

    const labelPreview = item.querySelector('.js-label-preview')
    if (labelPreview) {
      /* eslint-disable-next-line github/no-d-none */
      labelPreview.classList.add('d-none')

      const labelLink = item.querySelector<HTMLElement>('.js-label-link')!
      /* eslint-disable-next-line github/no-d-none */
      labelLink.classList.remove('d-none')
    }

    const elementsToShow = item.querySelectorAll<HTMLElement>('.js-hide-on-label-edit')
    for (const el of elementsToShow) {
      el.hidden = !el.hidden
    }
  }
})

// Replace item row with contents from server on Edit
remoteForm('.js-update-label', async function (form, wants) {
  let response

  try {
    response = await wants.html()
  } catch (error) {
    const json = error.response.json
    showLabelErrors(form, json)
    return
  }

  hideLabelErrors(form)

  const item = form.closest<HTMLElement>('.js-labels-list-item')!
  item.replaceWith(response.html)
})

// Add new label to list and clear out the form
remoteForm('.js-create-label', async function (form, wants) {
  let response

  try {
    response = await wants.html()
  } catch (error) {
    const json = error.response.json
    showLabelErrors(form, json)
    return
  }

  form.reset()
  hideLabelErrors(form)

  document.querySelector<HTMLElement>('.js-label-list')!.prepend(response.html)

  updateCount(+1)

  toggleBlankSlate(form, false)

  const colorButton = form.querySelector<HTMLButtonElement>('.js-new-label-color')!
  const rgb = randomRGBColor()
  setInputColorFromButton(colorButton, rgb)
  updateLabelPreview(form.querySelector<HTMLInputElement>('.js-new-label-name-input')!)

  resetCharactersRemainingCounts(form)

  const detailsContainer = form.closest('.js-details-container')
  if (detailsContainer instanceof HTMLElement) {
    toggleDetailsTarget(detailsContainer)
  }
})

// Click 'New label' button
on('click', '.js-details-target-new-label', function () {
  const createForm = document.querySelector<HTMLElement>('.js-create-label')!
  const nameInput = createForm.querySelector<HTMLInputElement>('.js-new-label-name-input')!
  nameInput.focus()
})

// Click "Edit" enters "edit mode"
on('click', '.js-edit-label', function (event) {
  const item = event.currentTarget.closest<HTMLElement>('.js-labels-list-item')!
  const editForm = item.querySelector<HTMLElement>('.js-update-label')!
  /* eslint-disable-next-line github/no-d-none */
  editForm.classList.remove('d-none')
  const nameInput = editForm.querySelector<HTMLInputElement>('.js-new-label-name-input')!
  nameInput.focus()

  const labelPreview = item.querySelector('.js-label-preview')
  if (labelPreview) {
    /* eslint-disable-next-line github/no-d-none */
    labelPreview.classList.remove('d-none')

    const labelLink = item.querySelector<HTMLElement>('.js-label-link')!
    /* eslint-disable-next-line github/no-d-none */
    labelLink.classList.add('d-none')
  }

  const elementsToHide = item.querySelectorAll<HTMLElement>('.js-hide-on-label-edit')
  for (const el of elementsToHide) {
    el.hidden = !el.hidden
  }
})

// Delete remote form
remoteForm('.js-delete-label', async function (form, wants) {
  const row = form.closest<HTMLElement>('.js-labels-list-item')!
  row.querySelector<HTMLElement>('.js-label-delete-spinner')!.hidden = false
  await wants.text()
  const newCount = updateCount(-1)
  toggleBlankSlate(form, newCount === 0)
  row.remove()
})

const delayedOnLabelFormInputChange = debounce(onLabelFormInputChange, 500)

// Handle the user typing in label fields:
on('suggester:complete', '.js-new-label-name-input', delayedOnLabelFormInputChange)
onInput('.js-new-label-name-input', delayedOnLabelFormInputChange)
onInput('.js-new-label-description-input', delayedOnLabelFormInputChange)
onInput('.js-new-label-color-input', delayedOnLabelFormInputChange)

// Limit length of label names in the way Rails does with model validations; allows emoji:
onKey('keypress', '.js-new-label-name-input', function (event) {
  const input = event.target as HTMLInputElement
  const limit = parseInt(input.getAttribute('data-maxlength')!)

  if (getUtf8StringLength(input.value) >= limit) {
    event.preventDefault()
  }
})

// Exclude labels on the issues page label filter
on('click', '.js-issues-label-select-menu-item', function (event) {
  if (!event.altKey && !event.shiftKey) return

  event.preventDefault()
  event.stopPropagation()

  if (event.altKey) {
    window.location.href = event.currentTarget.getAttribute('data-excluded-url')!
  }

  // Users can shift click to add more labels to a group
  if (event.shiftKey) {
    window.location.href = event.currentTarget.getAttribute('data-included-url')!
  }
})

onKey('keydown', '.js-issues-label-select-menu-item', function (event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  if (!event.altKey && !event.shiftKey) return

  const anchor = event.currentTarget
  event.preventDefault()
  event.stopPropagation()
  if (anchor instanceof HTMLAnchorElement) {
    if (event.altKey) {
      window.location.href = anchor.getAttribute('data-excluded-url')!
    }

    if (event.shiftKey) {
      window.location.href = anchor.getAttribute('data-included-url')!
    }
  }
})

on(
  'click',
  '.js-open-label-creation-modal',
  async function (event) {
    // Prevent menu from closing
    event.stopImmediatePropagation()
    const modal = await dialog({
      content: document.querySelector<HTMLTemplateElement>('.js-label-creation-template')!.content.cloneNode(true),
      detailsClass: 'js-new-label-modal'
    })
    initLabelModal(modal)
  },
  {capture: true}
)
