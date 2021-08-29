// Hotkey Behavior
//
// See https://github.com/github/hotkey

import {install, uninstall} from '@github/hotkey'
import {getPlatform} from '../platform-toggle'
import {observe} from 'selector-observer'

observe('[data-hotkey]', {
  constructor: HTMLElement,
  add(element) {
    install(element)
  },
  remove(element) {
    uninstall(element)
  }
})

observe('[data-hotkey-mac], [data-hotkey-win]', {
  constructor: HTMLInputElement,
  add(input) {
    const platform = getPlatform()
    input.setAttribute(
      'data-hotkey',
      input.getAttribute(platform === 'mac' ? 'data-hotkey-mac' : 'data-hotkey-win') as string
    )
    install(input)
  }
})
