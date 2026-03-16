# DreamHost Launch + Cloudflare

Use Cloudflare's free proxy in front of DreamHost Launch and cache static assets aggressively.

## Recommended Caching

- Cache HTML normally so new deploys appear quickly.
- Cache `/assets/*` aggressively.
- Cache `/generated/images/*` aggressively.
- Cache icons, fonts, and lottie JSON aggressively.

## Suggested Cloudflare Rules

- `example.com/assets/*`
  Cache eligible responses with a long edge/browser TTL.
- `example.com/generated/images/*`
  Cache eligible responses with a long edge/browser TTL.
- `example.com/assets/img/favicon*`
  Cache eligible responses with a long edge/browser TTL.
- `example.com/assets/img/angles-cursor-eye-*.json`
  Cache eligible responses with a long edge/browser TTL.

## Notes

- Keep hashed JS/CSS/font filenames so long cache TTLs are safe.
- Do not force the same long cache policy onto HTML documents.
- If DreamHost sends weak cache headers for static assets, prefer overriding them in Cloudflare cache rules.
