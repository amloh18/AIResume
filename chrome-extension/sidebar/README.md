# CVCircle Extension Sidebar

React-based sidebar interface for the CVCircle browser extension.

## Development

```bash
cd chrome-extension/sidebar
npm install
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in `dist/` directory and should be copied to the extension root for use.

## Structure

- `src/` - React source files
- `src/components/` - React components
- `src/lib/` - Utility libraries (auth, API, job parser)
- `src/hooks/` - React hooks
- `src/styles/` - Global styles

## Features

- Authentication (email/password and 4-digit code)
- Job dashboard
- Job creation/editing
- Manual job entry
- Settings

