# Gym animation assets

These assets are first-party presentation aids for Segundo Cerebro. They do not replace the canonical gym plan or the public technical reference supplied by wger.

## `press-banca-plano-barra-v3.gif`

- Generated: 2026-10-04 with the built-in OpenAI image generation tool.
- Format: transparent GIF89a, 360×480, eight frames, infinite loop.
- Visual language: matte white anatomical mannequin; pectoral highlighted orange-red; triceps and anterior deltoids highlighted amber; dark navy equipment.
- Runtime: native animated GIF; reduced-motion users receive `press-banca-plano-barra-poster-v2.png`.
- Mapping: exact canonical exercise ID/name only.
- Review rule: confirm movement and equipment consistency before production use. Never infer technique from an unreviewed generated frame.

Final generation prompt:

> Restyle the supplied four-frame flat barbell bench-press sprite into a clean anatomical exercise animation. Keep the same movement phases, fixed side camera, bench, barbell and transparent layout. Use a matte white gender-neutral athletic mannequin. Highlight pectoralis major as the strongest warm orange-red region and triceps/anterior deltoids as secondary amber regions in every frame. Use subtle light-gray anatomy contours and dark navy equipment. Preserve a safe bar path from arms extended to near mid-chest and back. Exactly four equal frames; no real person, opaque background, text, labels, arrows, logos or watermark.

Intermediate-frame prompt:

> Using the supplied transparent four-panel bench-press animation strip as the exact style and motion reference, create a new horizontal strip of exactly four equal panels containing only the missing midpoint poses. Panel 1 must be halfway between source panels 1 and 2; panel 2 halfway between source panels 2 and 3; panel 3 halfway between source panels 3 and 4; panel 4 halfway between source panel 4 and source panel 1 to close the loop smoothly. Preserve the same matte white gender-neutral anatomical mannequin, body proportions, fixed camera, bench, rack, barbell, plate count, dark navy and blue equipment, pectoralis major orange-red highlight, and triceps/anterior deltoids amber highlights. Keep both hands fixed on the bar, the body fixed on the bench, and the bar path vertical and safe. Each midpoint must be a plausible transitional pose, not a duplicate of a source pose. Exactly four equal frames in one horizontal strip, one centered complete athlete and one complete bench/barbell setup per frame, consistent scale and alignment, no overlap between panels, no cropped limbs or equipment. Genuinely transparent background; no text, labels, arrows, logos, watermark, extra people, extra limbs, duplicated equipment, ghosting, motion blur, panel borders, or opaque background.

The original RGBA strip and the generated midpoint strip were resized, aligned, cleaned at the frame boundaries and interleaved into eight phases. The GIF uses per-frame background disposal so transparent frames never accumulate. The first original frame is retained as the reduced-motion poster; `v2` remains the reviewed four-frame source.
