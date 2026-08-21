import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:3107' },
  webServer: {
    // Serve the real static export, exactly as a host would.
    command: 'npm run build && npx serve out -l 3107 --no-clipboard',
    url: 'http://127.0.0.1:3107/en/',
    reuseExistingServer: false,
    timeout: 240_000,
  },
})
