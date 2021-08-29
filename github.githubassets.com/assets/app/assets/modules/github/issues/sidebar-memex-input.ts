import {attr, controller, target, targets} from '@github/catalyst'

/**
 * A web component that allows inline editing of <input> fields.
 * The fields work without an outer <form>.
 *
 * @type HTMLElement
 * @example
 * ```html
 * <sidebar-memex-input data-url="http://localhost" data-csrf="1234567890" data-column="1">
 *  <input type="date name="memexProjectColumnValues[][value]" value="" data-target="sidebar-memex-input.read" data-action=" blur:sidebar-memex-input#onBlur keydown:sidebar-memex-input#onKeyDown disabled />
 * </sidebar-memex-input>
 * ```
 */
@controller
class SidebarMemexInputElement extends HTMLElement {
  @attr url = ''
  @attr csrf = ''
  @attr instrument = ''
  @attr column = 1

  @targets inputs: NodeListOf<HTMLInputElement>
  @target read: HTMLInputElement
  @target write: HTMLElement
  @targets parameters: NodeListOf<HTMLInputElement>

  get isDisabled(): boolean {
    return this.read?.hasAttribute('disabled')
  }

  set hasErrored(value: boolean) {
    value ? this.setAttribute('errored', '') : this.removeAttribute('errored')
  }

  set disabled(value: boolean) {
    value ? this.setAttribute('disabled', '') : this.removeAttribute('disabled')
  }

  get hasExpanded(): boolean {
    return this.read.getAttribute('aria-expanded') === 'true'
  }

  connectedCallback() {
    this.disabled = this.read?.disabled ?? true

    // this is a hack, until the dropdown has been refactored
    if (this.querySelector('details') !== null) {
      this.classList.toggle('no-pointer')
    }
  }

  handleDetailsSelect(e: Event) {
    const custom = e as CustomEvent
    const details = e.target as HTMLElement
    const el = custom.detail?.relatedTarget as HTMLElement
    const opened = details.closest('details')
    const button = opened?.querySelector('[data-menu-button]')

    if (el.getAttribute('aria-checked') === 'true') {
      el.setAttribute('aria-checked', 'false')
      e.preventDefault()

      for (const input of this.inputs) {
        if (el.contains(input)) {
          this.updateCell(input.name, '')

          if (button?.innerHTML) {
            button.innerHTML = input.placeholder
          }

          break
        }
      }

      opened?.removeAttribute('open')
    }
  }

  handleDetailsSelected(e: Event) {
    const custom = e as CustomEvent
    const el = custom.detail?.relatedTarget as HTMLElement
    for (const input of this.inputs) {
      if (el.contains(input)) {
        this.updateCell(input.name, input.value)
        break
      }
    }
  }

  mouseDownFocus(e: Event) {
    if (!this.isDisabled) {
      return
    }

    this.onFocus(e)
  }

  keyDownFocus(e: KeyboardEvent) {
    if (e.code === 'Enter' || e.code === 'Space') {
      if (this.read !== document.activeElement) {
        this.onFocus(e)
      }
    }
  }

  onChange(e: Event) {
    const el = e.target as HTMLElement
    if (el.getAttribute('type') === 'date') {
      return
    }

    this.updateCell(this.read?.name, this.read?.value)
  }

  onFocus(e: KeyboardEvent | Event) {
    e.preventDefault()

    this.disabled = false
    this.read.disabled = false
    this.read.focus()
  }

  onBlur(e: Event) {
    if (this.hasExpanded) {
      e.preventDefault()
      return
    }

    const el = e.target as HTMLElement
    if (el.getAttribute('type') === 'date') {
      this.updateCell(this.read?.name, this.read?.value)
    }

    this.read.disabled = true
    this.disabled = true
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Enter' || e.code === 'Tab') {
      e.preventDefault()
      e.stopPropagation()

      if (this.hasExpanded) {
        return
      }

      // eslint-disable-next-line github/no-blur
      this.read.blur()
    }
  }

  async updateCell(name = '', value = '') {
    const data = new FormData()
    data.set(name, value)
    data.set('ui', this.instrument)

    for (const input of this.parameters) {
      data.set(input.name, input.value)
    }

    const format = Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })

    try {
      // this is an opportunistic update
      if (this.write) {
        const update = this.read.value
        const formatted = this.read.type === 'date' && update ? format.format(Date.parse(update)) : update
        this.write.innerHTML = update ? formatted : this.read.placeholder
      }

      const response = await fetch(this.url, {
        method: 'PUT',
        body: data,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Scoped-CSRF-Token': `${this.csrf}`
        }
      })

      if (!response.ok) {
        throw new Error('connection error')
      }

      // if there is no target to update,
      // break here and leave the opportunistic update of the field
      if (!this.write) {
        return
      }

      // this is the reconciliation
      const content = await response.json()
      const column = content['memexProjectItem']['memexProjectColumnValues'].find(
        (e: Record<string, unknown>) => e['memexProjectColumnId'] === Number(this.column)
      )

      const commit = column['value']
      const update = this.read.type === 'date' ? Date.parse(commit['value']) : commit['html']
      const formatted = this.read.type === 'date' && update ? format.format(update) : update
      this.write.innerHTML = value ? formatted : this.read.placeholder
    } catch (e) {
      this.hasErrored = true
    }
  }
}
