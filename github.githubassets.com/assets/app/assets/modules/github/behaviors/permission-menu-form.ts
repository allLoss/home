import {remoteForm} from '@github/remote-form'

remoteForm('.js-permission-menu-form', async function (form, wants) {
  const success = form.querySelector<HTMLElement>('.js-permission-success')!
  const error = form.querySelector<HTMLElement>('.js-permission-error')!

  success.hidden = true
  error.hidden = true
  form.classList.add('is-loading')

  let response
  try {
    response = await wants.json()
  } catch (e) {
    // If the request errored, we'll set the error state and return.
    form.classList.remove('is-loading')
    error.hidden = false
    return
  }

  form.classList.remove('is-loading')
  success.hidden = false

  const container = form.closest('.js-org-repo')
  if (container) {
    const data = response.json
    container.classList.toggle('with-higher-access', data['members_with_higher_access'])
  }
})
