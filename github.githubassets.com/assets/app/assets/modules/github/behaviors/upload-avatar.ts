import {dialog} from '../details-dialog'
import {fetchSafeDocumentFragment} from '../fetch'
import {on} from 'delegated-events'

on('upload:setup', '.js-upload-avatar-image', function (event) {
  const {form} = event.detail
  const orgId = event.currentTarget.getAttribute('data-alambic-organization')
  const ownerType = event.currentTarget.getAttribute('data-alambic-owner-type')
  const ownerId = event.currentTarget.getAttribute('data-alambic-owner-id')
  if (orgId) {
    form.append('organization_id', orgId)
  }
  if (ownerType) {
    form.append('owner_type', ownerType)
  }
  if (ownerId) {
    form.append('owner_id', ownerId)
  }
})

on('upload:complete', '.js-upload-avatar-image', function (event) {
  const {attachment} = event.detail
  const url = `/settings/avatars/${attachment.id}`
  dialog({content: fetchSafeDocumentFragment(document, url)})
})
