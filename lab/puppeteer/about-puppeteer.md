# Puppeteer

- https://github.com/puppeteer/puppeteer

## install

- `npm i puppeteer`

## summary

Puppeteer is a nodejs library wrapping chromium devtools remote debug protocol.

- https://chromedevtools.github.io/devtools-protocol/

API depends on devtool protocol structures.

- target as browser context

## Feature

- mainly launch offscreen browser, but
  - can launch visible  browser windows with devtools
  - can attach existing remote chrome/chromium browser to control with scripts
    - modern versions. (can not connect legacy versions)
- It can use pure Web API runtime as BroserContext
  - no `webview` tag and others
- tiny support for window management
  - window minimize
  - cannot control window closing cancel, menu arrange, and so on


# playwright

- https://github.com/microsoft/playwright

## summary

Similar with puppeteer, but playwright is focus on controling browser runtime,
not depend on devtool protocol structure.

# Feature

- Use Chromium, Firefox, Safari(WebKit) rumtimes with same interface
  - can emulate smartphone browsers(android, ios) with these profiles
