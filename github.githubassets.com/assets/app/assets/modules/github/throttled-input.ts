type TextField = HTMLInputElement | HTMLTextAreaElement

/**
 * Throttled Input event.
 *
 * Delays firing `input` event until user is done typing.
 *
 * Details.
 *
 * Never fires while a key is down, waits for the next keyup.
 *   NOTE: Native OSX text fields won't repeat keys. FF will repeat key while held down.
 *
 * Never fires for selection changes (pressing left or right keys to move the cursor).
 */

const throttledInputEvents: WeakMap<
  HTMLElement,
  {
    keypressed: boolean
    inputed: boolean
    timer: number | null | undefined
    listener: ThrottledHandler
    wait: number
  }
> = new WeakMap()

function schedule(element: TextField) {
  const events = throttledInputEvents.get(element)
  if (!events) return
  if (events.timer != null) clearTimeout(events.timer)

  events.timer = window.setTimeout(() => {
    if (events.timer != null) events.timer = null
    events.inputed = false
    events.listener.call(null, element)
  }, events.wait)
}

function onKeydownInput(event: Event) {
  const currentTarget = event.currentTarget as TextField
  const events = throttledInputEvents.get(currentTarget)
  if (!events) return
  events.keypressed = true
  if (events.timer != null) {
    clearTimeout(events.timer)
  }
}

function onKeyupInput(event: Event) {
  const currentTarget = event.currentTarget as TextField
  const events = throttledInputEvents.get(currentTarget)
  if (!events) return
  events.keypressed = false
  if (events.inputed) {
    schedule(currentTarget)
  }
}

function onInputInput(event: Event) {
  const currentTarget = event.currentTarget as TextField
  const events = throttledInputEvents.get(currentTarget)
  if (!events) return
  events.inputed = true
  if (!events.keypressed) {
    schedule(currentTarget)
  }
}

type ThrottledHandler = (arg0: TextField) => unknown

export function addThrottledInputEventListener(
  target: TextField,
  listener: ThrottledHandler,
  options: {wait: number | null} = {wait: null}
) {
  throttledInputEvents.set(target, {
    keypressed: false,
    inputed: false,
    timer: undefined,
    listener,
    wait: options.wait != null ? options.wait : 100
  })

  target.addEventListener('keydown', onKeydownInput)
  target.addEventListener('keyup', onKeyupInput)
  target.addEventListener('input', onInputInput)
}

export function removeThrottledInputEventListener(target: TextField, listener: ThrottledHandler) {
  target.removeEventListener('keydown', onKeydownInput)
  target.removeEventListener('keyup', onKeyupInput)
  target.removeEventListener('input', onInputInput)

  const events = throttledInputEvents.get(target)
  if (events) {
    if (events.timer != null && events.listener === listener) {
      clearTimeout(events.timer)
    }
    throttledInputEvents.delete(target)
  }
}

export function dispatchThrottledInputEvent(target: TextField) {
  const events = throttledInputEvents.get(target)
  if (events) events.listener.call(null, target)
}
