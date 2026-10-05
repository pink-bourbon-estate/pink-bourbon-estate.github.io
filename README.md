# Pink Bourbon Estate Website

Hugo static site for pink-bourbon-estate.github.io

## Setup

```bash
# Clone repo
git clone --recurse-submodules https://github.com/pink-bourbon-estate/pink-bourbon-estate.github.io.git
cd pink-bourbon-estate.github.io

# Install Hugo
# macOS: brew install hugo
# Linux: sudo apt install hugo
# Windows: choco install hugo

# Run locally
hugo server --buildDrafts
# Visit http://localhost:1313
```

## Build

```bash
# Generate static site (output to public/)
hugo

# Deploy to GitHub Pages
# Push to main branch
git add .
git commit -m "Update site"
git push origin main
```

## Theme

Using [Ananke](https://github.com/theNewDynamic/gohugo-theme-ananke)

## License

Open source, see individual tool repositories.
