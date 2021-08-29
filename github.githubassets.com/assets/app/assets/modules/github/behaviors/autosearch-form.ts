// Autosearch form
//
// Automatically replaces the contents of a container against a search field
// in the search form.
//
// Note: Using `data-throttled-autosubmit` means that the form will autosubmit
// on input with a bit of throttle so that we don't send unnessesary requests
// to the server. See `app/assets/modules/github/behaviors/autosubmit.js`.
//
// Markup:
//
// `data-autosearch-results-container` - The ID of the container to update with results
//
// <form action="/search" data-autosearch-results-container="search-results">
//   <input type="search" placeholder="Find something" data-throttled-autosubmit>
//   <div id="search-results">
//     This content will get replaced when the input changes
//   </div>
// </form>
//
import {on} from 'delegated-events'
import {parseHTML} from '../parse-html'
import {replaceState} from '../history'
import {serialize} from '../form'

let previousController: AbortController | null = null
on('submit', '[data-autosearch-results-container]', async function (event) {
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return
  event.preventDefault()

  previousController?.abort()
  form.classList.add('is-sending')
  const url = new URL(form.action, window.location.origin)
  const method = form.method
  const serialized = serialize(form)
  let body = null
  if (method === 'get') {
    url.search = serialized
  } else {
    body = new FormData(form)
  }
  const {signal} = (previousController = new AbortController())
  const request = new Request(url.toString(), {
    method,
    body,
    signal,
    headers: {Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest'}
  })
  let response
  try {
    response = await fetch(request)
  } catch {
    // Ignore network errors
  }
  form.classList.remove('is-sending')
  if (!response || !response.ok || signal.aborted) return
  const id = form.getAttribute('data-autosearch-results-container')
  const resultsContainer = id ? document.getElementById(id) : null
  if (resultsContainer) {
    resultsContainer.innerHTML = ''
    resultsContainer.appendChild(parseHTML(document, await response.text()))
  }
  replaceState(null, '', `?${serialized}`)
})
