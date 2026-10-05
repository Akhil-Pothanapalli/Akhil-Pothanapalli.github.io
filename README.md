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
assets/css/site.css       page layout
assets/js/main.js         menu, nav highlight, paper filter, waveform
assets/img/portrait.jpg
assets/img/collage/       public-domain artwork for the hero collage (credited in the footer)
```

## Run locally (optional)
`gem install jekyll && jekyll serve`
