# Portrait generation pipeline

MyPicks player portraits are generated from structured text prompts. No real photographs are used
as input at any stage.

## Prompt template

Base prompt:

```text
Portrait of a [AGE]-year-old [NATIONALITY] male football player.
[HAIR_DESCRIPTION]. [SKIN_TONE]. [BUILD].
Wearing a plain [PRIMARY_KIT_COLOUR] football jersey, no text or logos.
Expression: focused and determined, slight forward lean.
Style: stylised digital illustration, painterly realism, sharp facial features,
clean white background, professional portrait lighting, head and shoulders only.
No text. No watermarks. No badges.
```

Example:

```text
Portrait of a 27-year-old Brazilian male football player.
Short dark curly hair. Medium-dark brown skin. Athletic, lean build.
Wearing a plain yellow football jersey, no text or logos.
Expression: focused and determined, slight forward lean.
Style: stylised digital illustration, painterly realism, sharp facial features,
clean white background, professional portrait lighting, head and shoulders only.
No text. No watermarks. No badges.
```

Negative prompt:

```text
photograph, photorealistic, camera, realistic skin texture, real person,
celebrity likeness, jersey number, team badge, sponsor logo, text, watermark,
blurry, low quality, extra limbs, distorted face, cartoon, anime
```

## Generation settings

| Parameter | Value | Reason |
| --- | --- | --- |
| Model | SDXL 1.0 base | Strong open model for portrait quality |
| LoRA | Juggernaut XL v9 or similar portrait LoRA | Consistent face quality and skin tones |
| Steps | 30 | Quality vs speed balance |
| CFG scale | 7.0 | Prompt adherence without over-saturation |
| Sampler | DPM++ 2M Karras | Stable high-quality output |
| Resolution | 512x512 base, upscaled to 1024x1024 via ESRGAN 4x | CDN serves 1024px plus thumbnails |
| Batch size | 4 per player | Human selects the best variant |
| Seed | Random, logged | Reproducibility for accepted portraits |

## National theme frames

Each nation gets one SVG frame. The portrait is used as the background image and the SVG frame is a
CSS overlay with `position: absolute; inset: 0`.

Frame anatomy:

- Top band: primary nation colour, 12-14px tall.
- Portrait area: transparent.
- Flag motif: simplified geometric motif in the bottom-left corner, 32x20px.
- Base band: secondary nation colour, 8-14px tall.
- Border ring: subtle 1-1.5px primary-colour stroke.

Sample colour references:

| Nation | Primary | Secondary | Motif |
| --- | --- | --- | --- |
| Brazil | `#009C3B` | `#FEDD00` | Diamond outline |
| France | `#002395` | `#ED2939` | Vertical stripe trio |
| Germany | `#000000` | `#DD0000` | Horizontal stripe trio |
| Argentina | `#74ACDF` | `#FFFFFF` | Diagonal sash line |
| Spain | `#AA151B` | `#F1BF00` | Horizontal stripes |
| England | `#FFFFFF` | `#CF111A` | St George cross thin lines |
| Morocco | `#C1272D` | `#006233` | Star outline |
| Japan | `#FFFFFF` | `#BC002D` | Circle motif |
| Senegal | `#00853F` | `#FDEF42` | Star motif |
| USA | `#002868` | `#BF0A30` | Stripe lines |

Reusable SVG frame template:

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="14" fill="{PRIMARY}" rx="4"/>
  <rect x="0" y="186" width="200" height="14" fill="{SECONDARY}" rx="0"/>
  <g transform="translate(6, 162)" opacity="0.85">
    <!-- Nation-specific abstract paths only -->
  </g>
  <rect x="1" y="1" width="198" height="198" fill="none"
        stroke="{PRIMARY}" stroke-width="1.5" rx="4"/>
</svg>
```

## Script outline

Input: `squad_list.csv` with `name`, `nationality`, `age`, `skin_tone`, `hair`, `build`, and
`kit_colour`.

Output:

- `portraits/{player_id}/1024.webp`
- `portraits/{player_id}/512.webp`
- `portraits/{player_id}/256.webp`
- `portraits/{player_id}/128.webp`

Steps:

1. Build the prompt from the template and player fields.
2. Call the SDXL API, for example RunPod or Replicate, using the settings above.
3. Save four variants to `/staging/{player_id}/variant_{1-4}.png`.
4. Log player ID, prompt, negative prompt, settings, and seeds.
5. Human reviewer selects the best variant.
6. Move the selected variant to `/accepted/{player_id}.png`.
7. Run ESRGAN 4x upscale on the accepted PNG.
8. Composite the national SVG frame over the upscaled portrait.
9. Convert to WebP at quality 90.
10. Generate 512, 256, and 128px thumbnails.
11. Upload all sizes to S3 or equivalent object storage under `portraits/{player_id}/{size}.webp`.
12. Update `players.portrait_url` with the CDN base URL.
13. Log completion and flag low CLIP aesthetic scores for re-review.

Expected batch cost is about USD 66 for 830 players at four variants each. Expected wall time is
about 4 hours on an A100-class RunPod instance.
