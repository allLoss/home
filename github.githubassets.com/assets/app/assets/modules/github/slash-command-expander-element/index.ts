/*
This was pulled in from github/text-expander-element to make iterating and testing easier.
See https://github.com/github/ui-platform/issues/88
*/

import SlashCommandExpanderElement from './slash-command-expander-element'
export {SlashCommandExpanderElement as default}

declare global {
  interface Window {
    SlashCommandExpanderElement: typeof SlashCommandExpanderElement
  }
}

if (!window.customElements.get('slash-command-expander')) {
  window.SlashCommandExpanderElement = SlashCommandExpanderElement
  window.customElements.define('slash-command-expander', SlashCommandExpanderElement)
}
