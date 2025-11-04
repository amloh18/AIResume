# Updating Extension Icons

## Generate New Icons

To update the extension icons with the CVCircle logo design:

```bash
cd chrome-extension
node create-cvcircle-icons.js
```

This will generate:
- `icons/icon16.png`
- `icons/icon32.png`
- `icons/icon48.png`
- `icons/icon128.png`

## Icon Design

The icons feature:
- **Lime green square background** (#80FF00)
- **Shield icon with white document** inside
- **Dark charcoal background** (#2E3230) for contrast
- Matches the official CVCircle logo design

## Requirements

- Node.js
- `sharp` package (already in package.json)

## After Generation

1. Icons are automatically saved to `chrome-extension/icons/`
2. Reload the extension in Chrome to see new icons
3. Icons appear in:
   - Extension toolbar
   - Extension management page
   - Chrome Web Store (if published)

