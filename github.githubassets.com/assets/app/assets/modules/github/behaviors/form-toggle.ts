import {remoteForm} from '@github/remote-form'

remoteForm('.js-form-toggle-target', async function (form, wants) {
  try {
    await wants.text()
  } catch {
    return
  }

  const container = form.closest<HTMLElement>('.js-form-toggle-container')!
  container.querySelector<HTMLElement>('.js-form-toggle-target[hidden]')!.hidden = false
  form.hidden = true
})
