// Ignore pjax if window.onbeforeunload is set, since we may not be able to
// safely navigate away from the current page.
document.addEventListener('pjax:click', function (event) {
  if (window.onbeforeunload) {
    return event.preventDefault()
  }
})
