import {RefType, SearchIndex} from './ref-selector/search-index'
import {TemplateInstance, propertyIdentityOrBooleanAttribute} from '@github/template-parts'
import {controller, target} from '@github/catalyst'
import VirtualizedList from 'virtualized-list'

@controller
class RefSelectorElement extends HTMLElement {
  // container holding the current list of search results
  @target listContainer: HTMLElement

  @target itemTemplate: HTMLTemplateElement
  @target noMatchTemplate: HTMLTemplateElement
  @target fetchFailedTemplate: HTMLTemplateElement
  // Template to render the selected item when not visible (so input value still in form)
  @target hiddenCurrentItemTemplate: HTMLTemplateElement

  // Is this a branch or tag list?
  refType: RefType

  // The current input value. Defaults to current-committish if initial-filter is provided
  input: string

  // the NWO for the current repo
  nameWithOwner: string

  // The branch, tag or SHA being viewed.
  currentCommittish: string | null

  // Track whether or not the current committish is on view
  isCurrentVisible = false

  // The currently rendered hiddenCheckedItemTemplate instance, if any
  hiddenCurrentElement?: HTMLElement

  // The default branch for this repository.
  defaultBranch: string

  // Manages the list of refs and allows searching among them
  index: SearchIndex

  // If true, displays the noMatchTemplate if no exact match (not only when no similar matches).
  // In this case, the template should display the create row.
  canCreate: boolean

  currentSelectionIndex: number | null = null

  prefetchOnMouseover: boolean

  // the list of refs, virtualized to avoid rendering overhead
  virtualizedList: VirtualizedList

  connectedCallback() {
    this.refType = this.getRequiredAttr('type') === 'branch' ? RefType.Branch : RefType.Tag
    const currentCommittishAttr = this.getAttribute('current-committish')
    this.currentCommittish = currentCommittishAttr ? atob(currentCommittishAttr) : null
    this.input = (this.hasAttribute('initial-filter') && this.currentCommittish) || ''
    this.defaultBranch = atob(this.getRequiredAttr('default-branch'))
    this.nameWithOwner = atob(this.getRequiredAttr('name-with-owner'))
    this.canCreate = this.hasAttribute('can-create')
    this.prefetchOnMouseover = this.hasAttribute('prefetch-on-mouseover')
    const queryEndpoint = this.getRequiredAttr('query-endpoint')
    const cacheKey = this.getRequiredAttr('cache-key')
    this.index = new SearchIndex(this.refType, this, queryEndpoint, cacheKey, this.nameWithOwner)
    this.setupFetchListeners()
  }

  inputEntered(e: CustomEvent) {
    this.input = e.detail
    this.render()
  }

  // Fetch data when the tab is selected if we haven't already
  tabSelected() {
    this.index.fetchData()
  }

  renderTemplate(template: HTMLTemplateElement, params: unknown): DocumentFragment {
    return new TemplateInstance(template, params, propertyIdentityOrBooleanAttribute)
  }

  renderRow(index: number) {
    const refName = this.index.currentSearchResult[index]
    if (!refName && index >= this.listLength) {
      // work around an off-by-one error in virtualized-list
      // https://github.com/clauderic/virtualized-list/blob/v2.2.0/src/VirtualList/SizeAndPositionManager.js#L137
      // (should be this._itemCount-1 since stop is an iteration index.
      // Just return an empty span.
      return document.createElement('span')
    }

    if (this.index.fetchFailed) {
      return this.renderTemplate(this.fetchFailedTemplate, {index, refName: this.input})
    }

    if (!refName) {
      const isCurrent = this.input === this.currentCommittish
      this.isCurrentVisible ||= isCurrent
      return this.renderTemplate(this.noMatchTemplate, {
        index,
        isCurrent,
        refName: this.input
      })
    }

    const isFiltering = this.input.length > 0
    const isFilteringClass = isFiltering ? 'is-filtering' : ''
    const isCurrent = refName === this.currentCommittish
    this.isCurrentVisible ||= isCurrent
    const template = this.renderTemplate(this.itemTemplate, {
      refName,
      index,
      isFilteringClass,
      urlEncodedRefName: this.urlEncodeRef(refName),
      isCurrent,
      isNotDefault: refName !== this.defaultBranch
    })
    if (isFiltering) {
      // highlight the matching entry
      const branchNameSpan = template.querySelector('span')!
      branchNameSpan.textContent = ''
      const parts = refName.split(this.input)
      const limit = parts.length - 1

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        branchNameSpan.appendChild(document.createTextNode(part))
        if (i < limit) {
          const b = document.createElement('b')
          b.textContent = this.input
          branchNameSpan.appendChild(b)
        }
      }
    }
    return template
  }

  // Encoding a branch uses encodeURIComponent with two exceptions.
  // Ported from UrlHelper.escape_branch and _ref_list_content.html.erb
  // (`branch_escaped`)
  urlEncodeRef(refName: string) {
    return encodeURIComponent(refName).replace('%2F', '/').replace('%3A', ':').replace('%2B', '+')
  }

  render() {
    this.currentSelectionIndex = null
    if (this.index.isLoading) return
    if (!this.virtualizedList) {
      this.index.search(this.input)
      this.setupVirtualizedList()
      return
    }
    this.listContainer.scrollTop = 0
    this.index.search(this.input)
    this.virtualizedList.setRowCount(this.listLength)
  }

  get listLength() {
    const length = this.index.currentSearchResult.length
    if (this.showCreateRow) return length + 1 // extra space for the "create branch" form
    if (!length) return 1 // we never render 0 items, instead of an empty list we show the not found indicator
    return length
  }

  get showCreateRow(): boolean {
    return !this.index.fetchFailed && !this.index.exactMatchFound && this.input !== '' && this.canCreate
  }

  getRequiredAttr(name: string, targetEl: HTMLElement = this): string {
    const result = targetEl.getAttribute(name)
    if (!result) {
      throw new Error(`Missing attribute for ${targetEl}: ${name}`)
    }
    return result
  }

  // Since usually the element will start out hidden behind a <details>
  // element, we won't perform the data fetch until the container is
  // expanded or probably about to be.
  setupFetchListeners() {
    const details = this.closest('details')
    let fetched = false
    const fetch = () => {
      if (!fetched) {
        this.index.fetchData()
        fetched = true
      }
    }

    if (!details || details.open) {
      // if we are not contained in a details menu or the menu is already
      // open, fetch data immediately.
      fetch()
      return
    }

    if (this.prefetchOnMouseover) {
      // When the user has moused over the <details> element that we are a collapsed
      // member of, we want to start fetching data so by the time the user clicks to open we
      // should already have a head start.
      details.addEventListener('mouseover', fetch, {once: true})
    }

    this.addEventListener('keydown', this.keydown)

    this.addEventListener('change', this.updateCurrent)

    // if there's an input in details (no input-demux), we want to listen to its input events directly
    const inputElement = details.querySelector<HTMLInputElement>('input[data-ref-filter]')
    if (inputElement) {
      // Filter when user changes the input text
      inputElement.addEventListener('input', () => {
        this.input = inputElement.value
        this.render()
      })

      inputElement.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'Tab') {
          // Focus first list item when Tab or Down are pressed in the input. This is necessary
          // to initialize currentSelectionIndex, which is required to properly traverse the virtualizedList with keyboard.
          e.preventDefault()
          e.stopPropagation()
          this.focusFirstListMember()
        } else if (e.key === 'Enter') {
          // Trigger a click on the matching item when pressing Enter in the filter input
          let matchingIndex = this.index.currentSearchResult.indexOf(this.input)
          if (matchingIndex === -1) {
            if (this.showCreateRow) {
              matchingIndex = this.listLength - 1
            } else {
              return
            }
          }

          const matchingItem = details.querySelector<HTMLInputElement>(`[data-index="${matchingIndex}"]`)
          matchingItem!.click()
          e.preventDefault()
        }
      })
    }
  }

  // Enter the list keyboard-nav style and highlight the topmost element.
  focusFirstListMember() {
    if (!this.virtualizedList) return
    this.currentSelectionIndex = 0
    this.focusItemAtIndex(this.currentSelectionIndex)
  }

  updateCurrent(event: Event) {
    if (event.target instanceof HTMLInputElement && event.target.checked && event.target.value) {
      this.currentCommittish = event.target.value
    }
  }

  // Handle escape to close the menu, up and down to change elements
  keydown(event: KeyboardEvent) {
    // if currentSelectionIndex isn't set, we're not "tabbed into the list" so ignore the event.
    if (this.currentSelectionIndex === null) return
    if (event.key === 'Enter') {
      const selected = document.activeElement as HTMLElement
      if (!selected) return
      // submit the form or visit the link.  probably a better way to do this :)
      selected.click()
      event.preventDefault()
      return
    }
    // shift-tab should not be handled because it's how we reverse tab out of the list
    if (event.key === 'Tab' && event.shiftKey) return

    // Let escapes bubble up to the handler in input-demux which will close the details element
    if (event.key === 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    switch (event.key) {
      case 'ArrowUp': {
        this.currentSelectionIndex--
        if (this.currentSelectionIndex < 0) {
          this.currentSelectionIndex = this.listLength - 1 // wraparound
        }
        this.focusItemAtIndex(this.currentSelectionIndex)
        break
      }
      case 'Home': {
        this.currentSelectionIndex = 0
        this.focusItemAtIndex(this.currentSelectionIndex)
        break
      }
      case 'End': {
        this.currentSelectionIndex = this.listLength - 1
        this.focusItemAtIndex(this.currentSelectionIndex)
        break
      }
      // Inside the list, tab is equivalent to down arrow.  have to override
      // platform tabkey behavior because our list is virtual and we risk
      // tabbing "out" of the list even though there are more elements.
      case 'Tab':
      case 'ArrowDown': {
        this.currentSelectionIndex++
        if (this.currentSelectionIndex > this.listLength - 1) {
          this.currentSelectionIndex = 0 // wraparound
        }
        this.focusItemAtIndex(this.currentSelectionIndex)
        break
      }
    }
  }

  focusItemAtIndex(index: number) {
    this.virtualizedList.scrollToIndex(index, 'center')
    // Focus needs to happen after virtual items have been updated, otherwise the focused element
    // may mutate later and leave us at the wrong item.
    // VirtualList uses requestAnimationFrame, so we need a timeout to be confident we run after it.
    setTimeout(() => {
      const nextSelectedItem = this.listContainer.querySelector(`[data-index="${index}"]`) as HTMLElement
      if (nextSelectedItem) nextSelectedItem.focus()
    }, 20)
  }

  setupVirtualizedList() {
    this.listContainer.innerHTML = ''
    this.virtualizedList = new VirtualizedList(this.listContainer, {
      height: 330,
      rowCount: this.listLength,
      renderRow: this.renderRow.bind(this),
      rowHeight: index => {
        // 33 is the size for most items.  the form can overflow a line, so
        // give it extra space when we render it.
        return this.showCreateRow && index === this.listLength - 1 ? 51 : 33
      },
      onRowsRendered: () => {
        if (this.hiddenCurrentElement) {
          this.listContainer.removeChild(this.hiddenCurrentElement)
          delete this.hiddenCurrentElement
        }

        if (this.isCurrentVisible) {
          // Reset for next rendering
          this.isCurrentVisible = false
        } else {
          // Render input for this.currentCommittish if not visible
          // Use a wrapping div because fragment cannot be `removeChild` easily
          if (this.hiddenCurrentItemTemplate) {
            this.hiddenCurrentElement = document.createElement('div')
            this.hiddenCurrentElement?.appendChild(
              this.renderTemplate(this.hiddenCurrentItemTemplate, {
                refName: this.currentCommittish
              })
            )
            this.listContainer.appendChild(this.hiddenCurrentElement)
          }
        }
      },
      initialIndex: 0,
      overscanCount: 6
    })
  }
}
