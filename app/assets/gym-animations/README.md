# Gym animation assets

These assets are first-party presentation aids for Segundo Cerebro. They do not replace the canonical gym plan or the public technical reference supplied by wger.

## `military-press-v2.gif`

- Generated 2026-10-05 with the built-in image generation tool, using the approved bench poster as a style reference only. Same anonymous pale athlete, flat red muscles, gray contours, black briefs and charcoal equipment.
- Standing barbell overhead press; highlighted deltoids and triceps. Exact generic names only, never dumbbell/seated variants by substring.
- Transparent 360×480, 16 frames, 7 cs each; a poster supports reduced motion. An offline builder applies one common scale to all source phases, aligns the stationary lower support, interpolates RGB and alpha separately, and retains transparency in the common GIF palette.
- Source and review contact sheet: `design/gym-animations/`; offline build tool: `private-cloudflare/scripts/build-gym-animation.mjs`. The rejected opaque first encode is retained locally, not published.
- Generic visual checks: full-body framing, planted feet, connected bar/hands, bottom-to-overhead-to-bottom cycle. This is an illustrative movement aid, not professional technique certification.

Shared generation brief (2026-10-05):

> Use case: scientific-educational. Asset: a coherent exercise-animation sprite sheet. Image 1 is the APPROVED STYLE reference, not the movement reference. Match that exact anonymous bald faceless pale-white anatomical athlete, gray thin anatomical contours, charcoal briefs, barefoot, flat bright-red target muscles and matte charcoal equipment. Keep the 2D illustrated aesthetic, avoid realistic human face/hair, shoes, glossy rendering or lighting. Create exactly EIGHT frames in a strict 4-column x 2-row grid with equal cells and clear transparent margins. Read order left-to-right top then bottom. One fixed 3/4 camera, athlete proportions, equipment, color and scale; the stationary supports must be in the EXACT same cell coordinates in all frames. Movement must be symmetric, controlled, continuous with no teleportation. No text, labels, borders, numbers, UI, logos, watermark, ghosting or motion blur. Transparent background with real alpha, no background pixels or cast shadow.

Military movement specification: standing barbell overhead press, fixed feet and torso, symmetric press from upper chest to overhead and return, deltoids/triceps highlighted. Selected source order: `0,2,5,4,3,4,5,2`; lower stationary region starts at 0.73 of each cell. Source sheet poses are reordered for a continuous up/down cycle before midpoint interpolation.

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
