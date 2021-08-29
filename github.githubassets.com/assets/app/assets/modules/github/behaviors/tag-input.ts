// Populate a form input from a suggested list of tags.
//
// Markup example:
//
//    <!-- Tag input container -->
//    <div class="tag-input-container js-tag-input-container">
//
//      <!-- Tag <input> wrapper -->
//      <div class="tag-input js-tag-input-wrapper">
//
//        <!-- List of selected tags -->
//        <ul class="js-tag-input-selected-tags">
//
//          <!-- Template used to generate new selected tags -->
//          <li class="js-tag-input-tag js-template d-none">
//            <span class="js-placeholder-tag-name"></span>
//            <a class="remove js-remove" tabindex="-1">&times;</a>
//            <input type="hidden" name="attribute[]" value="tag-value">
//          </li>
//
//          <!-- List of pre-selected tags (optional) -->
//          <li class="js-tag-input-tag">
//            <span class="js-tag-input-tag-name">ruby-on-rails</span>
//            <a class="remove js-remove" tabindex="-1">&times;</a>
//            <input type="hidden" name="attribute[]" value="ruby-on-rails">
//          </li>
//        </ul>
//
//        <auto-complete src="<%= url %>" for="popup">
//          <input type="text" class="tag-input-inner" autocomplete="off" autofocus>
//          <div class="js-navigation-container js-active-navigation-container">
//            <ul class="suggester" id="popup"></ul>
//          </div>
//        </auto-complete>
//      </div>
//    </div>
//

import AutocompleteElement from '@github/auto-complete-element'
import {eventToHotkeyString} from '@github/hotkey'
import {fire} from 'delegated-events'
import {observe} from 'selector-observer'

interface TagInputOptions {
  container: HTMLElement
  selections: HTMLElement
  inputWrap: HTMLElement
  input: HTMLInputElement
  tagTemplate: HTMLElement
  autoComplete: AutocompleteElement
}

class TagInput {
  container: HTMLElement
  selections: HTMLElement
  inputWrap: HTMLElement
  input: HTMLInputElement
  form: HTMLFormElement
  tagTemplate: HTMLElement
  autoComplete: AutocompleteElement

  constructor(options: TagInputOptions) {
    this.container = options.container
    this.selections = options.selections
    this.inputWrap = options.inputWrap
    this.input = options.input
    this.tagTemplate = options.tagTemplate
    this.form = this.input.form!
    this.autoComplete = options.autoComplete
  }

  // Bind a tag input to the DOM.
  setup() {
    this.container.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as Element
      if (target.closest('.js-remove')) {
        this.removeTag(event)
      } else {
        this.onFocus()
      }
    })
    this.input.addEventListener('focus', this.onFocus.bind(this))
    this.input.addEventListener('blur', this.onBlur.bind(this))
    this.input.addEventListener('keydown', this.onKeyDown.bind(this))
    this.form.addEventListener('submit', this.onSubmit.bind(this))

    this.autoComplete.addEventListener('auto-complete-change', () => {
      this.selectTag(this.autoComplete.value)
    })
  }

  // Make the tag input container look like a focused input.
  onFocus() {
    this.inputWrap.classList.add('focus')
    if (this.input !== document.activeElement) this.input.focus()
  }

  // Make the tag input container *not* look like a focused input. Also submit
  // the form if there is text in the input and the suggester is hidden.
  onBlur() {
    this.inputWrap.classList.remove('focus')
    if (!this.autoComplete.open) {
      this.onSubmit()
    }
  }

  // Taggify the last thing the user typed in case they didn't hit Enter, Tab,
  // or a comma before clicking the form's submit button.
  onSubmit() {
    if (this.input.value) {
      this.selectTag(this.input.value)
      this.autoComplete.open = false
    }
  }

  onKeyDown(event: KeyboardEvent) {
    switch (eventToHotkeyString(event)) {
      case 'Backspace':
        this.onBackspace()
        break
      case 'Enter':
      case 'Tab':
        this.taggifyValueWhenSuggesterHidden(event)
        break
      case ',':
      case ' ': // (Space)
        this.taggifyValue(event)
        break
    }
  }

  // Taggifies the entered value when the suggester is not visible. Called after an Enter
  // or Tab is entered.
  taggifyValueWhenSuggesterHidden(event: Event) {
    if (!this.autoComplete.open && this.input.value) {
      event.preventDefault()
      this.selectTag(this.input.value)
    }
  }

  // Taggifies the entered value if it exists; called after a comma or space is entered.
  taggifyValue(event: Event) {
    if (this.input.value) {
      event.preventDefault()
      this.selectTag(this.input.value)
      this.autoComplete.open = false
    }
  }

  // Add a new tag to the list of selections if it has not already been added.
  selectTag(text: string) {
    const tag = this.normalizeTag(text)
    const selections = this.selectedTags()

    if (tag && selections.indexOf(tag) < 0) {
      this.selections.appendChild(this.templateTag(tag))
      this.input.value = ''
      fire(this.form, 'tags:changed')
    }
  }

  // Remove a tag from the list of selections.
  removeTag(event: Event) {
    const target = event.target as Element
    event.preventDefault()
    const inputTag = target.closest<HTMLElement>('.js-tag-input-tag')!
    inputTag.remove()
    fire(this.form, 'tags:changed')
  }

  // Generate a new tag Node.
  templateTag(tag: string): Element {
    const el = this.tagTemplate.cloneNode(true) as Element

    el.querySelector<HTMLInputElement>('input')!.value = tag
    const tagName = el.querySelector<HTMLElement>('.js-placeholder-tag-name')!
    tagName.replaceWith(tag)
    /* eslint-disable-next-line github/no-d-none */
    el.classList.remove('d-none', 'js-template')

    return el
  }

  // Sanitize user input to remove invalid tag characters.
  normalizeTag(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s,']+/g, '-')
  }

  // Remove a tag on backspace if the input is empty.
  onBackspace() {
    if (!this.input.value) {
      const lastSelection = this.selections.querySelector('li:last-child .js-remove')
      if (lastSelection instanceof HTMLElement) lastSelection.click()
    }
  }

  // Map matched input content to a suggester query.
  selectedTags(): string[] {
    const inputs = this.selections.querySelectorAll<HTMLInputElement>('input')
    return Array.from(inputs)
      .map(el => el.value)
      .filter(value => value.length > 0)
  }
}

observe('.js-tag-input-container', {
  constructor: HTMLElement,
  initialize(el) {
    new TagInput({
      container: el,
      inputWrap: el.querySelector<HTMLElement>('.js-tag-input-wrapper')!,
      input: el.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')!,
      selections: el.querySelector<HTMLElement>('.js-tag-input-selected-tags')!,
      tagTemplate: el.querySelector<HTMLElement>('.js-template')!,
      autoComplete: el.querySelector<AutocompleteElement>('auto-complete')!
    }).setup()
  }
})
