import {sendStats} from './stats'

export function sendData(hydroEventPayload: string, hydroEventHmac: string, hydroClientContext: string): void {
  const data = {
    hydroEventPayload,
    hydroEventHmac,
    visitorPayload: '',
    visitorHmac: '',
    hydroClientContext
  }

  const visitorPayload = document.querySelector('meta[name=visitor-payload]')
  if (visitorPayload instanceof HTMLMetaElement) {
    data['visitorPayload'] = visitorPayload.content
  }
  const visitorHmac = document.querySelector('meta[name=visitor-hmac]') || ''
  if (visitorHmac instanceof HTMLMetaElement) {
    data['visitorHmac'] = visitorHmac.content
  }

  sendStats(data, true)
}

export function trackView(el: HTMLElement) {
  const payload = el.getAttribute('data-hydro-view') || ''
  const hmac = el.getAttribute('data-hydro-view-hmac') || ''
  const hydroClientContext = el.getAttribute('data-hydro-client-context') || ''
  sendData(payload, hmac, hydroClientContext)
}

export function sendHydroEvent(el: HTMLElement) {
  const payload = el.getAttribute('data-hydro-click-payload') || ''
  const hmac = el.getAttribute('data-hydro-click-hmac') || ''
  const hydroClientContext = el.getAttribute('data-hydro-client-context') || ''
  sendData(payload, hmac, hydroClientContext)
}
