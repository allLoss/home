// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint github/no-then: off */
self.System =
  self.System ||
  (() => {
    const registry = {}
    const registryResolves = {}
    const stripHash = s => s.replace(/-[a-f0-9]{8,}\.js$/, '.js')
    const System = {
      register(deps, cb) {
        const moduleId = stripHash(
          `./${((document.currentScript || {}).src || '').split('?').shift().split('/').pop()}`
        )
        const exps = {}
        const collector = (id, obj) => (obj ? (exps[id] = obj) : Object.assign(exps, id))
        const module = cb(collector, System)
        const dependencies = deps.map((dep, i) => System.import(stripHash(dep)).then(module.setters[i]))
        registry[moduleId] = Promise.all(dependencies).then(() => {
          module.execute()
          return exps
        })
        if (registryResolves[moduleId]) {
          registryResolves[moduleId](registry[moduleId])
          delete registryResolves[moduleId]
        }
      },
      import(moduleId) {
        return (
          registry[moduleId] ||
          (registry[moduleId] = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`could not resolve ${moduleId}, timeout after 10 seconds`))
            }, 10000)

            const scriptTag = document.querySelector(`script[data-src][data-module-id="${moduleId}"]`)
            if (scriptTag) {
              scriptTag.setAttribute('src', scriptTag.getAttribute('data-src'))
              scriptTag.removeAttribute('data-src')
              scriptTag.addEventListener('error', () => {
                clearTimeout(timeout)
                reject(new Error(`could not resolve ${moduleId}, error loading the module`))
              })
            }

            registryResolves[moduleId] = exports => {
              clearTimeout(timeout)
              resolve(exports)
            }
          }))
        )
      }
    }
    return System
  })()
