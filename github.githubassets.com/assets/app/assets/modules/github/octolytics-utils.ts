import {getCookies} from './cookies'
export function getOctolyticsId() {
  let clientId = ''
  const cookies = getCookies('_octo')
  const clientIds = []
  for (const cookie of cookies) {
    const splitOut = cookie.value.split('.')
    const first = splitOut.shift()
    if (first === 'GH1' && splitOut.length > 1) {
      const version = (splitOut.shift() || '').split('-')
      if (version.length === 1) {
        version[1] = '1'
      }
      const numberVersion = [Number(version[0]), Number(version[1])]
      clientId = splitOut.join('.')
      clientIds.push([numberVersion, clientId])
    }
  }
  clientId = ''
  if (clientIds.length > 0) {
    clientId = String(clientIds.sort().reverse()[0][1])
  }
  return clientId
}
