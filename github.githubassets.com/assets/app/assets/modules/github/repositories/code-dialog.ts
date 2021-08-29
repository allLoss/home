import {observe} from 'selector-observer'

observe('.js-new-badge-autodismiss', {
  constructor: HTMLFormElement,
  add: form => {
    const details = form.closest<HTMLElement>('details')!
    details.addEventListener('toggle', () => {
      if (details.hasAttribute('open')) {
        fetch(form.action, {
          method: form.method,
          body: new FormData(form),
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
      }
    })
  }
})
