# JSON PDF Designer

`json-pdf-designer` is an Angular 17 application for building browser-printable, page-aware Thymeleaf forms from JSON data.

It is designed for teams that receive a payload, need to arrange it into an accessible A4 form, and want to export HTML that can be handed to a Thymeleaf-based server application.

## What The App Does

- Loads a flat JSON object and turns primitive keys into draggable field blocks
- Lets you combine JSON-backed fields with manual content blocks such as sections, notes, declarations, links, dividers, and page breaks
- Previews the form as a multi-page A4 document in the browser
- Exports printable Thymeleaf HTML with page wrappers, headers, footers, field alignment, and validation attributes
- Saves themes and templates to local storage for reuse

## Workspace Overview

The UI is organized into four setup areas and a three-panel workspace:

- `Data`: template name, JSON source, and layout mode
- `Layout`: global field alignment, page settings, pagination, and per-page header/footer controls
- `Theme`: visual customization for colors, radius, and typography
- `Library`: local save/export/import for templates and themes

Main editing workspace:

- `Palette`: JSON fields, manual blocks, and page tools
- `Canvas`: block ordering and layout composition
- `Inspector / Output`: selected-block editing and generated Thymeleaf markup

## Development

Install dependencies once:

```bash
npm install
```

Run the local dev server:

```bash
npm start
```

Create a production build:

```bash
npm run build
```

Run the unit tests:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

## Key Files

- `src/app/app.component.ts`: main application state and workspace interactions
- `src/app/app.component.html`: builder, inspector, library, and preview studio UI
- `src/app/form-builder.models.ts`: block models, defaults, theme presets, and option lists
- `src/app/form-builder.renderer.ts`: page planning and final HTML generation
- `src/app/form-builder.sanitizers.ts`: shared normalization helpers for CSS-like values, fonts, and URLs

## Current Limitations

- Only flat JSON objects with primitive values are supported
- Pagination is estimate-based, not DOM-measured
- Templates and themes are stored locally in browser storage, not in a backend
- Export output is HTML for browser print / Thymeleaf workflows, not a native PDF renderer

## Quality Notes

Recent hardening in this repo includes:

- sanitized theme, page, and URL inputs before render/export
- sandboxed iframe preview for the live A4 studio
- renderer tests that protect CSS/font/URL normalization behavior

If the next goal is to move this closer to production grade, the highest-value follow-ups are nested JSON support, more accurate pagination, a component/service refactor, and broader test coverage around template import/export flows.
