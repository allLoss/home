import {controller, target} from '@github/catalyst'

@controller
class BranchFilterItemElement extends HTMLElement {
  @target destroyButton: HTMLButtonElement | null
  @target spinner: HTMLElement

  get branch(): string {
    return this.getAttribute('branch')!
  }

  get branches(): BranchFilterItemElement[] {
    const container = this.closest('branch-filter')!
    const rows = container.querySelectorAll<BranchFilterItemElement>('branch-filter-item')
    return Array.from(rows).filter(el => el.branch === this.branch)
  }

  loading(load: boolean) {
    for (const el of this.branches) {
      el.spinner.hidden = !load
      if (el.destroyButton) {
        el.destroyButton.hidden = load
      }
    }
  }

  set mode(value: 'restore' | 'destroy') {
    for (const el of this.branches) {
      el.classList.toggle('Details--on', value === 'restore')
    }
  }

  async restore(event: Event) {
    event.preventDefault()
    this.loading(true)
    const form = event.target as HTMLFormElement

    let response
    try {
      response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: {'X-Requested-With': 'XMLHttpRequest'}
      })
    } catch {
      // Ignore network errors
    } finally {
      if (!response || !response.ok) location.reload()
      this.loading(false)
    }

    this.mode = 'destroy'
  }

  async destroy(event: Event) {
    event.preventDefault()
    this.loading(true)
    const form = event.target as HTMLFormElement

    let response
    try {
      response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: {'X-Requested-With': 'XMLHttpRequest'}
      })
    } catch {
      // Ignore network errors
    } finally {
      if (!response || !response.ok) location.reload()
      this.loading(false)
    }

    this.mode = 'restore'
  }
}
