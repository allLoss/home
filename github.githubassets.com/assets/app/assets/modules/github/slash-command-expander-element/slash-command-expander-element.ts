/*
This was pulled in from github/text-expander-element to make iterating and testing easier.
See https://github.com/github/ui-platform/issues/88
*/
import Combobox from '@github/combobox-nav'
import keyword from './keyword'
import textFieldSelectionPosition from './text-field-selection-position'

type Match = {
  text: string
  key: string
  position: number
  beginningOfLine: boolean
}

type Result = {
  fragment: HTMLElement
  matched: boolean
}

const states = new WeakMap()

class SlashCommandExpander {
  expander: SlashCommandExpanderElement
  input: HTMLInputElement | HTMLTextAreaElement
  menu: HTMLElement | null
  oninput: (event: Event) => void
  onkeydown: (event: KeyboardEvent) => void
  onpaste: (event: Event) => void
  oncommit: (event: Event) => void
  onblur: (event: Event) => void
  onmousedown: (event: Event) => void
  combobox: Combobox | null
  match: Match | null
  justPasted: boolean
  interactingWithMenu: boolean

  constructor(expander: SlashCommandExpanderElement, input: HTMLInputElement | HTMLTextAreaElement) {
    this.expander = expander
    this.input = input
    this.combobox = null
    this.menu = null
    this.match = null
    this.justPasted = false
    this.oninput = this.onInput.bind(this)
    this.onpaste = this.onPaste.bind(this)
    this.onkeydown = this.onKeydown.bind(this)
    this.oncommit = this.onCommit.bind(this)
    this.onmousedown = this.onMousedown.bind(this)
    this.onblur = this.onBlur.bind(this)
    this.interactingWithMenu = false
    input.addEventListener('paste', this.onpaste)
    input.addEventListener('input', this.oninput)
    ;(input as HTMLElement).addEventListener('keydown', this.onkeydown)
    input.addEventListener('blur', this.onblur)
  }

  destroy() {
    this.input.removeEventListener('paste', this.onpaste)
    this.input.removeEventListener('input', this.oninput)
    ;(this.input as HTMLElement).removeEventListener('keydown', this.onkeydown)
    this.input.removeEventListener('blur', this.onblur)
  }

  activate(match: Match, menu: HTMLElement) {
    if (this.input !== document.activeElement) return
    this.setMenu(match, menu)
  }

  deactivate(): boolean {
    const menu = this.menu
    const combobox = this.combobox
    if (!menu || !combobox) return false
    this.menu = null
    this.combobox = null

    menu.removeEventListener('combobox-commit', this.oncommit)
    menu.removeEventListener('mousedown', this.onmousedown)
    combobox.destroy()
    menu.remove()

    return true
  }

  setMenu(match: Match, menu: HTMLElement) {
    this.deactivate()
    this.menu = menu

    if (!menu.id) menu.id = `text-expander-${Math.floor(Math.random() * 100000).toString()}`
    this.expander.append(menu)

    const menuItems = menu.querySelector<HTMLElement>('.js-slash-command-menu-items')

    if (menuItems) {
      this.combobox = new Combobox(this.input, menuItems)
    } else {
      this.combobox = new Combobox(this.input, menu)
    }

    const {top, left} = textFieldSelectionPosition(this.input, match.position)
    const topMargin = parseInt(window.getComputedStyle(this.input).fontSize)

    menu.style.top = `${top + topMargin}px`
    menu.style.left = `${left}px`

    this.combobox.start()
    menu.addEventListener('combobox-commit', this.oncommit)
    menu.addEventListener('mousedown', this.onmousedown)

    // Focus first menu item.
    this.combobox.navigate(1)
  }

  setValue(value: string | null) {
    if (value === null || value === undefined) return

    const match = this.match
    if (!match) return

    const beginning = this.input.value.substring(0, match.position - match.key.length)
    const remaining = this.input.value.substring(match.position + match.text.length)

    let {cursor, value: insertValue} = this.replaceCursorMark(value)
    insertValue = insertValue?.length === 0 ? insertValue : `${insertValue} `

    this.input.value = beginning + insertValue + remaining

    this.deactivate()
    this.input.focus()

    cursor = beginning.length + (cursor || insertValue.length)
    this.input.selectionStart = cursor
    this.input.selectionEnd = cursor
  }

  // Take a value and replace occurrences of %cursor%.
  //
  // Returns object with two keys:
  // - cursor: holds index of cursor mark location
  // - value: Given value with the cursor marks removed.
  replaceCursorMark(value: string) {
    const cursorPattern = /%cursor%/gm

    const cursorFlagMatch = cursorPattern.exec(value)
    if (cursorFlagMatch) {
      return {
        cursor: cursorFlagMatch.index,
        value: value.replace(cursorPattern, '')
      }
    } else {
      return {
        cursor: null,
        value
      }
    }
  }

  onCommit({target}: Event) {
    const item = target
    if (!(item instanceof HTMLElement)) return
    if (!this.combobox) return

    const match = this.match
    if (!match) return

    const detail = {item, key: match.key, value: null}
    const canceled = !this.expander.dispatchEvent(new CustomEvent('text-expander-value', {cancelable: true, detail}))

    if (canceled) return
    if (detail.value) this.setValue(detail.value)
  }

  onBlur() {
    if (this.interactingWithMenu) {
      this.interactingWithMenu = false
      return
    }

    this.deactivate()
  }

  onPaste() {
    this.justPasted = true
  }

  async delay(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  async onInput() {
    if (this.justPasted) {
      this.justPasted = false
      return
    }

    const match = this.findMatch()
    if (match) {
      this.match = match
      await this.delay(this.appropriateDelay(this.match))

      // Text was changed while waiting for delay
      if (this.match !== match) return
      const menu = await this.notifyProviders(match)

      // Text was cleared while waiting on async providers.
      if (!this.match) return

      if (menu) {
        this.activate(match, menu)
      } else {
        this.deactivate()
      }
    } else {
      this.match = null
      this.deactivate()
    }
  }

  // How long should we wait before displaying the slash command menu?
  appropriateDelay(match: Match): number {
    if (match.beginningOfLine) {
      return 0
    } else if (match.text !== '') {
      return 0
    } else {
      // When something is typing at 50 WPM, they won't see the prompt.
      // 50 WPM = 250 CPM = 4 characters per second
      // 1000ms / 4 = 250ms per character
      return 250
    }
  }

  findMatch(): Match | void {
    const cursor = this.input.selectionEnd
    const text = this.input.value
    for (const key of this.expander.keys) {
      const found = keyword(text, key, cursor!)
      if (found) {
        return {text: found.word, key, position: found.position, beginningOfLine: found.beginningOfLine}
      }
    }
  }

  async notifyProviders(match: Match): Promise<HTMLElement | void> {
    const providers: Array<Promise<Result> | Result> = []
    const provide = (result: Promise<Result> | Result) => providers.push(result)
    const canceled = !this.expander.dispatchEvent(
      new CustomEvent('text-expander-change', {cancelable: true, detail: {provide, text: match.text, key: match.key}})
    )
    if (canceled) return

    const all = await Promise.all(providers)
    const fragments = all.filter(x => x.matched).map(x => x.fragment)
    return fragments[0]
  }

  onMousedown() {
    this.interactingWithMenu = true
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (this.deactivate()) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  }
}

export default class SlashCommandExpanderElement extends HTMLElement {
  get keys(): string[] {
    const keys = this.getAttribute('keys')
    return keys ? keys.split(' ') : []
  }

  connectedCallback() {
    const input = this.querySelector('input[type="text"], textarea')
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return
    const state = new SlashCommandExpander(this, input)
    states.set(this, state)
  }

  disconnectedCallback() {
    const state = states.get(this)
    if (!state) return
    state.destroy()
    states.delete(this)
  }

  setValue(value: string) {
    const state = states.get(this)
    if (!state) return
    state.setValue(value)
  }

  setMenu(menu: HTMLElement, interactionExpected = false) {
    const state = states.get(this)
    if (!state) return
    if (!state.match) return
    if (interactionExpected) {
      state.interactingWithMenu = true
    }
    state.setMenu(state.match, menu)
  }

  closeMenu() {
    const state = states.get(this)
    if (!state) return
    state.setValue('')
  }

  isLoading() {
    const loadingMenu = this.getElementsByClassName('js-slash-command-expander-loading')[0] as HTMLElement

    if (loadingMenu) {
      const loadingMenuClone = loadingMenu.cloneNode(true) as HTMLElement
      // eslint-disable-next-line github/no-d-none
      loadingMenuClone.classList.remove('d-none')
      this.setMenu(loadingMenuClone)
    }
  }

  showError() {
    const errorMenu = this.getElementsByClassName('js-slash-command-expander-error')[0] as HTMLElement

    if (errorMenu) {
      const errorMenuClone = errorMenu.cloneNode(true) as HTMLElement
      // eslint-disable-next-line github/no-d-none
      errorMenuClone.classList.remove('d-none')
      this.setMenu(errorMenuClone)
    }
  }
}
