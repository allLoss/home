import '@github/include-fragment-element'

window.IncludeFragmentElement.prototype.fetch = (request: Request) => {
  request.headers.append('X-Requested-With', 'XMLHttpRequest')
  return window.fetch(request)
}
