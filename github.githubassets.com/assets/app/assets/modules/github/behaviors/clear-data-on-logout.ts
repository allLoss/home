import {deleteCookie, getCookies} from '../cookies'

// This module detects a logout that has just occurred and clears browser data
// for the origin that might contain sensitive things such as localstorage.

// Set by lib/github/authentication/logout_result.rb on logout
export const JustLoggedOutCookieName = 'logout-was-successful'

function clearData() {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.clear()
    } catch {
      // ignore failure to clear
    }
  }
}

export function clearDataIfJustLoggedOut() {
  if (getCookies(JustLoggedOutCookieName).length > 0) {
    clearData()
    deleteCookie(JustLoggedOutCookieName)
  }
}

clearDataIfJustLoggedOut()
