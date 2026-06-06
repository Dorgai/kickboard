# MyPicks hero imagery

## `kickboard-hero-spain.webp` / `kickboard-hero-spain-mobile.webp`

Optimized WebP backgrounds for the home feed (`feed-browser--hero-backdrop` in `globals.css`).

| File | Size | Use |
|------|------|-----|
| `kickboard-hero-spain.webp` | 1600px wide | Desktop (`min-width: 861px`) |
| `kickboard-hero-spain-mobile.webp` | 960px wide | Mobile |

**Source:** [Lamine Yamal in 2025 (cropped2).jpg](https://commons.wikimedia.org/wiki/File:Lamine_Yamal_in_2025_(cropped2).jpg) on Wikimedia Commons by **Biso**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

To replace with a custom photo, overwrite these WebP files (keep similar aspect ratio ~3:4 portrait) or re-run:

```bash
ffmpeg -i your-source.jpg -vf "scale=1600:-2" -c:v libwebp -quality 82 public/images/kickboard-hero-spain.webp
ffmpeg -i your-source.jpg -vf "scale=960:-2" -c:v libwebp -quality 78 public/images/kickboard-hero-spain-mobile.webp
```
