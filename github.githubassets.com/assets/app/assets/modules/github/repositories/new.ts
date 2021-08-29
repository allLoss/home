import {fire, on} from 'delegated-events'
import {observe} from 'selector-observer'
import {onInput} from '../onfocus'

let changedPrivacyManually = false

function privateRepoSelected() {
  const el = document.querySelector<HTMLInputElement>('.js-privacy-toggle:checked')!
  return el.value === 'private'
}

function handleOwnerChange() {
  const name = document.querySelector<HTMLElement>('.js-repo-name')!
  // Trigger auto-check to ensure repo name is available under the new org selected
  fire(name, 'input')

  const selectedOwner = document.querySelector<HTMLElement>('.js-owner-container [aria-checked="true"]')!

  const allowPublicRepos = selectedOwner.getAttribute('data-org-allow-public-repos') !== 'false'
  const publicRadio = document.querySelector<HTMLInputElement>('.js-privacy-toggle[value=public]')!
  const publicLabel = document.querySelector<HTMLElement>('.js-privacy-toggle-label-public')
  const publicDescription = document.querySelector<HTMLElement>('.js-public-description')
  const publicRestrictedByPolicyDescription = document.querySelector<HTMLElement>(
    '.js-public-restricted-by-policy-description'
  )
  enableDisableRepoType(
    allowPublicRepos,
    publicRadio,
    publicLabel,
    publicDescription,
    publicRestrictedByPolicyDescription
  )

  const businessId = selectedOwner.getAttribute('data-business-id')
  const internalRadio = updateInternalDiv(businessId, selectedOwner)

  const allowPrivateRepos = selectedOwner.getAttribute('data-org-allow-private-repos') !== 'false'
  const privateRadio = document.querySelector<HTMLInputElement>('.js-privacy-toggle[value=private]')!
  const privateLabel = document.querySelector<HTMLElement>('.js-privacy-toggle-label-private')
  const privateDescription = document.querySelector<HTMLElement>('.js-private-description')
  const privateRestrictedByPolicyDescription = document.querySelector<HTMLElement>(
    '.js-private-restricted-by-policy-description'
  )
  enableDisableRepoType(
    allowPrivateRepos,
    privateRadio,
    privateLabel,
    privateDescription,
    privateRestrictedByPolicyDescription
  )

  // Display upgrade/upsell for private repos when relevant
  hideOrgUpgradeLinks()
  const privateRestrictedByPlan = selectedOwner.getAttribute('data-org-private-restricted-by-plan') !== 'false'
  const upgradePrivateDescription = document.querySelector<HTMLElement>('.js-upgrade-private-description')
  const displayUpsell = selectedOwner.getAttribute('data-org-show-upgrade') !== 'false'
  const orgName = selectedOwner.getAttribute('data-org-name')
  const orgUpgradeLink = orgName ? document.querySelector<HTMLElement>(`a[data-upgrade-link="${orgName}"]`) : null
  const askOwnerMessage = document.querySelector<HTMLElement>('.js-ask-owner-message')
  if (allowPrivateRepos || !privateRestrictedByPlan) {
    if (upgradePrivateDescription) upgradePrivateDescription.hidden = true
    if (orgUpgradeLink) orgUpgradeLink.hidden = true
    if (askOwnerMessage) askOwnerMessage.hidden = true
  } else {
    if (privateRestrictedByPolicyDescription) privateRestrictedByPolicyDescription.hidden = privateRestrictedByPlan
    if (upgradePrivateDescription) upgradePrivateDescription.hidden = false
    if (orgUpgradeLink) orgUpgradeLink.hidden = !displayUpsell
    if (askOwnerMessage) askOwnerMessage.hidden = displayUpsell
  }

  // Handle default branch name based on owner setting
  const defaultNewRepoBranch = selectedOwner.getAttribute('data-default-new-repo-branch')
  const defaultNewRepoBranchDescription = document.querySelector<HTMLElement>('.js-new-repo-owner-default-branch')
  if (defaultNewRepoBranchDescription) {
    defaultNewRepoBranchDescription.textContent = defaultNewRepoBranch
  }
  const settingsLinkPrefix = selectedOwner.getAttribute('data-owner-settings-link-prefix')
  const settingsLinkPrefixDescription = document.querySelector<HTMLElement>('.js-new-repo-owner-settings-link-prefix')
  if (settingsLinkPrefixDescription) {
    settingsLinkPrefixDescription.textContent = settingsLinkPrefix
  }
  const settingsUrl = selectedOwner.getAttribute('data-owner-settings-url')
  const settingsLinkContainer = document.querySelector<HTMLElement>(
    '.js-repo-owner-default-branch-settings-link-container'
  )
  const orgSettingsInfoContainer = document.querySelector<HTMLElement>(
    '.js-org-repo-owner-default-branch-settings-info'
  )
  if (settingsUrl) {
    const settingsLink = document.querySelector<HTMLAnchorElement>('.js-new-repo-owner-settings-link')
    if (settingsLink) {
      settingsLink.href = settingsUrl
      if (settingsLinkContainer) {
        settingsLinkContainer.hidden = false
      }
    }
    if (orgSettingsInfoContainer) {
      orgSettingsInfoContainer.hidden = true
    }
  } else if (settingsLinkContainer) {
    settingsLinkContainer.hidden = true
    if (orgSettingsInfoContainer) {
      const ownerIsAnOrg = selectedOwner.hasAttribute('data-viewer-is-org-admin')
      orgSettingsInfoContainer.hidden = !ownerIsAnOrg
    }
  }

  // Handle trade restrictions on private repos
  const tradeRestricted = selectedOwner.getAttribute('data-org-show-trade-controls') === 'true'
  const viewerIsOrganizationAdmin = selectedOwner.getAttribute('data-viewer-is-org-admin') === 'true'
  const individualTradeRestricted = selectedOwner.getAttribute('data-user-show-trade-controls') === 'true'
  const orgRestrictedWithoutPrivateRepos = tradeRestricted && !allowPrivateRepos
  const tradeControlsDescription = document.querySelector<HTMLElement>('.js-trade-controls-description')
  const individualTradeControlsDescription = document.querySelector<HTMLElement>(
    '.js-individual-trade-controls-description'
  )
  // Hide all the plan/org policy stuff if there is a trade restriction in place.
  if (individualTradeRestricted || orgRestrictedWithoutPrivateRepos) {
    const showPolicyTextForOrgMember =
      !individualTradeRestricted && !viewerIsOrganizationAdmin && orgRestrictedWithoutPrivateRepos

    if (privateRestrictedByPolicyDescription) {
      // we are are making an exception here to show the policy text for org non-admins
      if (showPolicyTextForOrgMember) {
        privateRestrictedByPolicyDescription.hidden = false
      } else {
        privateRestrictedByPolicyDescription.hidden = true
      }
    }

    // Hide/Disable the rest
    privateRadio.disabled = true
    if (privateDescription) privateDescription.hidden = true
    if (upgradePrivateDescription) upgradePrivateDescription.hidden = true
    if (orgUpgradeLink) orgUpgradeLink.hidden = true
    if (askOwnerMessage) askOwnerMessage.hidden = true
  } else {
    // Hide all previously displayed trade restriction texts
    if (tradeControlsDescription) tradeControlsDescription.hidden = true
    if (individualTradeControlsDescription) individualTradeControlsDescription.hidden = true
  }
  // If both individual and org are restricted, prefer the individual message.
  // If only the org is restricted, show that.
  if (individualTradeRestricted) {
    if (tradeControlsDescription) tradeControlsDescription.hidden = true
    if (individualTradeControlsDescription) individualTradeControlsDescription.hidden = false
  } else if (orgRestrictedWithoutPrivateRepos) {
    if (tradeControlsDescription) {
      // we only want to show the OFAC text to org admins
      if (viewerIsOrganizationAdmin) {
        tradeControlsDescription.hidden = false
      } else {
        tradeControlsDescription.hidden = true
      }
    }
  }

  ensureOneRadioIsSelected(selectedOwner, publicRadio, internalRadio, privateRadio)
  togglePermissionFields(selectedOwner.getAttribute('data-permission') === 'yes')
  updateUpsell()
  handlePrivacyChange()

  const quickInstallContainer = document.querySelector('.js-quick-install-container')
  if (quickInstallContainer) {
    const quickInstallDivider = quickInstallContainer.querySelector<HTMLElement>('.js-quick-install-divider')!
    quickInstallDivider.hidden = true
    const owner = document.querySelector<HTMLInputElement>('input[name=owner]:checked')!
    const ownerParent = owner.parentElement
    if (ownerParent) {
      const installList = ownerParent.querySelector('.js-quick-install-list-template')
      if (installList instanceof HTMLTemplateElement) {
        const quickInstallDestination = quickInstallContainer.querySelector<HTMLElement>('.js-account-apps')!
        quickInstallDestination.innerHTML = ''
        quickInstallDestination.append(installList.content.cloneNode(true))
        if (installList.children.length > 0) {
          quickInstallDivider.hidden = false
        }
      }
    }
  }
}

function enableDisableRepoType(
  enabled: boolean,
  radio: HTMLInputElement | null,
  label: HTMLElement | null,
  description: HTMLElement | null,
  restrictedDescription: HTMLElement | null
) {
  if (enabled) {
    if (radio) radio.disabled = false
    if (label) label.classList.remove('color-text-tertiary')
    if (description) description.hidden = false
    if (restrictedDescription) restrictedDescription.hidden = true
  } else {
    if (radio) radio.disabled = true
    if (label) label.classList.add('color-text-tertiary')
    if (description) description.hidden = true
    if (restrictedDescription) restrictedDescription.hidden = false
  }
}

function hideOrgUpgradeLinks() {
  const visibleOrgUpgradeLinks = document.querySelectorAll<HTMLElement>('.js-org-upgrade-link:not([hidden=""]')
  for (const visibleOrgUpgradeLink of visibleOrgUpgradeLinks) {
    visibleOrgUpgradeLink.hidden = true
  }
}

function ensureOneRadioIsSelected(
  selectedOwner: HTMLElement,
  publicRadio: HTMLInputElement | null,
  internalRadio: HTMLInputElement | null,
  privateRadio: HTMLInputElement
) {
  // Determine the best default visibility to select based on the org's default and what's enabled.
  let selectRadio = null
  if (selectedOwner.getAttribute('data-default') === 'private' && !privateRadio.disabled) selectRadio = privateRadio
  else if (selectedOwner.getAttribute('data-default') === 'internal' && internalRadio && !internalRadio.disabled)
    selectRadio = internalRadio
  else if (publicRadio && !publicRadio.disabled) selectRadio = publicRadio
  else if (internalRadio && !internalRadio.disabled) selectRadio = internalRadio

  // Not possible because orgs with no enabled visibilities can't be selected, but flow doesn't know that so here we are.
  if (!selectRadio) return

  // Is a disabled option currently selected?
  const disabledSelected =
    (publicRadio && publicRadio.disabled && publicRadio.checked) ||
    (privateRadio.disabled && privateRadio.checked) ||
    (internalRadio && internalRadio.disabled && internalRadio.checked)

  // Are none of the visible options currently selected?
  const noneSelected =
    (!publicRadio || !publicRadio.checked) && (!internalRadio || !internalRadio.checked) && !privateRadio.checked

  // If the user hasn't manually changed visibility or we're in an invalid state, either because
  //  nothing is selected or a disabled option is selected, select the best available default.
  if (changedPrivacyManually === false || disabledSelected === true || noneSelected === true) {
    selectRadio.checked = true
    fire(selectRadio, 'change')
  }
}

// Display only the currently selected org's internal repos div, if any, and
// update its enabled/disabled state and labels.
function updateInternalDiv(businessId: string | null, selectedOwner: HTMLElement): HTMLInputElement | null {
  let internalSelected = false
  // Hide all internal divs
  const divs = document.querySelectorAll<HTMLElement>('.js-new-repo-internal-visibility')
  for (const div of divs) {
    div.hidden = true
    const internalRadio = div.querySelector('.js-privacy-toggle[value=internal]')
    // Preserve selection of Internal if we're hiding one and showing another.
    if (internalRadio instanceof HTMLInputElement && internalRadio.checked) internalSelected = true
  }

  if (businessId) {
    const selectedDiv = document.querySelector<HTMLElement>(`#new-repo-internal-visibility-${businessId}`)
    if (selectedDiv) {
      selectedDiv.hidden = false

      const label = selectedDiv.querySelector('.js-privacy-toggle-label-internal')
      const description = selectedDiv.querySelector<HTMLElement>('.js-internal-description')
      const restrictedByPolicyDescription = selectedDiv.querySelector<HTMLElement>(
        '.js-internal-restricted-by-policy-description'
      )

      const internalRadio = selectedDiv.querySelector('.js-privacy-toggle[value=internal]')
      if (internalRadio instanceof HTMLInputElement) {
        if (selectedOwner.getAttribute('data-org-allow-internal-repos') === 'false') {
          internalRadio.disabled = true
          if (label) label.classList.add('color-text-tertiary')
          if (description) description.hidden = true
          if (restrictedByPolicyDescription) restrictedByPolicyDescription.hidden = false
        } else {
          // Preserve selection of Internal if we're hiding one and showing another.
          if (internalSelected) {
            internalRadio.checked = true
            fire(internalRadio, 'change')
          }
          internalRadio.disabled = false
          if (label) label.classList.remove('color-text-tertiary')
          if (description) description.hidden = false
          if (restrictedByPolicyDescription) restrictedByPolicyDescription.hidden = true
        }
        return internalRadio
      }
    }
  }
  return null
}

function togglePermissionFields(hasPermission: boolean) {
  for (const field of document.querySelectorAll<HTMLElement>('.js-with-permission-fields')) {
    field.hidden = !hasPermission
  }
  for (const field of document.querySelectorAll<HTMLElement>('.js-without-permission-fields')) {
    field.hidden = hasPermission
  }

  const erroredEl = document.querySelector<HTMLElement>('.errored')
  const warnEl = document.querySelector<HTMLElement>('dl.warn')
  if (erroredEl) erroredEl.hidden = !hasPermission
  if (warnEl) warnEl.hidden = !hasPermission
}

function handlePrivacyChange(event?: Event) {
  const upgradeUpsell = document.querySelector<HTMLElement>('#js-upgrade-container')
  if (!upgradeUpsell) return
  const billingSection = upgradeUpsell.querySelector('.js-billing-section')
  const checkbox = upgradeUpsell.querySelector<HTMLInputElement>('.js-confirm-upgrade-checkbox')

  let radio = event ? (event.target as HTMLInputElement) : null
  if (!radio) {
    radio = document.querySelector<HTMLInputElement>('.js-privacy-toggle:checked')!
  }

  if (radio.value === 'false') {
    upgradeUpsell.hidden = false
    if (billingSection) billingSection.classList.remove('has-removed-contents')
    if (checkbox) {
      checkbox.checked = true
    }
  } else {
    upgradeUpsell.hidden = true
    if (billingSection) billingSection.classList.add('has-removed-contents')
    if (checkbox) {
      checkbox.checked = false
    }
  }
  validate()
}

function updateUpsell() {
  const container = document.querySelector('#js-upgrade-container')
  if (!container) return

  const paymentMethodsForm = document.querySelector<HTMLElement>('#js-payment-methods-form')!
  // Return the contents of the container back into the payment methods form
  // Necessary so we have a clean slate when switching between user/org accounts
  if (container.firstElementChild) {
    paymentMethodsForm.appendChild(container.firstElementChild)
  }

  const owner = document.querySelector<HTMLInputElement>('input[name=owner]:checked')!.value
  const upgrade = paymentMethodsForm.querySelector(`.js-upgrade[data-login="${owner}"]`)
  if (upgrade) {
    container.appendChild(upgrade)
  }
}

function validate() {
  const form = document.querySelector<HTMLElement>('.js-repo-form')!
  const repoOwner = form.querySelector('.js-repository-owner-choice:checked')
  const repoName = form.querySelector('.js-repo-name')
  const repoUrl = form.querySelector('.js-repo-url')
  const gitignore = form.querySelector('.js-repo-gitignore')
  const license = form.querySelector('.js-repo-license')

  let valid = repoUrl ? !repoUrl.classList.contains('is-autocheck-errored') : true

  valid = valid && !!repoOwner

  if (valid && repoName) {
    valid = repoName.classList.contains('is-autocheck-successful')

    if (privateRepoSelected()) {
      valid = valid && validBillingInfo()
    }
  }

  if (gitignore && (gitignore as HTMLInputElement).checked) {
    const gitignoreTemplate = form.querySelector<HTMLInputElement>(
      'input[name="repository[gitignore_template]"]:checked'
    )!
    valid = valid && gitignoreTemplate.value !== ''
  }

  if (license && (license as HTMLInputElement).checked) {
    const licenseTemplate = form.querySelector<HTMLInputElement>('input[name="repository[license_template]"]:checked')!
    valid = valid && licenseTemplate.value !== ''
  }

  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!
  submit.disabled = !valid
}

function validBillingInfo() {
  const upgradeUpsell = document.querySelector('#js-upgrade-container')
  // When billing is not enabled, upgrade container won't exist so return true
  if (!upgradeUpsell) {
    return true
  }

  const sanctionedEl = upgradeUpsell.querySelector('.js-ofac-sanction-notice')
  if (sanctionedEl) {
    return false
  }

  const upsellCheckbox = upgradeUpsell.querySelector('.js-confirm-upgrade-checkbox')
  if (upsellCheckbox instanceof HTMLInputElement && !upsellCheckbox.checked) {
    return false
  }

  const billingInfoContainer = upgradeUpsell.querySelector('.js-zuora-billing-info')
  /* eslint-disable-next-line github/no-d-none */
  if (billingInfoContainer && billingInfoContainer.classList.contains('d-none')) {
    return false
  }

  return true
}

function onRepoInitSettingUnchecked(toggleCheckbox: HTMLInputElement) {
  const container = toggleCheckbox.closest('.js-repo-init-setting-container')
  if (!container) {
    return
  }
  const menuOptionForUnchecked = container.querySelector<HTMLInputElement>(
    '.js-repo-init-setting-unchecked-menu-option'
  )!

  if (!menuOptionForUnchecked.checked) {
    // Select the "None" option in the `details` menu, which
    // is the value that will be submitted in the form.
    menuOptionForUnchecked.checked = true
    fire(menuOptionForUnchecked, 'change')
  }
}

function onRepoInitNoneMenuOptionSelected(radio: HTMLInputElement) {
  const container = radio.closest('.js-repo-init-setting-container')
  if (!container) {
    return
  }
  const toggleCheckbox = container.querySelector<HTMLInputElement>('.js-toggle-repo-init-setting')!

  if (toggleCheckbox.checked) {
    // Uncheck the checkbox that toggles whether the `details` menu is shown.
    toggleCheckbox.checked = false
    fire(toggleCheckbox, 'change')
  }
}

function toggleDefaultBranchInfo(checkbox: HTMLInputElement) {
  const container = checkbox.closest<HTMLElement>('form')!
  const defaultBranchInfo = container.querySelector<HTMLElement>('.js-new-repo-default-branch-info')
  if (!defaultBranchInfo) {
    return
  }

  const checkedCheckboxes = container.querySelectorAll<HTMLInputElement>(
    '.js-toggle-new-repo-default-branch-info:checked'
  )
  const anyChecked = checkedCheckboxes.length > 0

  // Hide the info about what the default branch will be called if no
  // files are getting added for the user upon repo creation.
  defaultBranchInfo.hidden = !anyChecked
}

observe('#js-upgrade-container .js-zuora-billing-info:not(.d-none)', validate)

observe('.js-page-new-repo', function () {
  const upgradeContainer = document.querySelector<HTMLElement>('#js-upgrade-container')
  if (upgradeContainer) upgradeContainer.hidden = true
  handleOwnerChange()

  // Apply focus to the first form field in the DOM
  const form = document.querySelector<HTMLElement>('.js-repo-form')!
  const repoUrlInput = form.querySelector<HTMLInputElement>('.js-repo-url')
  if (repoUrlInput) {
    repoUrlInput.focus()
    return
  }
  const templateSelect = form.querySelector<HTMLElement>('.js-template-repository-select')
  if (templateSelect) {
    templateSelect.focus()
    return
  }
  const ownerSelect = form.querySelector<HTMLElement>('.js-owner-select')
  if (ownerSelect) ownerSelect.focus()
})

on('click', '.js-reponame-suggestion', function (event) {
  const field = document.querySelector<HTMLInputElement>('.js-repo-name')!
  field.value = event.currentTarget.textContent!
  fire(field, 'input', false)
})

on('click', '.js-privacy-toggle', function () {
  changedPrivacyManually = true
})

on('change', '.js-privacy-toggle', handlePrivacyChange)
on('details-menu-selected', '.js-owner-container', handleOwnerChange, {capture: true})

on('change', '#js-upgrade-container input', validate)
onInput('#js-upgrade-container input', validate)

const renderOrgProfileHint = (event: Event) => {
  const orgMessageElement = document.querySelector<HTMLElement>('.js-org-profile')
  if (orgMessageElement) {
    const ownerInput = document.querySelector<HTMLInputElement>(
      '.js-owner-container input.js-repository-owner-is-org:checked'
    )
    const input = event.target as HTMLInputElement
    const hideMessage = !(ownerInput && input.value.toLowerCase() === '.github')
    orgMessageElement.hidden = hideMessage
    const nameSuggestion = document.querySelector<HTMLElement>('#repo-name-suggestion')!
    nameSuggestion.hidden = !hideMessage
  }
}

const renderPersonalProfileHint = (event: Event) => {
  const messageElement = document.querySelector<HTMLElement>('.js-personal')
  if (messageElement) {
    const ownerInput = document.querySelector<HTMLInputElement>(
      '.js-owner-container input.js-repository-owner-is-viewer'
    )
    const input = event.target as HTMLInputElement
    const hideMessage = !(
      ownerInput &&
      ownerInput.checked &&
      ownerInput.defaultValue.toLowerCase() === input.value.toLowerCase()
    )
    messageElement.hidden = hideMessage
    const nameSuggestion = document.querySelector<HTMLElement>('#repo-name-suggestion')!
    nameSuggestion.hidden = !hideMessage
  }
}

// When the user is filling in the name of their repo, we give them
// specific hints if they're creating their profile repo or their
// org's .github repo
onInput('.js-owner-reponame .js-repo-name', function (event) {
  renderPersonalProfileHint(event)
  renderOrgProfileHint(event)

  validate()
})

on('auto-check-send', '.js-repo-name-auto-check', function (event) {
  const input = event.currentTarget as HTMLInputElement
  const form = input.form!
  const owner = form.querySelector<HTMLInputElement>('input[name=owner]:checked')!.value
  event.detail.body.append('owner', owner)
})

on('auto-check-complete', '#repository_name', function () {
  validate()
})

onInput('.js-repo-url', function (event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const formGroup = input.closest('.form-group')
  if (!(formGroup instanceof HTMLDListElement)) return

  const insecureUrlWarning = document.querySelector<HTMLElement>('.js-insecure-url-warning')!
  const svnProtocolError = document.querySelector<HTMLElement>('.js-svn-url-error')!
  const gitProtocolError = document.querySelector<HTMLElement>('.js-git-url-error')!

  const url = input.value.toLowerCase()

  insecureUrlWarning.hidden = !url.startsWith('http://')
  svnProtocolError.hidden = !url.startsWith('svn://')
  gitProtocolError.hidden = !url.startsWith('git://')

  if (url.startsWith('svn://') || url.startsWith('git://')) {
    input.classList.add('is-autocheck-errored')
    formGroup.classList.add('errored')
  } else {
    input.classList.remove('is-autocheck-errored')
    formGroup.classList.remove('errored')
  }

  validate()
})

// Monitor when one of the repo initialization options that requires an additional
// choice (e.g., .gitignore, license) is unchecked, indicating the user does not
// want to include that kind of file in their new repo.
on('change', '.js-toggle-repo-init-setting', evt => {
  const toggleCheckbox = evt.currentTarget as HTMLInputElement
  if (!toggleCheckbox.checked) {
    onRepoInitSettingUnchecked(toggleCheckbox)
  }

  validate()
})

// Monitor when the "None" menu option is selected for one of the repo initialization
// options like .gitignore or license.
on('change', '.js-repo-init-setting-unchecked-menu-option', evt => {
  const radio = evt.currentTarget as HTMLInputElement
  if (radio.checked) {
    onRepoInitNoneMenuOptionSelected(radio)
  }

  validate()
})

// Monitor when a menu option other than "None" is selected for one of the repo
// initialization options like .gitignore or license.
on('change', '.js-repo-init-setting-menu-option', validate)

// Monitor when repo initialization option for "Add a README" is toggled
on('change', '.js-repo-readme', validate)

// Monitor when any of the repo initialization options is toggled so that we can
// show a message about what the default branch will be if a readme, gitignore,
// or license file is added.
on('change', '.js-toggle-new-repo-default-branch-info', evt => {
  const checkbox = evt.currentTarget as HTMLInputElement
  toggleDefaultBranchInfo(checkbox)
})
