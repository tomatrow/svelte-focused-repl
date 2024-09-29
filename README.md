# svelte-focused-repl

It's like the svelte repl, but more focused

https://svelte-focused-repl.tomatrow.com

## Features

- [x] focused editing
- [x] arbitrary npm imports via unpkg
- [x] iframe for live app
- [x] store source as base64 in url
- [x] pwa
  - [ ] fullscreen
- [ ] works well on mobile

## Todo

### 9/22/24

- [x] install @rollup/browser
- [x] add textarea for svelte code
- [x] generate svelte code from text input
- [x] actually run the component

### 9/23/24

- [x] bring under git
- [x] try to import `watch` from `runed`
  - well, didn't work, something about using runes outside
- [x] import `marked` from `marked`
  - this one did work

## Sources

- https://github.com/sveltejs/svelte/blob/main/sites/svelte-5-preview
- https://github.com/PuruVJ/neocodemirror
- https://github.com/joshnuss/use-svelte
- https://github.com/novacbn/svelte-simple-repl
