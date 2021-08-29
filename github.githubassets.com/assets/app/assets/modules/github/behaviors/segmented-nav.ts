import {on} from 'delegated-events'

on('click', '.js-segmented-nav-button', function (event) {
  event.preventDefault()
  const target = event.currentTarget

  const selectedTabSelector = target.getAttribute('data-selected-tab')!
  const navigationContainer = target.closest<HTMLElement>('.js-segmented-nav')!
  const container = navigationContainer.parentElement!

  for (const button of navigationContainer.querySelectorAll('.js-segmented-nav-button')) {
    button.classList.remove('selected')
  }

  target.classList.add('selected')

  for (const tab of container.querySelectorAll('.js-selected-nav-tab')) {
    if (tab.parentElement === container) {
      tab.classList.remove('active')
    }
  }

  document.querySelector<HTMLElement>(`.${selectedTabSelector}`)!.classList.add('active')
})
