# Stacks Wallet Kit Demo Extension

A minimal Chrome extension playground for testing the Stacks Wallet Kit SDK. This demo extension provides a UI to interact with the SDK and test various wallet operations.

## Features

- SDK initialization and configuration
- Google OAuth authentication
- Wallet creation and management
- Account management
- STX transactions
- Real-time logging of SDK operations

## Prerequisites

- Node.js 18+ and npm/pnpm
- Google OAuth credentials (Client ID and Client Secret)
- Chrome or Chromium-based browser

## Required Polyfills

The SDK requires Node.js polyfills to work in the browser environment. This extension includes the necessary setup:

### Buffer Polyfill

The SDK uses Node.js `Buffer` which is not available in browsers. This extension includes:

1. **Package dependency**: `buffer` (already in `package.json`)
2. **Vite alias**: Configured in `vite.config.ts` to resolve `buffer` imports
3. **Global setup**: Buffer is made available globally in the entry point

**Required configuration in `vite.config.ts`:**

```typescript
resolve: {
  alias: {
    buffer: 'buffer',
  },
},
define: {
  global: 'globalThis',
  'process.env': {},
},
```

**Required setup in your entry point (e.g., `playground.tsx`):**

```typescript
import { Buffer } from 'buffer'

// Make Buffer available globally
if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(globalThis as any).Buffer = Buffer
}
```

**Install the polyfill package:**

```bash
npm install buffer
```

Without these polyfills, you'll encounter errors like `ReferenceError: Buffer is not defined`.

## Setup

1. **Install dependencies:**

```bash
npm install
# or
pnpm install
```

2. **Configure Google OAuth credentials:**

Create a `.env` file in the extension directory (or set environment variables):

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Note:** For Chrome extensions, you'll need to:

- Create a project in [Google Cloud Console](https://console.cloud.google.com/)
- Enable the Google+ API
- Create OAuth 2.0 credentials
- Add the extension's redirect URI (chrome-extension://YOUR_EXTENSION_ID/) to authorized redirect URIs

3. **Build the extension:**

```bash
npm run build
# or
pnpm build
```

For development with watch mode:

```bash
npm run dev
# or
pnpm dev
```

4. **Load the extension in Chrome:**

- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (toggle in top right)
- Click "Load unpacked"
- Select the `dist` folder from this directory
- Note the extension ID (you'll need this for the redirect URI)

5. **Update Google OAuth redirect URI:**

- Go back to Google Cloud Console
- Edit your OAuth 2.0 credentials
- Add the redirect URI: `chrome-extension://YOUR_EXTENSION_ID/`
- The redirect URI format is: `https://YOUR_EXTENSION_ID.chromiumapp.org/`

## Usage

1. **Open the playground:**
   - Click the extension icon in Chrome toolbar
   - Click "Open Playground" button
   - Or right-click the extension icon → "Options"

2. **Initialize the SDK:**
   - Click "Initialize SDK" button
   - Check the logs to confirm initialization

3. **Sign in:**
   - Click "Sign In with Google"
   - Complete the OAuth flow

4. **Create or load a wallet:**
   - Enter a mnemonic phrase (or use the default test mnemonic)
   - Enter an encryption password
   - Click "Create Wallet" or "Load Wallet"

5. **Test transactions:**
   - Enter recipient address and amount
   - Click "Send STX" to test transactions

## Project Structure

```
demo/extension/
├── src/
│   ├── background.ts          # Background service worker
│   ├── playground.tsx         # Main playground React component
│   ├── playground.html        # Playground HTML page
│   ├── popup.html             # Extension popup
│   └── lib/
│       └── sdk.ts             # SDK initialization
├── public/                    # Static assets
├── manifest.json              # Chrome extension manifest
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Development

The extension uses:

- **Vite** for building and bundling
- **React** for the playground UI
- **TypeScript** for type safety
- **@degenlab/stacks-wallet-kit-extension** and **@degenlab/stacks-wallet-kit-core** from npm
- **buffer** polyfill for Node.js compatibility

### Build Commands

- `npm run dev` - Build in watch mode for development
- `npm run build` - Build for production
- `npm run preview` - Preview the built extension

### Notes

- The extension uses Manifest V3
- SDK is configured for Devnet by default (localhost:3999)
- All SDK operations are logged in the playground UI
- The extension requires `storage`, `identity`, and `activeTab` permissions

## Troubleshooting

**SDK initialization fails:**

- Check that Google OAuth credentials are set correctly
- Verify the redirect URI matches your extension ID
- Check browser console for detailed error messages

**Build errors:**

- Ensure all dependencies are installed (including `buffer` polyfill)
- Check Node.js version (18+ required)
- Clear `node_modules` and reinstall if needed

**"Buffer is not defined" errors:**

- Ensure `buffer` package is installed: `npm install buffer`
- Verify Buffer is imported and set globally in your entry point
- Check that `vite.config.ts` has the buffer alias configured
- Ensure `global: 'globalThis'` is in the `define` section of vite config

**Extension won't load:**

- Verify the `dist` folder exists after building
- Check that `manifest.json` is in the `dist` folder
- Review Chrome extension error messages in `chrome://extensions/`

## License

ISC
