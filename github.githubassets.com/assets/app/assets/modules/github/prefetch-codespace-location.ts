import {on} from 'delegated-events'

export async function prefetchCodespaceLocation(form: HTMLFormElement, setLocationInputValue = true) {
  const locationInput = form.querySelector<HTMLInputElement>('[name="codespace[location]"]')!
  if (!locationInput || locationInput.value) return

  const submitButton = form.querySelector('button[type=submit]')
  if (submitButton instanceof HTMLInputElement) {
    submitButton.disabled = true
  }

  const locationsURL = form.getAttribute('data-codespace-locations-url')
  if (!locationsURL) return

  const locationJSON = await fetchLocationValues(locationsURL)
  if (setLocationInputValue && locationJSON) locationInput.value = locationJSON.current

  return locationJSON
}

export async function fetchLocationValues(url: string) {
  const response = await fetch(url, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json'
    }
  })
  if (!response.ok) {
    const responseError = new Error()
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    responseError.message = `HTTP ${response.status}${statusText}`
    throw responseError
  }
  return response.json()
}

on('submit', '.js-prefetch-codespace-location', async function (event) {
  const form = event.currentTarget as HTMLFormElement

  event.preventDefault()
  await prefetchCodespaceLocation(form)
  form.submit()
})
