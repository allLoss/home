// Toggler Behavior
//
// target    - Element with a ".js-toggler-target" class name, clicking
//             triggers toggle.
// container - Element with a ".js-toggler-container" class name,
//             contains one or more targets.
//
// The toggle state is defined as "off" or "on". A ".on" class name is
// added to the container when the state is "on". ".on" is removed if
// the state is "off".
//
// Some extra AJAX states are available if any target makes use of
// `data-remote`.
//
// loading - Added to the container before the request is sent and
//           after it finishes.
// success - Added to the container after a successful response
//           returns.
// error   - Added to the container after any bad responses.
//
// Examples
//
//   .starring-container .unstarred { display: block; }
//   .starring-container.on .unstarred { display: none; }
//   .starring-container .starred { display: none; }
//   .starring-container.on .starred { display: block; }
//
//   <div class="js-toggler-container starring-container">
//     <button type="button" href="#" class="starred js-toggler-target">Unstar repository</button>
//     <button type="button" class="unstarred js-toggler-target">Star repository</button>
//   </div>
//

import {on} from 'delegated-events'
import {remoteForm} from '@github/remote-form'

on('click', '.js-toggler-container .js-toggler-target', function (event) {
  // Ignore right-click events.
  if (event.button !== 0) return

  const container = event.currentTarget.closest('.js-toggler-container')
  if (container) container.classList.toggle('on')
})

remoteForm('.js-toggler-container', async (form, wants) => {
  form.classList.remove('success', 'error')
  form.classList.add('loading')

  try {
    await wants.text()
    form.classList.add('success')
  } catch (responseError) {
    form.classList.add('error')
  } finally {
    form.classList.remove('loading')
  }
})
