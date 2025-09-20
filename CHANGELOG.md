# Changelog

## docs/assets/css/responsive-nav.css
- L5-L70: Strengthened navigation styling to preserve logo proportions and guarantee 44px touch targets while improving the mobile dialog backdrop.

## docs/assets/js/responsive-nav.js
- L1-L204: Rebuilt the responsive menu controller to support multiple headers, stricter ARIA state management, focus trapping, overflow detection, and hash-change cleanup.

## docs/index.html
- L6-L111: Added canonical metadata and rebuilt hero CSS to eliminate parallax banding.
- L115-L182: Replaced navigation markup with domain-absolute links and a static hero background image.
- L398-L520: Normalised internal links and added an inline status panel to the contact form.
- L700-L889: Hardened the contact form logic with custom validity, status messaging, retry handling, and safe button state management.

## docs/impressum.html
- L5-L97: Added canonical metadata and swapped in the shared responsive navigation with absolute URLs.
- L160-L169: Normalised footer links to the production domain.

## docs/datenschutz.html
- L5-L97: Added canonical metadata and synchronised navigation with the shared responsive variant.
- L200-L204: Updated footer links to the production domain.

## docs/kostenrechner.html
- L6-L15: Added canonical metadata for the pricing tool.
- L256-L330: Rebuilt the header navigation with absolute URLs.
- L220-L236: Enhanced toast styling to support actionable error states.
- L680-L842: Upgraded toast handling with retry support, variant styling, and clearer submission feedback.
- L420-L456: Normalised consent/privacy links and footer URLs to the production domain.
