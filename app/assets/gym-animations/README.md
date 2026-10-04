# Gym animation assets

These assets are first-party presentation aids for Segundo Cerebro. They do not replace the canonical gym plan or the public technical reference supplied by wger.

## `press-banca-plano-barra-v2.gif`

- Generated: 2026-10-04 with the built-in OpenAI image generation tool.
- Format: transparent GIF89a, 360×480, four frames, infinite loop.
- Visual language: matte white anatomical mannequin; pectoral highlighted orange-red; triceps and anterior deltoids highlighted amber; dark navy equipment.
- Runtime: native animated GIF; reduced-motion users receive `press-banca-plano-barra-poster-v2.png`.
- Mapping: exact canonical exercise ID/name only.
- Review rule: confirm movement and equipment consistency before production use. Never infer technique from an unreviewed generated frame.

Final generation prompt:

> Restyle the supplied four-frame flat barbell bench-press sprite into a clean anatomical exercise animation. Keep the same movement phases, fixed side camera, bench, barbell and transparent layout. Use a matte white gender-neutral athletic mannequin. Highlight pectoralis major as the strongest warm orange-red region and triceps/anterior deltoids as secondary amber regions in every frame. Use subtle light-gray anatomy contours and dark navy equipment. Preserve a safe bar path from arms extended to near mid-chest and back. Exactly four equal frames; no real person, opaque background, text, labels, arrows, logos or watermark.

The generated RGBA strip was resized to a width divisible by four, split into equal frames, cleaned at the frame boundaries and encoded locally with background disposal so transparent frames never accumulate. The first frame is retained as the reduced-motion poster.
