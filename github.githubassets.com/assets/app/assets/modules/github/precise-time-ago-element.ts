import {RelativeTimeElement} from '@github/time-elements'

// <precise-time-ago> generates an always relative time-ago with short
// descriptions like "1h 15m 30s." It updates every second, which is useful for
// showing elapsed times when precision is important, like for CI. For better
// performance, prefer <time-ago format="micro"> when precision to the second
// is not needed.
//
// Example usage:
// <precise-time-ago datetime="2012-04-01T16:30:00-08:00"></precise-time-ago>

class PreciseTimeAgoElement extends RelativeTimeElement {
  // Adapted from https://git.io/fjloW to update every second
  connectedCallback() {
    nowElements.push(this)

    if (!updateNowElementsId) {
      updateNowElements()
      updateNowElementsId = window.setInterval(updateNowElements, 1000)
    }
  }

  // Copied from https://git.io/fjlAl to access module-scoped variables
  disconnectedCallback() {
    const ix = nowElements.indexOf(this)
    if (ix !== -1) {
      nowElements.splice(ix, 1)
    }

    if (!nowElements.length) {
      window.clearInterval(updateNowElementsId)
      updateNowElementsId = undefined
    }
  }

  getFormattedDate() {
    const timeAgoDate = this.date
    if (!timeAgoDate) return

    const ms = new Date().getTime() - timeAgoDate.getTime()
    const sec = Math.floor(ms / 1000)
    const min = Math.floor(sec / 60)
    const hr = Math.floor(min / 60)
    const day = Math.floor(hr / 24)

    const remainderSec = sec - min * 60
    const remainderMin = min - hr * 60
    const remainderHr = hr - day * 24

    if (min < 1) {
      return this.applyPrecision([`${sec}s`])
    } else if (hr < 1) {
      return this.applyPrecision([`${min}m`, `${remainderSec}s`])
    } else if (day < 1) {
      return this.applyPrecision([`${hr}h`, `${remainderMin}m`, `${remainderSec}s`])
    } else {
      return this.applyPrecision([`${day}d`, `${remainderHr}h`, `${remainderMin}m`, `${remainderSec}s`])
    }
  }

  applyPrecision(units: string[]) {
    const precision = Number(this.getAttribute('data-precision') || units.length)
    return units.slice(0, precision).join(' ')
  }
}

// https://git.io/fjlo4.
const nowElements: PreciseTimeAgoElement[] = []

// https://git.io/fjloB.
let updateNowElementsId: number | undefined

// https://git.io/fjloR
function updateNowElements() {
  for (const element of nowElements) {
    element.textContent = element.getFormattedDate() || ''
  }
}

if (!window.customElements.get('precise-time-ago')) {
  window.PreciseTimeAgoElement = PreciseTimeAgoElement
  window.customElements.define('precise-time-ago', PreciseTimeAgoElement)
}

declare global {
  interface Window {
    PreciseTimeAgoElement: typeof PreciseTimeAgoElement
  }
}
