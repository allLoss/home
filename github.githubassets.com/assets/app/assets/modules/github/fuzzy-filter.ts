// Example
// ```js
//     fuzzyScore("foo.html", "foo")
//     // => 0.6458333333333334
// ```
//
// ```js
//     // Compute re once
//     re = fuzzyRegexp("foo")
//     fuzzyScore("foo.html", re)
//     fuzzyScore("bar.html", re)
//     // => 0.6458333333333334
// ```
//
// Returns a number between 0 and 1. 0 being the worst match and 1
// being an exact match.
export function fuzzyScore(string: string, query: string): number {
  let score = stringScore(string, query)
  if (score && query.indexOf('/') === -1) {
    const basename = string.substring(string.lastIndexOf('/') + 1)
    score += stringScore(basename, query)
  }
  return score
}

// Create a regexp that can be used to fuzzy match a given string. Any
// special regexp characters in the input string will be escaped
// correctly.
//
// A query of "bar" becomes /(.*)(b)([^a]*?)(a)([^r]*?)(r)(.*?)/.
//
// /
//  (.*)     whatever's before the first b
//  (b)      grab the first b of bar
//  ([^a]*?) take everything up to the a of bar
//  (a)      take the a of bar
//  ([^r]*?) take everything up to the r of bar
//  (r)      take the r of bar
//  (.*?)    take the rest of the string
// /
export function fuzzyRegexp(query: string): RegExp {
  const chars = query.toLowerCase().split('')

  let regex = ''

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    // must escape these chars so we match literals
    const c = char.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')
    if (i === 0) {
      // for the first we want to greedily match anything, which pushes
      // the first match as late as possible in the string
      regex += `(.*)(${c})`
    } else {
      regex += `([^${c}]*?)(${c})`
    }
  }
  return new RegExp(`${regex}(.*?)$`, 'i')
}

export function fuzzyHighlightElement(content: Element, text?: string, textRe?: RegExp): void {
  if (text) {
    const matches = content.innerHTML.trim().match(textRe || fuzzyRegexp(text))
    if (!matches) return

    let open = false
    const html = []
    for (let i = 1; i < matches.length; ++i) {
      const m = matches[i]
      if (!m) continue

      if (i % 2 === 0) {
        if (!open) {
          // eslint-disable-next-line github/unescaped-html-literal
          html.push('<mark>')
          open = true
        }
      } else if (open) {
        html.push('</mark>')
        open = false
      }
      html.push(m)
    }
    content.innerHTML = html.join('')
  } else {
    const html = content.innerHTML.trim()
    const clean = html.replace(/<\/?mark>/g, '')
    if (html !== clean) {
      content.innerHTML = clean
    }
  }
}

// string_score.js: Quicksilver-like string scoring algorithm.
//  https://raw.github.com/joshaven/string_score/master/coffee/string_score.coffee
//
// Copyright (C) 2009-2011 Joshaven Potter <yourtech@gmail.com>
// Copyright (C) 2010-2011 Yesudeep Mangalapilly <yesudeep@gmail.com>
// MIT license: http://www.opensource.org/licenses/mit-license.php
//
// A string score implementation.
function stringScore(originalString: string, abbreviation: string): number {
  let string = originalString
  if (string === abbreviation) {
    return 1.0
  }
  const stringLength = string.length
  let totalCharacterScore = 0.0
  let shouldAwardCommonPrefixBonus = 0
  for (let i = 0; i < abbreviation.length; i++) {
    const c = abbreviation[i]
    const indexCLowercase = string.indexOf(c.toLowerCase())
    const indexCUppercase = string.indexOf(c.toUpperCase())
    const minIndex = Math.min(indexCLowercase, indexCUppercase)
    const indexInString = minIndex > -1 ? minIndex : Math.max(indexCLowercase, indexCUppercase)
    if (indexInString === -1) {
      return 0.0
    }
    totalCharacterScore += 0.1
    if (string[indexInString] === c) {
      totalCharacterScore += 0.1
    }
    if (indexInString === 0) {
      totalCharacterScore += 0.8
      if (i === 0) {
        shouldAwardCommonPrefixBonus = 1
      }
    }
    if (string.charAt(indexInString - 1) === ' ') {
      totalCharacterScore += 0.8
    }
    string = string.substring(indexInString + 1, stringLength)
  }
  const abbreviationLength = abbreviation.length
  const abbreviationScore = totalCharacterScore / abbreviationLength
  let finalScore = (abbreviationScore * (abbreviationLength / stringLength) + abbreviationScore) / 2
  if (shouldAwardCommonPrefixBonus && finalScore + 0.1 < 1) {
    finalScore += 0.1
  }
  return finalScore
}

export type TextScore = {score: number; text: string}
export function compare(a: TextScore, b: TextScore): -1 | 0 | 1 {
  if (a.score > b.score) {
    return -1
  } else if (a.score < b.score) {
    return 1
  } else if (a.text < b.text) {
    return -1
  } else if (a.text > b.text) {
    return 1
  } else {
    return 0
  }
}
