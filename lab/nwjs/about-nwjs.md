# NW.js

- https://nwjs.io/
- https://github.com/nwjs/nw.js

# summary

NW.js is patched chromium that can invoke scripts for node.js.

- boot with HTML script
  - run JS as BrowserContext
- special objects `nw` and `require`
  - `nw` can control window, menu, and system tray
  - `require` spawns node.js code as NodeContext
      - use objects/function stub between Browser/Node Contexts
- special tag `webview`
  - `iframe` with separated process (feature of chromium)
- devtools window (sdk version only)

Update policy

- Follow both node.js CURRENT and chromium Stable releases
  - both uses similar v8 versions (Electron uses very different v8s)

# install

- SDK version: `npm i nw@0.46.3-sdk`

Run `node_modules/.bin/nw` command  with `package.json` directory to 
launch a chromium window.

# Features

- `package.json` required
  - specify `name` and `main` HTML file
  - `chromium-args` for options
  - e.g. test directory has each `package.json` files for each test

- ES module
  - BrowserContext: use `type=module` and `import`
  - NodeContext: CJS with `require` only
    - node.js cannot use ES module from CJS modules

- JS sandbox
  - `webview`: load from HTTP URL HTML
  - `iframe`: can load from local file URL
  - communicate from the root context with `postMessage`
  - `indexeddb` enabled

