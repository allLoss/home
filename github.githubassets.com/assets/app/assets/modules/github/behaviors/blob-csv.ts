import {onInput} from '../onfocus'

onInput('.js-csv-filter-field', function (event) {
  const query = (event.target as HTMLInputElement).value.toLowerCase()
  for (const row of document.querySelectorAll('.js-csv-data tbody tr')) {
    if (!(row instanceof HTMLElement)) continue
    if (!row.textContent) continue
    row.hidden = !!query && !row.textContent.toLowerCase().includes(query)
  }
})
