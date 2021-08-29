import {setCookie} from '../cookies'
import timezone from '../timezone'

window.requestIdleCallback(() => {
  const value = timezone()
  if (value) {
    setCookie('tz', encodeURIComponent(value))
  }
})
