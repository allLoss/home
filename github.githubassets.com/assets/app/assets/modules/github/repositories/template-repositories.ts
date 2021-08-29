import {fire, on} from 'delegated-events'

on('change', '.js-template-repository-choice', function (event) {
  const radio = event.target as HTMLInputElement
  const isTemplateSelected = radio.checked && radio.value !== ''
  const form = radio.form!
  const autoInitOptions = form.querySelector<HTMLElement>('.js-repository-auto-init-options')!
  autoInitOptions.classList.toggle('has-removed-contents', isTemplateSelected)
  const templateSettings = form.querySelectorAll<HTMLElement>('.js-template-repository-setting')
  const templateNameDisplays = form.querySelectorAll('.js-template-repository-name-display')

  if (isTemplateSelected) {
    const radioContainer = radio.closest<HTMLElement>('.js-template-repository-choice-container')!
    const templateNameEl = radioContainer.querySelector<HTMLElement>('.js-template-repository-name')!
    const templateOwner = radio.getAttribute('data-owner')!
    const ownerChoice = form.querySelector(`.js-repository-owner-choice[value="${templateOwner}"]`)
    if (ownerChoice instanceof HTMLInputElement) {
      ownerChoice.checked = true
      fire(ownerChoice, 'change')
    } else {
      const viewerOwnerChoice = form.querySelector<HTMLInputElement>(
        '.js-repository-owner-choice.js-repository-owner-is-viewer'
      )!
      viewerOwnerChoice.checked = true
      fire(viewerOwnerChoice, 'change')
    }

    for (const templateNameDisplay of templateNameDisplays) {
      templateNameDisplay.textContent = templateNameEl.textContent
    }
  } else {
    for (const templateNameDisplay of templateNameDisplays) {
      templateNameDisplay.textContent = ''
    }
  }

  for (const templateSetting of templateSettings) {
    templateSetting.hidden = !isTemplateSelected
  }
})
