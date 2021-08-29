import {on} from 'delegated-events'

// Encrypt plain text with a public key.
async function encrypt(publicKey: Uint8Array, value: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(value)
  const {seal} = await import('../tweetsodium')
  return seal(messageBytes, publicKey)
}

// Decode base64 data into a byte array.
function decode(encoded: string): Uint8Array {
  const bytes = atob(encoded)
    .split('')
    .map(x => x.charCodeAt(0))
  return Uint8Array.from(bytes)
}

// Encode a byte array as a base64 string.
function encode(bytes: Uint8Array): string {
  let str = ''
  for (const byte of bytes) {
    str += String.fromCharCode(byte)
  }
  return btoa(str)
}

on('submit', 'form.js-encrypt-submit', async function (event) {
  const form = event.currentTarget as HTMLFormElement

  if (event.defaultPrevented || !form.checkValidity()) return
  const plainText = form.elements.namedItem('secret_value') as HTMLTextAreaElement

  // Prevent serializing plain text value in form submission.
  plainText.disabled = true

  if (!plainText.value) return

  event.preventDefault()

  // Submit encrypted value in hidden input.
  const publicKey = decode(form.getAttribute('data-public-key')!)

  ;(form.elements.namedItem('encrypted_value') as HTMLInputElement).value = encode(
    await encrypt(publicKey, plainText.value)
  )

  form.submit()
})
