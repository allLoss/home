let lastActiveElement: Element | null
let currentInputIsMouse = false

function setClass() {
  lastActiveElement = document.activeElement
  if (document.body) {
    document.body.classList.toggle('intent-mouse', currentInputIsMouse)
  }
}

// Use mousedown event to make sure outline is remove for holding and dragging
document.addEventListener(
  'mousedown',
  function () {
    currentInputIsMouse = true
    if (lastActiveElement === document.activeElement) setClass()
  },
  {capture: true}
)

document.addEventListener(
  'keydown',
  function () {
    currentInputIsMouse = false
  },
  {capture: true}
)

document.addEventListener('focusin', setClass, {capture: true})
