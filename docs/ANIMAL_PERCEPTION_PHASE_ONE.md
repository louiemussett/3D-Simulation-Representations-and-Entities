# Animal perception Phase 1 — paired eyes and ears

Phase 1 introduces authoritative paired sensors while retaining the Phase 0
architecture and visual compatibility contract.

- Founder eye and ear anchors are metadata only. They create no mesh, alter no
  silhouette and are explicitly marked `visibleGeometryRequired: false`.
- Each eye now has its own world-space origin, directional field and terrain /
  vegetation ray. Results integrate as monocular or binocular perception.
- Binocular observations receive a small bounded confidence advantage;
  monocular observations remain useful but less certain.
- Paired ears calculate interaural level and timing differences from the same
  propagated physical sound field. Ear aim is retained per entity.
- Salient cues first rotate ears and head. Only a sustained cue can rotate a
  stationary body, and only during listening, searching or orienting actions.
  Moving animals never have their route direction overwritten by this system.

The historical Phase 0 checksum remains `2b49c409`. Phase 1 deliberately
changes perception output, while the independent founder visual checksum
remains `d31f1155`. The Phase 1 paired-sensor output checksum is `7f0c3265`.
