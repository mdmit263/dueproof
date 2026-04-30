# ProofPilot

ProofPilot is a mobile-ready Progressive Web App for catching life-admin obligations before they become expensive problems.

## What It Does

- Captures messy emails, bills, notices, renewals, return windows, and reminders
- Extracts deadlines, money amounts, references, and missing information
- Scores risk by urgency and financial impact
- Creates action plans and a daily mission list
- Tracks resolved obligations
- Works as an installable app when hosted on HTTPS

## How To Make It Live

This is a static web app, so it can be hosted on:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- Firebase Hosting

## Important Mobile Install Note

The install button and offline app behavior work only when the site is served from:

- `https://your-domain.com`
- `http://localhost` during development

They do not fully work from `file://` because mobile browsers require a secure web origin for installable apps.

## Fastest Launch Path

1. Create a free Netlify or Vercel account.
2. Upload this folder as a static site.
3. Open the live HTTPS link on mobile.
4. Use the browser menu and choose "Add to Home Screen" or "Install App."

## Files

- `index.html` - app structure
- `styles.css` - responsive product UI
- `app.js` - local app logic
- `manifest.webmanifest` - mobile/PWA install metadata
- `sw.js` - offline service worker
- `icon.svg` - app icon
- `PRODUCT_STRATEGY.md` - business and product strategy
