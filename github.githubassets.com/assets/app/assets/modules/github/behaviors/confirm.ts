// Confirm
//
// Prompts native confirm dialog before activating link.
//
// data-confirm - Message to pass to confirm().
//
//   <button type="submit" data-confirm="Are you sure?">Delete</a>

document.addEventListener(
  'click',
  function (event) {
    if (!(event.target instanceof Element)) return

    const selector =
      'a[data-confirm], input[type=submit][data-confirm], input[type=checkbox][data-confirm], button[data-confirm]'

    const currentTarget = event.target.closest(selector)
    if (!currentTarget) return

    const message = currentTarget.getAttribute('data-confirm')
    if (!message) return

    if (
      currentTarget instanceof HTMLInputElement &&
      currentTarget.hasAttribute('data-confirm-checked') &&
      !currentTarget.checked
    ) {
      return
    }

    if (!confirm(message)) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  },
  true
)
