---
name: Vercel
colors:
  primary: "#171717"
  secondary: "#0070F3"
  neutral: "#FAFAFA"
  error: "#EE0000"
  success: "#00C853"
typography:
  h1:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 4rem
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.04em
  body-md:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: "Geist Mono, monospace"
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: 0.05em
rounded:
  sm: 4px
  md: 6px
spacing:
  sm: 8px
  md: 24px
  lg: 96px
---
## Overview
Vercel's design system, Geist, is one of the web's most disciplined monochrome systems. Nearly every marketing surface is built from just black, white, and gray, with a single blue accent held in reserve for links, focus states, and the one most important action on a screen. The restraint itself is the aesthetic: the interface reads as engineered rather than decorated, closer to how a compiler treats code than how a brand treats a page.

## Colors
- **Primary (`#171717`):** "Vercel Black" — not quite pure black, which keeps large text blocks and dark sections from feeling harsh. Used for primary text, primary buttons, and dark-mode surfaces.
- **Secondary (`#0070F3`):** The signature accent blue. Applied sparingly — links, focus rings, and the occasional highlighted CTA — so that when it does appear, it reads as a deliberate signal rather than decoration.
- **Neutral (`#FAFAFA`):** A near-white background, marginally softer than pure white, used for page canvases and card surfaces to keep the high-contrast type from feeling clinical.
- **Error (`#EE0000`):** A clean, saturated red for destructive actions, form validation, and failed build/deployment states.
- **Success (`#00C853`):** A vivid green for successful deployments, passing checks, and positive status. (Note: Geist's own token system semantically maps a variant of blue to "success," but a distinct green is used here for clarity and to avoid overloading the accent color.)

## Typography
Geist's typeface family — Geist Sans and Geist Mono, both designed in-house — is the system's most identifiable signature.
- **H1 (Geist Sans):** Large display headlines run 48–64px with aggressive negative letter-spacing (as tight as `-0.04em`) and a compressed `1.1` line-height. This tightness is deliberate: at default tracking the same headline reads as noticeably less intentional. The result is a condensed, high-impact tone reserved for hero statements.
- **Body-md (Geist Sans):** Standard paragraph text at a relaxed tracking and `1.5` line-height, prioritizing legibility over the compression used at display sizes.
- **Label-caps (Geist Mono):** Uppercase, wide-tracked monospace used for technical labels, badges, and metadata — the "developer console" voice that visually threads marketing copy back to code and CLI output.

## Layout
- **Spacing:** A 4px-based scale used sparingly at small sizes (`sm: 8px` for inline gaps) and generously at the section level — vertical rhythm between major sections often reaches `80–120px` (`lg: 96px`), producing the system's signature "gallery emptiness." The whitespace itself communicates confidence rather than absence of content.
- **Border Radius:** Marketing surfaces favor sharp or near-sharp corners — `sm: 4px` on small elements, `md: 6px` on cards, inputs, and standard buttons — with a `9999px` full-pill radius reserved specifically for primary marketing CTAs, making the pill button an unmistakable "start here" signal.
- **Grid Patterns:** A faint background grid appears behind hero sections, reinforcing the developer-tool identity without adding visual noise. Content sections stack vertically with no background-color variation between them — separation is achieved entirely through spacing and hairline borders, never color blocking.

## Components
- **Buttons:** Primary buttons use a solid `#171717` fill with white text and minimal radius (`md: 6px`) on dashboard surfaces, or the full `9999px` pill on marketing pages. Secondary buttons invert to a white/neutral fill with a hairline border. Hover and focus states rely on a visible focus ring rather than color shifts alone, keeping the system accessible.
- **Cards:** Rather than traditional CSS borders, cards use a "shadow-as-border" technique — a zero-blur, 1px-spread box-shadow (`0px 0px 0px 1px rgba(0,0,0,0.08)`) layered with a soft ambient shadow. This keeps edges crisp at any corner radius without the box-model side effects of a real border, and lets cards feel subtly "built" rather than flatly outlined.
- **Inputs:** Text fields sit on the `neutral` background with a thin gray border, `sm`–`md` radius, and switch to the `secondary` blue on focus via a visible outline ring — never removed without a replacement, per the system's accessibility stance.
- **Navigation:** A minimal, text-based header with the wordmark on the left and product/resource menus expanding into multi-column dropdowns. The footer mirrors this with a dense, categorized link directory (Products, Resources, Company, Legal, Social) typeset in `label-caps`.
- **Lists/Tables:** Status and deployment lists lean on the accent palette semantically — pill-shaped badges (`9999px` radius) with tinted backgrounds mark states like "Building," "Ready," or "Error," using `success`/`error` colors at low opacity so the mostly-monochrome list doesn't feel busy.
