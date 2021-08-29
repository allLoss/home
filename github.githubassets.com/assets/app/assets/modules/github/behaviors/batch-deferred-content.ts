// Batch Deferred Content Behavior
//
// Automatically fetches content for multiple placeholders with a single request.
// Placeholders are represented as <form>'s so that per-placeholder arguments can be
// passed along to the backend for rendering. Once the response is received, each placeholder
// will be replaced with it's relevant content.
//
// Batching is handled by an autoflushing queue. Once an upper limit (default 30) of placeholders
// are found, or new placeholders stop being added to the queue, after a timeout (default 50ms),
// a single request will be made to fetch the content for those items.
//
// Example Markup
//
//   <batch-deferred-content data-url="/my/batched/content/endpoint">
//     <input data-csrf type="hidden" value="AUTHN_TOKEN">
//     <input data-targets="batch-deferred-content.inputs" type="hidden" name="repo_id" value="42">
//     <input data-targets="batch-deferred-content.inputs" type="hidden" name="commit_oid" value="abcdef0">
//   </form>
//   …
//   <batch-deferred-content data-url="/my/batched/content/endpoint">
//     <input data-csrf type="hidden" value="AUTHN_TOKEN">
//     <input data-targets="batch-deferred-content.inputs" type="hidden" name="repo_id" value="88">
//     <input data-targets="batch-deferred-content.inputs" type="hidden" name="commit_oid" value="f000001">
//   </form>
//
// Example Request
//
//   POST /my/batched/content/endpoint
//   BODY {
//     authenticity_token: "AUTH_TOKEN",
//     items: {
//       item-0: {repo_id: 42, commit_oid: "abcdef0"},
//       item-1: {repo_id: 88, commit_oid: "f000001"},
//     }
//   }
//
// Example Response
//
//   Content-Type: application/json
//   BODY {
//     item-0: "<div>Some markup</div>",
//     item-1: "<div>More markup</div>",
//   }

import {attr, controller, targets} from '@github/catalyst'
import {parseHTML} from '../parse-html'

class AutoFlushingQueue<T = HTMLElement> {
  timeout: number
  limit: number
  elements: T[] = []
  timer: number | null = null
  callbacks: Array<(elementsToFlush: T[]) => Promise<void>> = []
  csrf: string | null = null

  constructor(timeout = 50, limit = 30) {
    this.timeout = timeout // flush timeout in milliseconds
    this.limit = limit // max number of elements before autoflushing
  }

  push(element: T): void {
    if (this.timer) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    if (element instanceof HTMLElement) {
      const csrfInput = element.querySelector<HTMLInputElement>('[data-csrf]')
      if (csrfInput !== null) {
        this.csrf = csrfInput.value
      }
    }
    if (this.elements.length >= this.limit) {
      this.flush()
    }

    this.elements.push(element)
    this.timer = window.setTimeout(() => {
      this.flush()
    }, this.timeout)
  }

  onFlush(callback: (elementsToFlush: T[]) => Promise<void>): void {
    this.callbacks.push(callback)
  }

  private async flush(): Promise<void> {
    const elementsToFlush = this.elements.splice(0, this.limit)
    if (elementsToFlush.length === 0) return

    await Promise.all(this.callbacks.map(callback => callback(elementsToFlush)))
  }
}

async function fetchContents(url: string, formData: FormData): Promise<Map<string, string>> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })

  if (response.ok) {
    const json = await response.json()
    const map = new Map<string, string>()
    for (const key in json) {
      map.set(key, json[key])
    }
    return map
  } else {
    return new Map()
  }
}

const queues: Map<string, AutoFlushingQueue<BatchDeferredContentElement>> = new Map()

@controller
class BatchDeferredContentElement extends HTMLElement {
  @attr url = ''
  @targets inputs: HTMLInputElement[]

  connectedCallback() {
    this.queue.push(this)
  }

  get queue(): AutoFlushingQueue<BatchDeferredContentElement> {
    let q = queues.get(this.url)
    if (q) {
      return q
    } else {
      q = this.buildAutoFlushingQueue()
      queues.set(this.url, q)
      return q
    }
  }

  private buildAutoFlushingQueue() {
    const autoFlushingQueue = new AutoFlushingQueue<BatchDeferredContentElement>()
    autoFlushingQueue.onFlush(async elements => {
      const elementsByKey: Map<string, BatchDeferredContentElement> = new Map()
      const consolidatedData = new FormData()

      // set CSRF token if available
      if (autoFlushingQueue.csrf !== null) {
        // eslint-disable-next-line github/authenticity-token
        consolidatedData.set('authenticity_token', autoFlushingQueue.csrf)
      }

      for (const index in elements) {
        const batchElement = elements[index]
        const key = `item-${index}`
        elementsByKey.set(key, batchElement)

        for (const input of batchElement.inputs) {
          consolidatedData.append(`items[${key}][${input.name}]`, input.value)
        }
      }

      const contentsMap = await fetchContents(this.url, consolidatedData)
      for (const [key, content] of contentsMap.entries()) {
        const batchElement = elementsByKey.get(key)!
        batchElement.replaceWith(parseHTML(document, content))
      }
    })

    return autoFlushingQueue
  }
}
