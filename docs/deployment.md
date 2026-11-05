# Deploying SweepMate

SweepMate is a static Vite application. Build output lives in `dist/`; no backend, API keys, environment variables, or database are required.

**Production address:** [sweep-mate.vercel.app](https://sweep-mate.vercel.app/).

## Vercel through GitHub

1. Run `npm test`, `npm run lint`, and `npm run build` locally.
2. Review, commit, and push the changes yourself to the repository you want to deploy.
3. In Vercel, choose **Add New → Project** and import that repository.
4. Confirm the settings below and select **Deploy**.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | The folder containing `package.json`, normally `./` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x, matching `package.json`, `.nvmrc`, and CI |
| Environment variables | None |

Vercel supports Vite projects with framework detection. See the official [Vite on Vercel guide](https://vercel.com/docs/frameworks/frontend/vite). Subsequent pushes to the configured production branch create new deployments; confirm that branch in the project's Git settings.

The current app switches screens in React state and has no nested URL routes. It does not need an SPA catch-all rewrite for its present navigation. If URL-based routing is added later, revisit the hosting configuration.

`package.json` pins `engines.node` to `24.x`. This prevents an open-ended range such as `>=18` from selecting a newer major version automatically. Vercel uses the package engine setting to override the dashboard selection; see [Node version configuration](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Preview the production build locally

```bash
npm run build
npm run preview
```

Open the URL printed by Vite. Preview serves an existing build; run the build again after changing source files.

## Before sharing the link

- Open the production address in a fresh browser session and confirm the Princestock start screen loads.
- Start a test shift with fictional names, inspect the report, exercise copy/download, then delete it.
- Complete a quick sweep and reload it to check persistence on the deployed origin.
- Check a phone viewport, keyboard navigation, dark mode, and reduced motion using the [manual test guide](testing.md#manual-browser-checks).
- If the project uses deployment protection, verify the intended reviewer can open the link.
- Keep the production URL in the README and GitHub repository Website field up to date. Use fictional names for any screenshots.

The production URL is supplied by the project owner. Run the checks above after deploying; publishing the URL does not establish that every browser workflow has been verified.

## Data boundaries

Localhost, preview URLs, production URLs, and a new custom domain have separate browser storage. Publishing code does not upload existing local shifts. A redeployment at the same origin normally preserves storage; changing origin does not migrate it.

TXT download exports the report only. There is no application data import, cross-device sync, or automatic server backup.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Build cannot find `package.json` | Set the root directory to the app folder |
| Missing `dist` | Confirm `npm run build` succeeded and the output directory is `dist` |
| Dependency installation fails | Commit a matching `package.json` and `package-lock.json`; use the intended Node version |
| Saved shifts appear missing | Confirm the browser/profile and exact site origin |
| Copy fails | Use the HTTPS deployment or select the report text manually |

An npm warning is not itself a failed deployment. `whatwg-encoding` currently comes through jsdom, a development/test dependency. Its deprecation warning does not establish that the production build failed. If the log stops during installation, wait for a final status and inspect the last error and exit code before changing dependencies. A local change only affects Vercel after it is committed and pushed to the deployed branch.
