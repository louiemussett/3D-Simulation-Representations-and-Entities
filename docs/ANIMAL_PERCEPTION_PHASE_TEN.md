# Animal Perception Phase 10 — Long-term environmental history

Phase 10 extends the bounded physical-trace field so landscapes retain evidence over hours, seasons, and years without creating one permanent scene object per deposit.

## Retained evidence

- Urine provides short-lived chemical evidence and is strongly affected by weather.
- Dung persists longer, carries chemical and nutrient metadata, and is classified by deposit mass.
- Mammals shed sparse hair; represented birds shed sparse feathers. Reptiles do not receive a mammalian fallback.
- Mature male Woodland Browsers can leave an annual shed-antler record.
- A carcass deposits one durable bone record when its skeleton becomes exposed.

Schedules are deterministic per entity and ecological hour. They do not consume simulation randomness, and repeated save/load produces the same schedule.

## Weathering and perception

Each material has its own decay rate. Rain rapidly weakens urine, degrades dung more slowly, and has little immediate effect on antlers and bones. Wind can displace or remove sparse hair and feathers. These records remain inside the existing per-cell and world-cell bounds.

Animals receive deposits and remains only when their existing vision or smell admits them. Identity remains uncertain and follows the same familiarity and confidence thresholds as other traces. Laboratory truth is never copied into animal knowledge.

## Laboratory history view

The selected-animal Laboratory now summarizes retained evidence across five time horizons:

- Last day
- Last week
- Last season
- Last year
- Older history

It also reports evidence by material and the strongest retained-history cells. The optional Environmental history overlay draws only a bounded set around the selected animal and is explicitly authoritative Laboratory presentation.

No founder geometry, materials, silhouette, or animation was changed.
