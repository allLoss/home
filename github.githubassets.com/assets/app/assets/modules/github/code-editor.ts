import type {CodeEditor} from './editor/code-editor'
import {on} from 'delegated-events'

const editors: WeakMap<HTMLElement, CodeEditor> = new WeakMap()

export function getCodeEditor(el: HTMLElement): CodeEditor | undefined {
  return editors.get(el)
}

export async function getAsyncCodeEditor(el: HTMLElement): Promise<CodeEditor> {
  return editors.get(el) || onEditorFromEvent(await nextEvent(el, 'codeEditor:ready'))
}

function onEditorFromEvent(event: Event): CodeEditor {
  if (!(event instanceof CustomEvent)) throw new Error('assert: event is not a CustomEvent')
  const editor: CodeEditor = event.detail.editor
  if (!event.target) throw new Error('assert: event.target is null')
  editors.set(event.target as HTMLElement, editor)
  return editor
}

on('codeEditor:ready', '.js-code-editor', onEditorFromEvent)

function nextEvent(target: EventTarget, event: string): Promise<Event> {
  return new Promise(resolve => {
    target.addEventListener(event, resolve, {once: true})
  })
}
