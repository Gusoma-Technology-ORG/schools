# FANOS Publisher V5

FANOS Publisher V5 uses small-payload publishing. The browser sends only the school configuration; the Netlify function loads Canonical V36 from GitHub, generates the school website server-side, and commits it to `sites/<school-id>/`.

The interface uses `fanospublisherlogo.webp` from the Gusoma GitHub media path. FANOS Publisher V5 is visible in the browser tab, application header, and interface tabs. Function responses are parsed safely whether JSON or plain text.

# FANOS Publisher V5 V2

This package turns the approved V36 Kigali canonical into a browser-based school website manager.

## What works now
- School directory and editable school configuration.
- JSON/CSV bulk import and JSON export.
- V36 canonical preview and generated `index.html` download.
- Per-school SEO support files: `robots.txt`, `sitemap.xml`, `llms.txt`, `school.json`.
- Server-side GitHub publishing function. Secrets are never stored in the browser HTML.
- Netlify project listing and project creation through server-side functions.
- Bulk “Publish All Changed Schools” workflow.
- GitHub monorepo target: `sites/<school-id>/...`.

## One-time deployment setup
1. Create one GitHub repository, for example `gusoma-school-websites`, and put this package at its root.
2. Create a Netlify project for the Manager and connect it to that repository. The included `netlify.toml` publishes the repository root and enables the serverless functions.
3. In Netlify environment variables set the values shown in `.env.example`.
4. Open the deployed Manager URL. GitHub publishing will now commit generated files under `sites/<school-id>/`.
5. For each public school domain, create/link a Netlify project to the same monorepo and configure its publish/package directory to the matching `sites/<school-id>` directory. This is a one-time per-domain linkage. Thereafter Git pushes provide continuous deployment.

## Important limitation
Netlify's API can create a project, but programmatically configuring GitHub continuous-deployment repository linkage requires provider/repository authorization details. V1 therefore creates the Netlify project but deliberately leaves the secure one-time GitHub-to-Netlify linkage to Netlify/GitHub authorization. Once linked, day-to-day publishing is automated from the Manager.

## Security
Never paste GitHub or Netlify tokens into `index.html`, `schools.json`, or a school website. Keep them only in Netlify environment variables.

## Canonical policy
`canonical/template-v34.html` is the source template. Do not manually edit generated `sites/<id>/index.html` as the long-term source of truth. Update the canonical, bump its version, then regenerate affected schools.


## V36 pricing + offer controls
- Mobile/desktop sticky navigation now includes a slim blue course-duration strip.
- Pricing savings badges are calculated in USD from the active PRICE_MATRIX, so changing prices automatically changes savings.
- Navigation/hero English label is now “Prices”.
- A bottom seasonal-offer strip is generated dynamically and translated.
- `config/seasonal-offers.json` contains 50 reusable offer presets. FANOS can use automatic date selection or a manually selected offer/code per school.
- The offer strip displays a code; the commercial discount behind that code must also be configured in the payment/Stripe system before promotion.
