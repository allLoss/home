// Flash
//
// Fades out and removes flash element from the page on close.
//
// Markup
//
//     <div class="flash-messages">
//       <div class="flash">
//         <%= octicon('x', :class => 'flash-close js-flash-close') %>
//         Flash Message
//       </div>
//     </div>
//

import {on} from 'delegated-events'

on('click', '.js-flash-close', function (event) {
  const container = event.currentTarget.closest('.flash-messages')

  const flash = event.currentTarget.closest('.flash')
  flash!.remove()

  if (container && !container.querySelector('.flash')) {
    container.remove()
  }
})
