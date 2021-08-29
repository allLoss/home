import {observe} from 'selector-observer'
import {on} from 'delegated-events'

// Check if a node contains a single image element with no text.
function isOnlyOneImage(node: Element): boolean {
  return (node.textContent || '').trim() === '' && (node.querySelectorAll('img') || []).length === 1
}

// Remove "show more/less" links if content is small enough or it doesn't
// contain text (for example only one image).

observe('.js-content-attachment .max--md', function (wrapper) {
  const markdownBody = wrapper.querySelector<HTMLElement>('.markdown-body')!
  if (markdownBody.clientHeight < 188 || isOnlyOneImage(markdownBody)) {
    wrapper.classList.remove('max--md')
    wrapper.querySelector<HTMLElement>('.Details-content--closed')!.hidden = true
    wrapper.querySelector<HTMLElement>('.Details-content--open')!.hidden = true
  }
})

// Submit the form to unfurl the content attachment.
on('click', '.js-hide-content-attachment', function (event) {
  event.preventDefault()
  const target = event.currentTarget
  const unfurl = target.closest<HTMLElement>('.js-content-attachment')!
  const element = target.closest<HTMLElement>('[data-unfurl-hide-url]')!
  const url = element.getAttribute('data-unfurl-hide-url')!
  const token = element.querySelector<HTMLInputElement>('.js-data-unfurl-hide-url-csrf')!
  const id = target.getAttribute('data-id')!
  const xhr = new XMLHttpRequest()

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      unfurl.remove()
    }
  }

  xhr.open('POST', url)

  const formData = new FormData()
  formData.append('id', id)

  // eslint-disable-next-line github/authenticity-token
  formData.append('authenticity_token', token.value)

  xhr.send(formData)
})
