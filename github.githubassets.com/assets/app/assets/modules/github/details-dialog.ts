import {fire} from 'delegated-events'

type Options = {
  content: DocumentFragment | Promise<DocumentFragment> | Node
  dialogClass?: string
  detailsClass?: string
}

// Open the site-wide Details Dialog element.
export async function dialog(options: Options): Promise<HTMLElement> {
  const dialogTemplate = document.querySelector<HTMLTemplateElement>('#site-details-dialog')!
  const clonedDetails = dialogTemplate.content.cloneNode(true) as Element
  const details = clonedDetails.querySelector<HTMLElement>('details')!
  const detailsDialog = details.querySelector<HTMLElement>('details-dialog')!
  const spinner = details.querySelector<HTMLElement>('.js-details-dialog-spinner')!
  if (options.detailsClass) details.classList.add(...options.detailsClass.split(' '))
  if (options.dialogClass) detailsDialog.classList.add(...options.dialogClass.split(' '))

  document.body.append(clonedDetails)

  const content = await options.content
  spinner.remove()
  detailsDialog.prepend(content)

  details.addEventListener('toggle', () => {
    if (details.hasAttribute('open')) return
    fire(detailsDialog, 'dialog:remove')
    details.remove()
  })

  return detailsDialog
}
