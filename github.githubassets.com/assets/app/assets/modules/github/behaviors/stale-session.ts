// Detects signout/signin events via `flash[:stale_session_signedin]` and
// notifies other browser tabs so that they can:
//
// 1. display the "You signed out in another tab" banner; and
// 2. disable pjaxing and form submission.
//
// On browsers that don't support BroadcastChannel, the `logged-in`
// localStorage key is used to send messages between tabs.

function sessionChanged(loggedIn: string) {
  const flash = document.querySelector<HTMLElement>('.js-stale-session-flash')!
  const flashSignedIn = flash.querySelector<HTMLElement>('.js-stale-session-flash-signed-in')!
  const flashSignedOut = flash.querySelector<HTMLElement>('.js-stale-session-flash-signed-out')!

  flash.hidden = false
  flashSignedIn.hidden = loggedIn === 'false'
  flashSignedOut.hidden = loggedIn === 'true'

  window.addEventListener('popstate', function (event: PopStateEvent) {
    if (event.state && event.state.container != null) {
      location.reload()
    }
  })

  document.addEventListener('submit', function (event: Event) {
    event.preventDefault()
  })
}

let bc
if (typeof BroadcastChannel === 'function') {
  try {
    bc = new BroadcastChannel('stale-session')
    bc.onmessage = event => {
      if (typeof event.data === 'string') sessionChanged(event.data)
    }
  } catch {
    // ignore
  }
}
if (!bc) {
  let postingMessage = false

  bc = {
    postMessage(message: string) {
      postingMessage = true
      try {
        window.localStorage.setItem('logged-in', message)
      } finally {
        postingMessage = false
      }
    }
  }

  window.addEventListener('storage', function (event) {
    if (!postingMessage && event.storageArea === window.localStorage && event.key === 'logged-in') {
      try {
        if (event.newValue === 'true' || event.newValue === 'false') {
          sessionChanged(event.newValue)
        }
      } finally {
        window.localStorage.removeItem(event.key)
      }
    }
  })
}

const element = document.querySelector('.js-stale-session-flash[data-signedin]')
if (element) {
  const value = element.getAttribute('data-signedin') || ''
  bc.postMessage(value)
}
