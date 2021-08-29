// ### Example Markup
//
//   <div class="js-task-list-container">
//     <task-lists disabled sortable>
//       <div class="js-comment-body">
//         <ul class="contains-task-list">
//           <li class="task-list-item">
//             <input type="checkbox" class="task-list-item-checkbox" disabled>
//             text
//           </li>
//         </ul>
//       </div>
//     </task-lists>
//     <form class="js-comment-update">
//       <textarea class="js-task-list-field">- [ ] text</textarea>
//     </form>
//   </div>
//
// ### Specification
//
// TaskLists MUST be contained in a `(div).js-task-list-container`.
//
// TaskList Items SHOULD be an a list (`UL`/`OL`) element.
//
// Task list items MUST match `(input).task-list-item-checkbox` and MUST be
// `disabled` by default.
//
// TaskLists MUST have a `(textarea).js-task-list-field` form element whose
// `value` attribute is the source (Markdown) to be updated. The source MUST
// follow the syntax guidelines.
//
// ### NOTE
//
// Task list checkboxes are rendered as disabled by default because rendered
// user content is cached without regard for the viewer.

import {compose, fromEvent} from '../subscription'
import {fire, on} from 'delegated-events'

import TaskListsElement from '@github/task-lists-element'
import {observe} from 'selector-observer'
import {remoteForm} from '@github/remote-form'
import {requestSubmit} from '../form'

type Position = [number, number]

interface CheckPayload {
  operation: 'check'
  position: Position
  checked: boolean
}

interface MovePayload {
  operation: 'move'
  src: Position
  dst: Position
}

// Enable task lists with persistence fields. Otherwise, the viewer lacks
// permission to update the comment so task lists remain disabled.
observe('.js-task-list-container .js-task-list-field', function (el) {
  const container = el.closest<HTMLElement>('.js-task-list-container')!
  enableTaskList(container)
  updateProgress(container)
})

on('task-lists-move', 'task-lists', function (event) {
  const {src, dst} = event.detail
  const container = event.currentTarget.closest<HTMLElement>('.js-task-list-container')!
  saveTaskList(container, 'reordered', {operation: 'move', src, dst})
})

on('task-lists-check', 'task-lists', function (event) {
  const {position, checked} = event.detail
  const container = event.currentTarget.closest<HTMLElement>('.js-task-list-container')!
  saveTaskList(container, `checked:${checked ? 1 : 0}`, {operation: 'check', position, checked})
})

export function enableTaskList(container: Element) {
  if (container.querySelector('.js-task-list-field')) {
    const taskLists = container.querySelectorAll('task-lists')
    for (const el of taskLists) {
      if (el instanceof TaskListsElement) {
        el.disabled = false
        const buttons = el.querySelectorAll('button')
        for (const button of buttons) {
          button.disabled = false
        }
      }
    }
  }
}

export function disableTaskList(container: Element) {
  for (const el of container.querySelectorAll('task-lists')) {
    if (el instanceof TaskListsElement) {
      el.disabled = true

      const buttons = el.querySelectorAll('button')
      for (const button of buttons) {
        button.disabled = true
      }
    }
  }
}

// Persist task list source changes.
//
// Adds a hidden tracking input to the form to trigger server-side
// instrumentation.
function saveTaskList(container: Element, track: string, payload: CheckPayload | MovePayload) {
  const form = container.querySelector<HTMLFormElement>('.js-comment-update')!

  disableTaskList(container)
  updateProgress(container)

  const previousTracking = form.elements.namedItem('task_list_track')
  if (previousTracking instanceof Element) previousTracking.remove()

  const previousOperation = form.elements.namedItem('task_list_operation')
  if (previousOperation instanceof Element) previousOperation.remove()

  const tracking = document.createElement('input')
  tracking.setAttribute('type', 'hidden')
  tracking.setAttribute('name', 'task_list_track')
  tracking.setAttribute('value', track)
  form.appendChild(tracking)

  const operation = document.createElement('input')
  operation.setAttribute('type', 'hidden')
  operation.setAttribute('name', 'task_list_operation')
  operation.setAttribute('value', JSON.stringify(payload))
  form.appendChild(operation)

  if (!form.elements.namedItem('task_list_key')) {
    const field = form.querySelector('.js-task-list-field')!
    const name = field.getAttribute('name')!
    const value = name.split('[')[0]
    const input = document.createElement('input')
    input.setAttribute('type', 'hidden')
    input.setAttribute('name', 'task_list_key')
    input.setAttribute('value', value)
    form.appendChild(input)
  }

  // If the user has ran into a stale error and is now re-submitting, hide it
  container.classList.remove('is-comment-stale')

  requestSubmit(form)
}

remoteForm('.js-task-list-container .js-comment-update', async function (form, wants) {
  const container = form.closest('.js-task-list-container')!
  const tracking = form.elements.namedItem('task_list_track')
  if (tracking instanceof Element) tracking.remove()

  const operation = form.elements.namedItem('task_list_operation')
  if (operation instanceof Element) operation.remove()

  let response
  try {
    response = await wants.json()
  } catch (error) {
    let data
    try {
      data = JSON.parse(error.response.text)
    } catch (e) {
      // Do nothing
    }

    if (data && data.stale) {
      const commentField = container.querySelector<HTMLTextAreaElement>('.js-task-list-field')!

      // Prevent the stale value of this field from being persisted (and, eventually, erroneously
      // restored) if the page is refreshed. We will undo this (and restore the session-resumable
      // behaviour) if the user clicks the 'Cancel' button to discard the stale edits in this field.
      commentField.classList.add('session-resumable-canceled')
      commentField.classList.remove('js-session-resumable')
    } else {
      window.location.reload()
    }
  }

  if (response) {
    if (operation) {
      // Store reordered Markdown source in textarea.
      if (response.json.source) {
        container.querySelector<HTMLTextAreaElement>('.js-task-list-field')!.value = response.json.source
      }
    }
    enableTaskList(container)
    requestAnimationFrame(() => updateProgress(container))
  }
})

// This flag specifies whether `beforeinput` handler is called before `input` event
// This logic is needed because Chrome (Version 86.0.4240.198) has a bug with event.inputType == 'insertText' && event.data == null in textarea
// But Firefox does not support `beforeinput` yet (as of 9th December 2020)
let handleAutocomplete = false

// This flag is used to track if a text composition system (as the helper for JP kanji symbols)
// has popped up on the screen or not.
// This is needed because the custom tabbing behavior implemented here interferes with the system element
let isIMEVisible = false

// This handler will set the handleAutocomplete flag so that all browsers except Firefox can handle the event correctly in autoCompleteOnInput
function tryAutoCompleteOnBeforeInput(ev: Event) {
  const event = ev as InputEvent

  const isNewLine = event.inputType === 'insertLineBreak'
  if (!isNewLine) {
    handleAutocomplete = false
  } else {
    handleAutocomplete = true
  }
}

// This handler will try autocomplete the text in textarea in all browsers
function autoCompleteOnInput(ev: Event) {
  const event = ev as InputEvent

  // in Firefox this check will always pass
  if (!handleAutocomplete) {
    // this block will be called only in Firefox
    // when `beforeinput` support is added to Firefox, this whole check can be removed
    const isNewLine = event.inputType === 'insertLineBreak'
    if (!isNewLine) return
  }

  const element = event.target as HTMLInputElement
  listAutocomplete(element)
  handleAutocomplete = false
}

function listAutocomplete(element: HTMLInputElement) {
  const result = autocompletedList(element.value, [element.selectionStart, element.selectionEnd])
  if (result === undefined) return

  element.value = result.text
  element.selectionStart = result.selection[0]
  element.selectionEnd = result.selection[1]
}

function handleShiftEnter(ev: Event) {
  if (isIMEVisible) {
    return
  }

  const event = ev as KeyboardEvent

  if (event.key === 'Enter' && event.shiftKey && !event.metaKey) {
    const element = event.target as HTMLInputElement

    const result = addSoftNewline(element.value, [element.selectionStart, element.selectionEnd])
    if (result === undefined) return

    element.value = result.text
    element.selectionStart = result.selection[0]
    element.selectionEnd = result.selection[1]

    event.preventDefault()
    // Trigger size-to-fit (see github/github#15696)
    fire(element, 'change')
  }
}

function onCompositionStart() {
  isIMEVisible = true
}

function onCompositionEnd() {
  isIMEVisible = false
}

function updateIndentation(ev: Event) {
  if (isIMEVisible) {
    return
  }

  const event = ev as KeyboardEvent
  if (event.key === 'Escape') {
    deselectText(ev)
    return
  }

  if (event.key !== 'Tab') return

  const element = event.target as HTMLInputElement

  const result = indent(element.value, [element.selectionStart, element.selectionEnd], event.shiftKey)
  if (result === undefined) return

  event.preventDefault()

  element.value = result.text
  element.selectionStart = result.selection[0]
  element.selectionEnd = result.selection[1]
}

observe('.js-task-list-field', {
  subscribe: el =>
    compose(
      fromEvent(el, 'keydown', updateIndentation),
      fromEvent(el, 'keydown', handleShiftEnter),
      fromEvent(el, 'beforeinput', tryAutoCompleteOnBeforeInput),
      fromEvent(el, 'input', autoCompleteOnInput),
      fromEvent(el, 'compositionstart', onCompositionStart),
      fromEvent(el, 'compositionend', onCompositionEnd)
    )
})

type UpdatedText = {
  text: string
  selection: SelectionRange
}

type SelectionRange = [number | null, number | null]

const INDENTATION_RE = /^(\s*)?/
export function addSoftNewline(text: string, selection: SelectionRange): UpdatedText | undefined {
  const offset = selection[0]
  if (!offset || !text) return undefined

  const lines = text.substring(0, offset).split('\n')
  const currentLine = lines[lines.length - 1]
  const match = currentLine?.match(INDENTATION_RE)
  if (!match) return undefined

  const indentation = match[1] || ''
  const autocompletePrefix = `\n${indentation}`
  return {
    text: text.substring(0, offset) + autocompletePrefix + text.substring(offset),
    selection: [offset + autocompletePrefix.length, offset + autocompletePrefix.length]
  }
}

// matches '- ', '* ', '12. ', '- [ ]', '- [x]', `* [ ] `, `* [x] `, '12. [ ] ', '12. [x] '
const TASK_LIST_RE = /^(\s*)([*-]|(\d+)\.)\s(\[[\sx]\]\s)?/

export function autocompletedList(text: string, selection: SelectionRange): UpdatedText | undefined {
  const offset = selection[0]
  if (!offset || !text) return undefined

  const lines = text.substring(0, offset).split('\n')
  const previousLine = lines[lines.length - 2]

  // Check for task list existence
  const match = previousLine?.match(TASK_LIST_RE)
  if (!match) return undefined

  const listPrefix = match[0]
  const indentation = match[1]
  const bullet = match[2]
  const numericBullet = parseInt(match[3], 10)
  const hasCheckbox = Boolean(match[4])
  const newBullet = isNaN(numericBullet) ? bullet : `${numericBullet + 1}.`
  let newPrefix = `${newBullet} ${hasCheckbox ? '[ ] ' : ''}`

  let currentLineEnd = text.indexOf('\n', offset)
  if (currentLineEnd < 0) {
    currentLineEnd = text.length
  }
  const currentLine = text.substring(offset, currentLineEnd)
  // do not append list item if already present
  if (currentLine.startsWith(newPrefix)) {
    newPrefix = ''
  }
  /*
    Autocomplete list element on next line if current line has list element containing text.
    or there's text on the line after the cursor (|):
    ```
    - | some text
    ```
    becomes:
    ```
    -
    - | some text
    ```
   */
  const shouldAutocomplete = previousLine.replace(listPrefix, '').trim().length > 0 || currentLine.trim().length > 0
  if (shouldAutocomplete) {
    const autocompletePrefix = `${indentation}${newPrefix}`
    return {
      text: text.substring(0, offset) + autocompletePrefix + text.substring(offset),
      selection: [offset + autocompletePrefix.length, offset + autocompletePrefix.length]
    }
  } else {
    // This case clears the autocompleted list element if user hits an enter without adding any text to it.
    const offsetWithoutPrefix = offset - `\n${listPrefix}`.length
    return {
      text: text.substring(0, offsetWithoutPrefix) + text.substring(offset),
      selection: [offsetWithoutPrefix, offsetWithoutPrefix]
    }
  }
}

export function indent(text: string, selection: SelectionRange, substract: boolean): UpdatedText | undefined {
  // Perform indentation manipulations only when more than one character was selected.
  const selectionStart = selection[0] || 0
  const selectionEnd = selection[1] || selectionStart
  if (selection[0] === null || selectionStart === selectionEnd) return undefined

  const startOffset = text.substring(0, selectionStart).lastIndexOf('\n') + 1
  const endOffsetPreNormalization = text.indexOf('\n', selectionEnd - 1)
  const endOffset = endOffsetPreNormalization > 0 ? endOffsetPreNormalization : text.length - 1
  const selectedLines = text.substring(startOffset, endOffset).split('\n')

  let startUpdated = false
  let selectionStartDiff = 0
  let selectionEndDiff = 0
  const updatedSelectedLines: string[] = []
  for (const line of selectedLines) {
    const match = line.match(/^\s*/)
    if (match) {
      let indentation = match[0]
      const lineText = line.substring(indentation.length)
      if (substract) {
        const prevLength = indentation.length
        indentation = indentation.slice(0, -2)

        // Update selectionStart for first line only.
        selectionStartDiff = startUpdated ? selectionStartDiff : indentation.length - prevLength
        startUpdated = true
        selectionEndDiff += indentation.length - prevLength
      } else {
        indentation += '  '
        selectionStartDiff = 2
        selectionEndDiff += 2
      }
      updatedSelectedLines.push(indentation + lineText)
    }
  }

  const linesString = updatedSelectedLines.join('\n')
  const newText = text.substring(0, startOffset) + linesString + text.substring(endOffset)
  const newRange: SelectionRange = [
    Math.max(startOffset, selectionStart + selectionStartDiff),
    selectionEnd + selectionEndDiff
  ]
  return {text: newText, selection: newRange}
}

function deselectText(ev: Event) {
  const event = ev as KeyboardEvent
  const element = event.target as HTMLInputElement
  if (element.selectionDirection === 'backward') {
    element.selectionEnd = element.selectionStart
  } else {
    element.selectionStart = element.selectionEnd
  }
}

function updateProgress(container: Element) {
  if (document.querySelectorAll('tracked-issues-progress').length === 0) return

  const isInTimeline = container.closest<HTMLElement>('.js-timeline-item')
  if (isInTimeline) return

  const checkboxes = container.querySelectorAll<HTMLInputElement>('.js-comment-body [type=checkbox]')
  const total = checkboxes.length
  const completed = Array.from(checkboxes).filter(checkbox => checkbox.checked).length
  const progressComponents = document.querySelectorAll('tracked-issues-progress[data-type=checklist]')
  for (const progress of progressComponents) {
    progress.setAttribute('data-completed', String(completed))
    progress.setAttribute('data-total', String(total))
  }
}
