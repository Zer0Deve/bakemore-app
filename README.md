# Bake More

A responsive React + Tailwind storefront for a small-batch cake shop. The catalog, search, filters, cart, and demo checkout work without a backend. Google sign-in and cross-device profile/cart/order history use Firebase Authentication and Cloud Firestore.

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

For guest mode, leave `.env` empty. The cart and demo orders are stored in that browser. To enable Google accounts:

1. Create a Firebase project and register a web app.
2. Enable **Authentication → Google** and create a **Cloud Firestore** database.
3. Copy the Firebase web app values into `.env` using the names in `.env.example`.
4. Publish the included `firestore.rules` to the project's Firestore database.
5. Add the deployed `Zer0Deve.github.io` origin under Firebase Authentication's **Authorized domains**.

The web config is intended for browser use. Firestore rules restrict each profile and its orders to the authenticated owner. Never put service-account keys in the frontend.

## GitHub Pages

The GitHub Actions workflow builds and deploys the `main` branch to Pages. In repository settings, enable Pages with **GitHub Actions** as the build and deployment source. Add the six `VITE_FIREBASE_*` repository Actions secrets to enable real Google sign-in in the hosted build; without them the storefront stays usable in guest mode.

Checkout is deliberately a demo flow: it creates a confirmed order record, but does not collect payment or arrange fulfillment.
