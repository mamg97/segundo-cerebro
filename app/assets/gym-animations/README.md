# Gym animation assets

These assets are first-party presentation aids for Segundo Cerebro. They do not replace the canonical gym plan or the public technical reference supplied by wger.

## `press-banca-plano-barra-v5.gif`

- Generated: 2026-10-04 from the approved v4 artwork, with deterministic local frame normalization and neural midpoint interpolation.
- Format: transparent GIF89a, 360×480, 16 frames at 7 cs per frame, infinite loop.
- Visual language: clean 2D anatomical line art; pale gray body; restrained contour hatching; pectorals, anterior deltoids and triceps in flat muted red; simple charcoal equipment.
- Runtime: native animated GIF; reduced-motion users receive `press-banca-plano-barra-poster-v5.png`.
- Mapping: exact canonical exercise ID/name only.
- Review rule: confirm movement and equipment consistency before production use. Never infer technique from an unreviewed generated frame.

Final generation prompt:

> Create one 4-column by 2-row sprite sheet containing exactly eight sequential frames of a flat barbell bench press. Reading order is left-to-right across the top row, then left-to-right across the bottom row. Frames 1-4 smoothly lower the bar from straight arms toward mid-chest. Frames 5-8 smoothly press it back to the starting position. Each adjacent frame must be a small, even change in elbow angle and bar height. Use a clean premium 2D anatomical fitness illustration like a modern exercise encyclopedia: thin charcoal-gray ink outlines, restrained light-gray muscle contour hatching, off-white or very pale gray body, flat muted red highlights on pectoralis major, anterior deltoids and triceps, and simple matte charcoal bench, rack and barbell. Keep an identical fixed side-to-three-quarter camera, athlete, body proportions, equipment, scale and placement in all eight panels. Head, upper back, glutes and feet remain planted; hands stay on the same grip; wrists stay stacked; elbows bend symmetrically; the bar follows a smooth safe path to the mid-chest and back. Exactly eight equal panels, genuinely transparent background. No interface, cards, labels, text, numbers, logos, watermark, real person, skin-tone rendering, glossy 3D, dramatic lighting, blue equipment, changing camera or anatomy, extra limbs, duplicated parts, ghosting, motion blur or cropping.

The supplied app capture was used only as a visual-language reference; its interface, branding and content were not copied. The previous four-frame render was used only as a movement reference. The built-in OpenAI image generation tool produced the v4 4×2 source sheet with the prompt above.

For v5, no independently generated replacement frames were accepted. The eight approved source phases were normalized as complete scenes to the same 324 px visible width, placed on identical 360×480 transparent canvases and anchored to a common lower baseline. One midpoint was then calculated locally between every adjacent pair, including the loop seam, with RifeMetal v0.1.7 in HQ mode (Apache-2.0; Practical-RIFE v4.26 weights under MIT). The interpolated transparency masks were rebuilt separately before encoding. This produces 16 evenly timed phases without per-frame trimming, camera zoom, cross-fade ghosts or opaque backgrounds. `v1`–`v4` remain unreleased review history and are not runtime assets.
