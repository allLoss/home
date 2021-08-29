import captureKeypresses from '../../capture-keypresses'
import {changeValue} from '../../form'
import {on} from 'delegated-events'

let capturing: (() => string | boolean) | null = null

on('pjax:click', '.js-pjax-capture-input', function () {
  capturing = captureKeypresses(document)
})

on('pjax:end', '#js-repo-pjax-container', function () {
  if (capturing) {
    const value = capturing()
    const input = document.querySelector('.js-pjax-restore-captured-input')
    if (input instanceof HTMLInputElement && value) {
      changeValue(input, value)
    }
    capturing = null
  }
})
