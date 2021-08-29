import {getDocumentHtmlSafeNonces, verifyResponseHtmlSafeNonce} from './html-safe'
import {parseHTML} from './parse-html'

/**
 * @deprecated see https://github.com/github/web-systems/issues/274
 */
class ResponseError extends Error {
  response: Response
  framesToPop: number

  constructor(response: Response) {
    super()
    this.response = response
    this.framesToPop = 1
  }
}

/**
 * @deprecated see https://github.com/github/web-systems/issues/274
 */
function checkStatus(response: Response, responseError: ResponseError): Response {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    responseError.message = `HTTP ${response.status}${statusText}`
    throw responseError
  }
}

/**
 * @deprecated see https://github.com/github/web-systems/issues/274
 */
function makeRequest(init: RequestInfo, options?: RequestInit): Request {
  const opts = options ? Object.assign({}, options) : {}

  const request = new Request(init, opts)
  request.headers.append('X-Requested-With', 'XMLHttpRequest')

  return request
}

export async function fetchSafeDocumentFragment(
  document: Document,
  url: RequestInfo,
  options?: RequestInit
): Promise<DocumentFragment> {
  const response = await self.fetch(makeRequest(url, options))
  const responseError = new ResponseError(response)
  checkStatus(response, responseError)
  verifyResponseHtmlSafeNonce(getDocumentHtmlSafeNonces(document), response)
  return parseHTML(document, await response.text())
}

export function fetchPoll(url: RequestInfo, options?: RequestInit): Promise<Response> {
  return (async function poll(wait: number): Promise<Response> {
    const response = await self.fetch(makeRequest(url, options))
    const responseError = new ResponseError(response)
    checkStatus(response, responseError)

    if (response.status === 200) return response
    if (response.status === 202) {
      await new Promise(resolve => setTimeout(resolve, wait))
      return poll(wait * 1.5)
    }
    throw new ResponseError(response)
  })(1000)
}
