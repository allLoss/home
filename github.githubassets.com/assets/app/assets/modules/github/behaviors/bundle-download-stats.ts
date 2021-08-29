import {loaded} from '../document-ready'
import {sendStats} from '../stats'

type Ok<T> = {kind: 'ok'; value: T | null}
type Err<E> = {kind: 'err'; value: E}
type Result<T, E> = Ok<T> | Err<E>

function getLocalJSON<T>(key: string): Result<T, Error> {
  try {
    const text = window.localStorage.getItem(key)
    return {kind: 'ok', value: text ? JSON.parse(text) : null}
  } catch (e) {
    return {kind: 'err', value: e}
  }
}

function setLocalJSON<T>(key: string, value: T): Result<null, Error> {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return {kind: 'ok', value: null}
  } catch (e) {
    return {kind: 'err', value: e}
  }
}

function gatherBundleURLs() {
  const urls: {[key: string]: string} = {}
  for (const script of document.getElementsByTagName('script')) {
    const match = script.src.match(/\/([\w-]+)-[0-9a-f]{8,}\.js$/)
    if (match) urls[`${match[1]}.js`] = script.src
  }
  for (const link of document.getElementsByTagName('link')) {
    const match = link.href.match(/\/([\w-]+)-[0-9a-f]{8,}\.css$/)
    if (match) urls[`${match[1]}.css`] = link.href
  }
  return urls
}

type Bundles = Record<string, string>

function report() {
  const urls = gatherBundleURLs()
  const read = getLocalJSON<Bundles>('bundle-urls')
  if (read.kind === 'err') {
    setLocalJSON('bundle-urls', urls)
    return
  }
  const previousURLs = read.value || {}
  const downloadedBundles = Object.keys(urls).filter(bundle => previousURLs[bundle] !== urls[bundle])
  if (downloadedBundles.length) {
    const write = setLocalJSON('bundle-urls', {...previousURLs, ...urls})
    if (write.kind === 'ok') {
      sendStats({downloadedBundles})
    }
  }
}

;(async () => {
  await loaded
  window.requestIdleCallback(report)
})()
