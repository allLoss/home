import {on} from 'delegated-events'

on(
  'details-menu-selected',
  '.js-sync-select-menu-text',
  function (event) {
    const button = document.querySelector<HTMLElement>('.js-sync-select-menu-button')!
    const text = (event.detail.relatedTarget as Element).querySelector<HTMLElement>('span[data-menu-button-text]')!
      .textContent
    button.textContent = text
    button.focus()
  },
  {capture: true}
)
