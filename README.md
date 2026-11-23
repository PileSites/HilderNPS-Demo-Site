# Hilder Nursery and Primary School - website

A dependency-free, multi-page website for Hilder Nursery and Primary School
(Hilder NPS), Gulu City, Uganda. The site is plain HTML, CSS and JavaScript:
there is no React, no Vite and no build step.

## Run it locally

Open `index.html` directly, or serve the folder over HTTP (recommended, so
relative paths and browser behaviour match production):

```sh
# Python 3
python -m http.server 8000

# then visit http://localhost:8000
```

You can also use the Live Server extension in VS Code. The test setup used
`python -m http.server 4173`.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `about.html` | About us |
| `academics.html` | Academics and programmes |
| `achievements.html` | PLE achievements |
| `environment.html` | Learning environment |
| `activities.html` | Arts, culture and co-curricular life |
| `campuses.html` | Main and Pageya campuses |
| `gallery.html` | Photo gallery |
| `admissions.html` | Admissions and enquiry form |
| `contact.html` | Contact details and enquiry form |
| `404.html` | Not found (configure this in your host) |

## Structure

```text
.
|-- index.html ... contact.html, 404.html
|-- assets/
|   |-- css/
|   |   |-- base.css        # tokens, reset, typography, buttons, motion
|   |   |-- layout.css      # navigation, drawer, page heroes, footer
|   |   |-- components.css  # cards, carousel, forms, FAQ, lightbox
|   |   `-- pages.css       # page-specific layouts and responsive rules
|   `-- js/
|       |-- main.js         # shared nav, drawer, reveal animations, year
|       |-- home.js         # hero slideshow and number count-up
|       |-- academics.js    # programme tabs
|       |-- achievements.js # PLE year selector
|       |-- gallery.js      # native <dialog> lightbox
|       `-- forms.js        # accessible validation, AJAX delivery, mailto fallback
|-- images/                 # site photographs and the school crest
|-- favicon-32.png
|-- favicon-192.png
|-- favicon-512.png
|-- apple-touch-icon.png
|-- robots.txt
|-- sitemap.xml
`-- Hilder pics/            # original photo archive (not linked from the site)
```

Every page loads the same shared CSS and `main.js`. Page-specific scripts are
loaded only where they are needed.

## Branding

The school crest appears in the header, the mobile drawer and the footer on
every page, plus the browser tab icons.

- `images/badge.png` is the original supplied crest (981 x 1080, transparent).
- `images/logo.png` is a 256 px-high copy used in the page chrome. Square
  favicons are generated from the same crest with a white, rounded background.
- The crest is decorative (`alt=""`) because the adjacent wordmark already
  names the school.
- To replace the crest, overwrite `images/badge.png`, regenerate `logo.png`
  and the four icon files, and keep the same filenames so no HTML changes are
  needed.

## Editing content

- Navigation, footer and page metadata are repeated in each HTML file. Update
  all pages when changing a link, phone number or address.
- The active navigation item is marked with `aria-current="page"`.
- Icons come from an inline SVG sprite at the top of each page. Reuse a symbol
  with `<svg class="icon" aria-hidden="true"><use href="#i-name"></use></svg>`.
- The home hero and gallery images live in `images/`; update the `src` and
  `alt` text together.

### Enquiry forms

`assets/js/forms.js` validates the admissions and contact forms. Forms marked
with `data-whatsapp` open a properly encoded WhatsApp enquiry:

```html
<form class="form" data-enquiry-form data-subject="Admissions Enquiry"
      data-whatsapp="256782279751" novalidate>
```

This backend-free flow prepares the complete enquiry for the verified school
telephone number; the visitor explicitly sends it from WhatsApp. No temporary
email provider or submitted form service is used.

The contact form has no endpoint yet, so it still opens a blank recipient
(`mailto:?...`). The phone number `+256 782 279751` remains the primary contact
route in both cases, and is shown as the fallback if sending fails.

## Before publishing

1. **Set the live domain.** Replace `https://example.com` in `sitemap.xml` and
   `robots.txt` with the production domain.
2. **Confirm the form inbox.** Send a test enquiry through the admissions form
   and confirm it arrives at the temporary inbox. Replace the temporary address
   and Formspree form with the school's own when they are available.
3. **Add official social links.** Footer social icons currently show a
   "coming soon" state until profiles are supplied.
4. **Optimise the photographs.** `images/` is about 25 MB of full-resolution
   JPEGs. Resize to roughly 1600-2000 px on the long edge and export at a
   quality that keeps the page fast on mobile. A few photos (for example
   `images/web1.JPG`) are stored sideways at the pixel level; rotate them in an
   image editor if they should be upright.
5. **Remove `Hilder pics/` from the upload.** It is a source archive containing
   large `.CR2` files and is not used by the website.
6. **Configure the 404 page** in the hosting panel so unknown URLs serve
   `404.html`.

## Accessibility and behaviour notes

- Skip link, visible focus styles and labelled form fields.
- Mobile drawer traps focus, closes on `Escape`, and restores focus.
- Native `<details>` FAQ sections work without JavaScript.
- The gallery uses the native `<dialog>` element with keyboard arrows,
  `Escape` to close, backdrop click, and focus restoration.
- The hero carousel has pause/play, previous/next and dot controls, and pauses
  on hover/focus. It is disabled for `prefers-reduced-motion`.
- Each hero slide is also cut into a 4 x 3 grid of tiles. When the slideshow
  advances, the incoming photograph is revealed tile by tile with a short
  stagger while its heading and buttons fade in. The tiles are generated by
  `home.js`, so the markup keeps one `<img>` per slide and without JavaScript
  the first photograph simply displays as normal.
- Reveal animations are applied only when JavaScript is available and are
  skipped for `prefers-reduced-motion`.
- Without JavaScript, all page content and all programme panels remain
  readable. The enquiry forms need JavaScript to validate and prepare the
  email, so they are best treated as a progressive enhancement.

## Quality checks

All 11 pages score 100 in Lighthouse for Accessibility, Best Practices and SEO
in local testing. Re-run Lighthouse after changing content, colours or form
markup.

## Browser support

Current Chrome, Edge, Firefox and Safari. The site uses CSS custom properties,
CSS Grid, `:focus-visible`, `inert` and `<dialog>`. Older browsers receive the
content without the enhanced drawer/lightbox behaviour.
