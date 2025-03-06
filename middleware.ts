import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/settings';

// This middleware intercepts requests and handles locale detection and routing
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

// Configure which routes are handled by the middleware
export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes (/api/*)
    // - Static files (/_next/*)
    // - Static files with extensions (e.g., favicon.ico, robots.txt)
    '/((?!api|_next|.*\\.[^/]*$).*)'
  ]
};