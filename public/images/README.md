# MyPicks hero imagery

## Spain portraits (home feed)

Optimized WebP backgrounds for the home feed (`feed-browser--hero-backdrop` in `globals.css`). The feed crossfades between two Spain stars on a slow loop.

| File | Size | Player | Use |
|------|------|--------|-----|
| `kickboard-hero-spain.webp` | 1600px wide | Lamine Yamal | Desktop primary (`min-width: 861px`) |
| `kickboard-hero-spain-mobile.webp` | 960px wide | Lamine Yamal | Mobile primary |
| `kickboard-hero-nico.webp` | 1600px wide | Nico Williams | Desktop alternate |
| `kickboard-hero-nico-mobile.webp` | 960px wide | Nico Williams | Mobile alternate |

**Yamal source:** [Lamine Yamal in 2025 (cropped2).jpg](https://commons.wikimedia.org/wiki/File:Lamine_Yamal_in_2025_(cropped2).jpg) on Wikimedia Commons by **Biso**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

**Williams source:** [Nico Williams (cropped).jpg](https://commons.wikimedia.org/wiki/File:Nico_Williams_(cropped).jpg) on Wikimedia Commons by **Maider Goikoetxea**, [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).

To replace with custom photos, overwrite these WebP files (portrait ~3:4 works best) or re-run:

```bash
ffmpeg -i your-source.jpg -vf "scale=1600:-2" -c:v libwebp -quality 82 public/images/kickboard-hero-spain.webp
ffmpeg -i your-source.jpg -vf "scale=960:-2" -c:v libwebp -quality 78 public/images/kickboard-hero-spain-mobile.webp
```

The tournament **Overview** modal also uses the Nico Williams portrait as a header accent (`tournament-summary-modal-portrait`).
