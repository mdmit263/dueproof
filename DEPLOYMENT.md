# Deploy DueProof

## Best Option For Fast Public Launch: Netlify Drop

Use this if you want the fastest public link.

1. Go to Netlify.
2. Sign in.
3. Choose "Add new site" or "Deploy manually."
4. Upload this project folder.
5. Netlify gives you a public HTTPS link.
6. Open that link on your phone.
7. Choose "Add to Home Screen" or "Install App."

## Best Option For A Real Startup: Vercel Or GitHub Pages

Use this when the code is connected to a GitHub repository.

1. Create a GitHub repository.
2. Upload these files.
3. Connect the repository to Vercel or Netlify.
4. Every code change can auto-deploy.
5. Add a custom domain later, such as `dueproof.ai`.

## Why HTTPS Matters

Mobile installation requires a secure origin. That means the app must be served through HTTPS. Opening `index.html` directly from your computer is useful for testing, but it is not enough for public mobile installation.

## What To Test After Deploying

- The dashboard loads on mobile.
- The app can capture a pasted bill or renewal email.
- The "Load demo" button works.
- The app icon appears when installed.
- Refreshing the app keeps saved obligations.
- The browser does not show security warnings.

## Privacy Reminder

This prototype stores data in the user's browser storage. For a real public product, add:

- account login
- encrypted cloud sync
- clear privacy policy
- data deletion controls
- secure backend
- audit logs for sensitive actions
