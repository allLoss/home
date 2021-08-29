// Deal with selected_link_to on repository and gist pages
document.addEventListener('pjax:end', function () {
  const meta = document.querySelector('meta[name="selected-link"]')
  const selection = meta && meta.getAttribute('value')
  if (!selection) {
    return
  }
  for (const item of document.querySelectorAll('.js-sidenav-container-pjax .js-selected-navigation-item')) {
    const isSelected = (item.getAttribute('data-selected-links') || '').split(' ').indexOf(selection) >= 0
    isSelected ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current')
    item.classList.toggle('selected', isSelected)
  }
})
