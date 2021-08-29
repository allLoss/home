// Reports a proxy site and applies rudimentary obfuscation to the data that is sent.

import detectProxySite from '../proxy-site-detection'
import {reportError} from '../failbot'

// See lib/github/proxy_detection.rb
const ProxyDetectionParam = '$__'

const proxyPayload = document.querySelector('meta[name=js-proxy-site-detection-payload]')
const expectedHostname = document.querySelector('meta[name=expected-hostname]')

if (proxyPayload instanceof HTMLMetaElement && expectedHostname instanceof HTMLMetaElement) {
  if (detectProxySite(document)) {
    const data = {
      url: window.location.href,
      expectedHostname: expectedHostname.content,
      documentHostname: document.location.hostname,
      proxyPayload: proxyPayload.content
    }

    const error = new Error()
    const obj: {[key: string]: string} = {}
    obj[`${ProxyDetectionParam}`] = btoa(JSON.stringify(data))
    reportError(error, obj)
  }
}
