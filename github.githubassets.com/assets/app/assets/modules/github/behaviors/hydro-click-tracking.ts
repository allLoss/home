import {on} from 'delegated-events'
import {sendData} from '../hydro-tracking'

on('click', '[data-hydro-click]', function (event) {
  const el = event.currentTarget
  const payload = el.getAttribute('data-hydro-click') || ''
  const hmac = el.getAttribute('data-hydro-click-hmac') || ''
  const hydroClientContext = el.getAttribute('data-hydro-client-context') || ''
  sendData(payload, hmac, hydroClientContext)
})

on('click', '[data-optimizely-hydro-click]', function (event) {
  const el = event.currentTarget
  const payload = el.getAttribute('data-optimizely-hydro-click') || ''
  const hmac = el.getAttribute('data-optimizely-hydro-click-hmac') || ''
  sendData(payload, hmac, '')
})
