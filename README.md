# akhil-pothanapalli.github.io

Personal research page, built by GitHub Pages' default Jekyll — no build step, no Actions.

## Deploy
Push the contents of this folder to the root of the `akhil-pothanapalli.github.io` repo. In **Settings → Pages**, source = `Deploy from a branch`, branch = `main`, folder = `/ (root)`.

## Where things live
```
_config.yml            site title, email, location, social links (add your Scholar URL here)
_data/publications.yml papers — add a new entry at the top
_data/projects.yml     research projects
_data/profile.yml      numbers, ticker, skills, experience, education
_layouts/default.html  page shell
_includes/*.html       one file per section (hero, ticker, stats, about, research, publications, skills, experience, contact)
assets/css/organic.css    design-system tokens + components (don't edit per page)
assets/css/site.css       page layout (this is the Maximalism look)
assets/css/styles/        style picker: base.css + one file per alternative look
_data/styles.yml          styles listed in the picker (id = file name in assets/css/styles/)
assets/js/main.js         menu, nav highlight, paper filter, waveform
assets/img/portrait.jpg
assets/img/collage/       public-domain artwork for the hero collage (credited in the footer)
```

## Styles
Visitors pick a look from the **Style** button (bottom-right); the choice is saved in their browser. Link straight to one with `?style=<id>`, e.g. `/?style=y2k`.

| id | Style | id | Style |
|---|---|---|---|
| `maximal` | Maximalism (default, `site.css`) | `pixel` | Pixel / 8-bit |
| `minimal` | Minimalism | `win95` | Windows 95 |
| `swiss` | Swiss / International | `terminal` | Terminal |
| `flat` | Flat | `psychedelic` | Psychedelic |
| `newspaper` | Newspaper | `glass` | Glassmorphism |
| `y2k` | Y2K futurism | `neumorphism` | Neumorphism |
| `seventies` | Retro 70s | `clay` | Claymorphism |
| `vaporwave` | Vaporwave | `aurora` | Aurora |
| `organic` | Organic / Earthy | `skeuo` | Skeuomorphism |
| `deco` | Art Deco | `cyberpunk` | Cyberpunk |

### How it works
- `_includes/head.html` reads `?style=` or the saved choice before first paint, adds `class="calm"` to `<html>` for any style except Maximalism, and loads `assets/css/styles/<id>.css`.
- `assets/css/styles/base.css` turns off the collage and tilts under `.calm` and rebuilds every section from a small set of tokens (`--bg`, `--text`, `--accent`, `--card-bg`, `--band-bg`, `--cta-bg`, `--font-display` …). A style file mostly sets those tokens under `:root[data-style="<id>"]`, then adds its own details.
- The hero waveform is drawn by `assets/js/main.js`; a style chooses how with `--wave-mode` (`bars`, `blocks`, `scope`, `area`, `line`, `none`) plus `--wave-colors`, `--wave-bar` and `--wave-gap`.
- `assets/js/style-fx.js` holds extras CSS can't do: Terminal's boot screen and typing banners, Glass's pointer highlight and floating orbs, Skeuomorphism's cassette tape.

### Add your own style
1. Copy a style file in `assets/css/styles/` to `<id>.css` and change the tokens at the top.
2. Add a line to `_data/styles.yml`.
3. Open `/?style=<id>`.

### References
Sources used to research each style, so you can study the originals yourself. Styles without an entry yet are being reviewed one at a time.

**Y2K futurism** (c. 1997–2004: icy blue, silver and white with lime/orange accents, liquid chrome, translucent iMac G3 plastic, Aqua gel buttons, techno type, HUD linework)
- [Y2K aesthetic, Wikipedia](https://en.wikipedia.org/wiki/Y2K_aesthetic)
- [Y2K aesthetic](https://cari.institute/aesthetics/y2k-aesthetic) and [Neo-Y2K](https://cari.institute/aesthetics/neo-y2k), Consumer Aesthetics Research Institute
- [Y2K aesthetic for web design projects](https://webflow.com/blog/y2k-aesthetic), Webflow
- [The Y2K aesthetic is fully back](https://eyeondesign.aiga.org/the-y2k-aesthetic-is-fully-back-but-can-it-stick-around/), AIGA Eye on Design
- [Aesthetics exploration: Y2K futurism](https://aesdes.org/2025/01/22/aesthetics-exploration-y2k-futurism)
- [Frutiger Aero](https://www.kittl.com/blogs/?p=19536), Kittl
- Web Design Museum galleries: [futuristic Flash sites incl. 2Advanced Studios v1–v4](https://www.webdesignmuseum.org/gallery/style-futuristic/tag-flash), [Y2K-tagged sites 2000/2006](https://www.webdesignmuseum.org/gallery/style-gradients-or-icons-or-y2k-aesthetic/year-2000-or-2006)

**Flat**, built as Microsoft's Metro design language (Windows Phone 7/8 and the Windows 8 Start screen, 2010–2014: black ground, white type, one accent colour, thin lowercase panorama and pivot headers, live tiles, tilt and turnstile motion)
- [Metro (design language), Wikipedia](https://en.wikipedia.org/wiki/Metro_(design_language)): content not chrome, Swiss and transit-signage roots, Segoe type, live tiles as "atomic units of information", panoramas and pivots
- [Principles of Metro style](https://visualstudiomagazine.com/articles/2012/07/01/principles-of-metro-style.aspx), Visual Studio Magazine
- [Emulating Microsoft's Metro design language](https://webdesign.tutsplus.com/emulating-microsofts-metro-design-language--webdesign-8042a), Envato Tuts+
- Windows Phone 8 accent colours with values: [Windows Phone theme colors](https://marcofranssen.nl/windows-phone-theme-colors) (Cobalt `#0050EF` is used here); background on [the new accents](https://www.windowscentral.com/new-accents-windows-phone-8), Windows Central
- [Flat design, Wikipedia](https://en.wikipedia.org/wiki/Flat_design) and [From Marx to Microsoft: the origins of flat design](https://www.process.st/flat-design/), Process Street
- Period showcases: [Top 20 flat design websites, November 2013](https://flattrendz.com/top-20-flat-design-websites-november-2013/), Flattrendz; [Flat web design in 2013](https://creativebeacon.com/flat-web-design-2013/), Creative Beacon

## Run locally (optional)
`gem install jekyll && jekyll serve`
