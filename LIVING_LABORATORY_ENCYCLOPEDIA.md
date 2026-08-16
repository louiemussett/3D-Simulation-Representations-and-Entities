# Living Laboratory — Living Encyclopedia

> **Every visible animal is embedded in an unseen web of physiology, memory, family, preference, communication and social organisation—and the Laboratory lets you uncover it.**

This encyclopedia is the complete player-facing reference for the current simulation. It describes the rules beneath visible behaviour without requiring the reader to understand the source code.

For a shorter introduction, begin with the [Simulation Guide](LIVING_LABORATORY_SIMULATION_GUIDE.md). For symbol meanings, use the [Visual Legend](GAME_SIMULATION_MAP_AND_VISUAL_LEGEND.md). For developer-facing implementation details, use the [Systems Reference](GAME_SIMULATION_SYSTEMS_REFERENCE.md).

## How to use this encyclopedia

Living Laboratory explains itself at three depths:

| Question | Best source | Intended reading time |
|---|---|---:|
| **What is happening now?** | Selected-animal explanation | Seconds |
| **How does this mechanic work?** | Contextual encyclopedia entry | A few minutes |
| **What are all the underlying rules?** | Complete Laboratory encyclopedia | As much detail as desired |

Every entry uses the same language:

- **What you can observe** describes visible behaviour.
- **What is happening underneath** describes authoritative simulation state.
- **What changes the outcome** lists interacting factors.
- **Common misunderstandings** explains behaviour that may initially look wrong.
- **Related discoveries** names events that should link to the entry.

The encyclopedia explains implemented behaviour. It does not claim that the simulation is a validated biological model, and it does not guarantee ecological balance.

---

# Contents

1. [The simulation at a glance](#1-the-simulation-at-a-glance)
2. [Core-mechanics ontology](#2-core-mechanics-ontology)
3. [Species](#3-species)
4. [Physiology and survival](#4-physiology-and-survival)
5. [Life stages and capability](#5-life-stages-and-capability)
6. [Perception, evidence and uncertainty](#6-perception-evidence-and-uncertainty)
7. [Memory and learning](#7-memory-and-learning)
8. [Decisions, plans and priorities](#8-decisions-plans-and-priorities)
9. [Communication and visible state](#9-communication-and-visible-state)
10. [Relationships and personal space](#10-relationships-and-personal-space)
11. [Groups, meta-groups and goals](#11-groups-meta-groups-and-goals)
12. [Leadership, disagreement and departure](#12-leadership-disagreement-and-departure)
13. [Courtship, mate choice and mating](#13-courtship-mate-choice-and-mating)
14. [Pregnancy, birth and caregiving](#14-pregnancy-birth-and-caregiving)
15. [Predation and defence](#15-predation-and-defence)
16. [Resources and acquisition](#16-resources-and-acquisition)
17. [Weather, seasons and landscape](#17-weather-seasons-and-landscape)
18. [Death, carcasses and ecological succession](#18-death-carcasses-and-ecological-succession)
19. [Generations, ancestry and family trees](#19-generations-ancestry-and-family-trees)
20. [Observation, privacy and diagnostic views](#20-observation-privacy-and-diagnostic-views)
21. [Discovery-event catalogue](#21-discovery-event-catalogue)
22. [Troubleshooting surprising behaviour](#22-troubleshooting-surprising-behaviour)
23. [Glossary](#23-glossary)

---

# 1. The simulation at a glance

Living Laboratory is an open-ended generational animal-society simulation. You observe rather than command. Animals seek food, water, safety, rest, social support, mates and care using only the information available to them.

What appears to be one action is usually the visible end of a longer process:

```text
world condition
→ perceived evidence
→ attention and memory
→ need and dependency assessment
→ possible methods
→ feasible action
→ consequence
→ new memory and social history
```

The same situation can therefore produce different behaviour in different animals. Two grazers beside the same stream may have different memories, fatigue, pregnancy states, relationships or group duties. Two hunters looking at the same prey may estimate the opportunity differently.

## What the simulation does not do

- It does not give animals perfect knowledge of the world.
- It does not guarantee that the most urgent meter causes the next action.
- It does not force every group member to obey a leader.
- It does not guarantee reproduction, survival or population equilibrium.
- It does not treat every nearby animal as a friend or group member.
- It does not script a fixed story for a particular individual.

---

# 2. Core-mechanics ontology

## Needs are goals; actions are methods

A flat hierarchy asks, “Which need has the largest score?” Living Laboratory must also ask, “What method can satisfy it, and what does that method require?”

The result is a dependency graph:

```text
Need
├── method A
│   ├── prerequisite
│   ├── prerequisite
│   └── executable phase
└── method B
    ├── prerequisite
    └── executable phase
```

For example:

```text
WATER
└── drink at reachable surface water
    ├── usable water evidence
    ├── locomotion capacity
    ├── reachable shoreline
    ├── direct contact
    └── correct facing and stillness
```

If an exhausted animal reserves water as its survival goal, **resting is part of the water plan**. It is not abandoning thirst. After recovery, the plan returns to travel, shoreline alignment and drinking.

```text
ANIMAL FOOD
├── feed from carcass
│   ├── carcass evidence
│   ├── access or ownership resolution
│   └── feeding capacity
└── hunt prey
    ├── adequate hydration
    ├── hunting endurance
    ├── prey evidence
    ├── viable pursuit
    └── acceptable risk
```

The dependency model explains why a starving hunter may seek water, rest, scavenge or search rather than immediately chase visible prey.

## Re-evaluation

Plans are not scripts that must finish. The animal re-evaluates after phases and when circumstances change. New danger, lost evidence, group communication, injury, exhaustion or a closer resource can replace the method while preserving the underlying need.

## Failure and recovery

A method can fail because the evidence was stale, the route was invalid, the resource was exhausted, contact could not be established or another animal changed the situation. Failed resource destinations should lose confidence and should not be selected forever. Successful exact contacts become stronger memories.

---

# 3. Species

The current world contains two generalized species. They are deliberately readable simulation archetypes, not replicas of one real animal.

## Valley Grazer

**Diet:** plants  
**Adult mass:** 65 simulation mass units  
**Maturity:** 80 ecological days  
**Old age:** 310 days  
**Maximum age:** 420 days  
**Gestation:** 60 days  
**Dependency:** 48 days  
**Typical litter:** one offspring

### What you can observe

Valley Grazers graze or browse, travel to remembered forage and water, watch for danger, communicate threats, join familiar animals, shelter in herds, defend young and sometimes confront predators collectively.

### What is happening underneath

Their plant food is widely distributed but varies by cell, season and growth. Their stronger social tendency makes nearby compatible animals valuable for vigilance and defence. They can still leave groups, reject leaders, compete or become isolated.

### Hydration profile

The current model treats the Valley Grazer as a moderately drought-tolerant ruminant. Its fluid reserve curve delays the most severe clinical effects compared with the hunter. Moist forage also contributes some hydration.

## Ridge Hunter

**Diet:** meat  
**Adult mass:** 42 simulation mass units  
**Maturity:** 95 ecological days  
**Old age:** 275 days  
**Maximum age:** 360 days  
**Gestation:** 90 days  
**Dependency:** 65 days  
**Typical litter:** two to four offspring

### What you can observe

Ridge Hunters patrol, evaluate prey, remember prey areas, track scent, stalk, chase, attack, abandon costly hunts, recover, feed from carcasses, claim kills, yield to competitors and coordinate with familiar hunters.

### What is happening underneath

Food acquisition is episodic and expensive. Hydration and endurance are prerequisites for ordinary hunting. A carcass is often a lower-cost solution than a chase. Prey visibility alone is not sufficient: the hunter also considers condition, distance, evidence, commitment, previous failures and herd defence.

### Hydration profile

The hunter uses a generalized mammalian carnivore profile with tighter dehydration thresholds. Fresh prey and carcasses provide some moisture, but this does not remove the need for reliable water planning.

## Species difference is not destiny

Species defines broad constraints; individual traits and history produce variation. A highly social hunter and an independent grazer remain possible within their species’ bounds.

---

# 4. Physiology and survival

## Body fuel

The selected-animal diagnostic separates three related reserves:

- **Fat** is long-term stored condition.
- **Stomach** is recent intake and digestive fullness.
- **Water** is remaining hydration reserve.

An animal can have a full stomach while possessing poor long-term condition, or carry fat while urgently needing water. The values are related but not interchangeable.

### Feeding states

| Stomach | Feeding state |
|---:|---|
| below 8 | Starving |
| 8–21 | Very hungry |
| 22–37 | Hungry |
| 38–51 | Mildly hungry |
| 52–67 | Satiated |
| 68–81 | Full |
| 82–93 | Stuffed |
| 94–100 | Over-stuffed |

Ordinary eating is limited when the stomach is sufficiently full and by a short interval after the previous meal. An animal cannot solve every future food need by eating without limit.

## Hydration

The displayed water bar is a reserve, not a literal one-to-one percentage of body-mass water loss. The model converts used reserve into species-specific fluid deficit.

| Species | Mild | Moderate | Severe | Critical | Fatal-risk threshold |
|---|---:|---:|---:|---:|---:|
| Valley Grazer | 5% deficit | 8% | 11% | 15% | 19% |
| Ridge Hunter | 4% deficit | 6% | 8% | 10% | 12% |

### Progressive consequences

- **Mild:** small movement, perception and recovery penalties.
- **Moderate:** meaningful impairment; mating is disabled and optional hunting becomes unsuitable for hunters.
- **Severe:** no sprinting, hunting or mating; major speed, perception and endurance-recovery loss; health damage begins.
- **Critical:** severe exhaustion and organ damage accumulate; fatal risk begins after the species threshold.

Death results from accumulated consequences rather than an instantaneous “water reached zero” switch.

### Demand modifiers

Hydration demand rises with heat, movement, fleeing, chasing, attacking, pregnancy and lactation. Body scale also contributes. Grazers receive moisture from vegetation; hunters receive moisture from fresh carcasses. Drinking gain scales with elapsed ecological time so observation-speed modes remain comparable.

## Endurance, sprint and emergency exertion

- **Endurance** supports sustainable movement and recovers through appropriate rest.
- **Sprint** supports short bursts such as fleeing or chasing.
- **Emergency energy** permits extraordinary exertion when circumstances justify it.

Dependent babies cannot use the full sprint or emergency system. Juveniles and young adults recover from overexertion more readily. Adults can incur lasting cost; old animals face the greatest danger from repeated emergency exertion.

An animal at zero endurance is not merely “slow.” It may be unable to complete a resource route or hunt until recovery becomes a prerequisite inside the plan.

## Health and lasting injury

Current health is bounded by a recoverable health cap. Acute injury can reduce current health; lasting harm can reduce the cap itself. A health bar therefore distinguishes:

- health currently available;
- recoverable empty capacity;
- permanently unavailable capacity.

A fully recovered animal can remain permanently impaired if its cap was reduced.

## Temperature stress

Heat and cold affect needs and outward expressions. Heat raises hydration demand. Severe thermal stress can change movement, rest and resource choices. A sweating or trembling face is an observable bodily cue, not a private thought.

---

# 5. Life stages and capability

## Dependent young

Dependents require caregiver support and possess restricted capabilities. They seek mothers, registered caregivers or surviving relatives, communicate separation and can become abandoned. They do not have adult reproductive actions.

## Juvenile

Juveniles are independent enough to move and explore but remain physically and socially immature. Their movement can be more sporadic. They may sprint, tire, fall behind and issue wait-up or young-contact calls.

## Young adult

Young adults gain broader independence and, after species maturity, reproductive eligibility. Dispersal, mate seeking and new group membership become important sources of social change.

## Adult

Adults have full physical, reproductive, caregiving, conflict and leadership possibilities, subject to individual condition and traits.

## Old

Old animals can retain extensive resource, social and family histories. They may be parents, grandparents or more distant ancestors. Their experience can support leadership, but reduced condition may eventually favour succession.

## Presentation eligibility

The interface should not display a biologically impossible private option merely because an icon exists. Pregnancy is female-only; mating details are hidden for ineligible young; baby sprint and emergency bars are absent; presentation follows simulation capability.

---

# 6. Perception, evidence and uncertainty

## Sensory channels

Evidence can arrive through:

- current sight;
- smell or scent;
- hearing;
- an outward visual signal;
- remembered evidence;
- inference;
- internal bodily evidence.

Each item can retain a target or location, confidence, uncertainty, age, sender and original channel.

## Stable sensing

Animals sense from a stable spatial snapshot during the tick. This prevents array order from allowing one animal to observe a world state that another same-tick animal could not.

## Attention is limited

Being inside theoretical sensory range does not mean every contact receives equal attention. Urgency, novelty, relevance, confidence and current goals affect which evidence influences a decision.

## Communication does not grant omniscience

A danger warning says that the sender detected danger. The receiver may learn the sender, approximate origin, urgency and type of concern without gaining the predator’s exact current coordinates.

## Fog of knowledge

Knowledge views distinguish:

- currently observed information;
- remembered but uncertain information;
- communicated or inferred information;
- unexplored or unknown space.

This is why an apparently obvious resource or predator can still be absent from an animal’s plan.

---

# 7. Memory and learning

## Short-term observations

Recent sights, sounds, scents, calls and interactions are retained briefly. As direct evidence ages, it becomes memory while preserving where it originally came from.

## Resource memory

Animals can remember food, water and carcass locations. Starting memories are deliberately vague rather than perfect. Vague knowledge defines a search region; precise successful contact defines a stronger destination.

When an animal reaches an uncertain location and finds nothing, the memory should lose confidence and acquire a “resource absent here” result. The same disproven estimate should not be selected immediately forever.

## Social memory

Animals can remember individuals, not merely species categories. Social memory can include familiarity, trust, care, conflict, threat, mating history and pregnancy awareness.

Consequences include:

- fleeing earlier from a predator that previously caused injury;
- approaching a familiar caregiver;
- preferring a trusted group member;
- distrusting a leader after repeated conflict;
- responding differently to a known mate;
- remembering a group member’s death or departure.

## Strategic group memory

Group history records events such as member loss, voluntary departure, dependent abandonment and leadership succession. Loss can preserve a remembered desired group size and influence later social pressure.

## Memory is bounded

Animals cannot accumulate unlimited perfect history. Memory lists have finite capacity, and old or weak evidence can be displaced. This keeps cognition selective and simulation work bounded.

---

# 8. Decisions, plans and priorities

## Candidate actions

At a decision point, the simulation produces feasible candidates. Each candidate combines a drive, evidence, capability, cost, context and score. The chosen trace captures the reason at that moment.

Later contacts do not rewrite the old reason. If an animal started travelling because of remembered water and subsequently saw a predator, its earlier trace remains historically accurate.

## Short, medium and long horizons

- **Immediate:** survive the present encounter or complete the next necessary phase.
- **Short-term:** acquire water, food, rest, contact or safety.
- **Medium-term:** restore reserves, maintain group safety, support pregnancy or improve opportunity.
- **Long-term:** survive, reproduce, preserve relationships and maintain viable social organisation.

These horizons can disagree. A long-term need for water can produce an immediate decision to rest.

## Reservation without deadlock

An urgent need can remain the terminal goal while prerequisites temporarily control execution. Reservation must not trap the animal into repeatedly attempting an impossible phase. Recovery, search, route correction and memory invalidation belong inside the plan.

## Why behaviour changes

Behaviour is reconsidered when physiology, evidence, route feasibility, nearby entities, group goals or world conditions change. Apparent indecision can be real re-evaluation; rapid oscillation without changed evidence may indicate a scheduling defect and should be visible in diagnostics.

---

# 9. Communication and visible state

## Private thought

The thought cloud belongs to the selected animal. It represents the current private leading priority. It is not an outward signal and should not appear for an unselected animal under ordinary observation.

Cloud tone communicates agreement:

- pale or green-grey: private priority and outward signal align;
- darker grey: private priority and public signal differ;
- neutral: no public signal is active.

## Facial expression

Faces are externally visible presentation: calm, fear, pain or poor health, aggression or rejection, heat stress, cold stress and fatigue. They do not reveal precise internal scores.

## Public signals

Rounded badges show outward communication or display. Vocal signals use sound arcs and a verb such as **CALLS**, **WARNS** or **REQUESTS**. Non-vocal outward displays omit the arcs.

Important signal families include:

- dependent care request;
- caregiver or family separation;
- young social contact;
- adult herd or pack contact;
- wait-up request;
- danger warning;
- recent physical strike;
- distress;
- ongoing injury;
- critical thirst or hunger;
- heat or cold stress;
- courtship.

## Notable action

Hexagonal badges represent a visible action such as grazing, tracking, guarding, stalking or feeding. Emergency cues take precedence so several badges do not pile up and obscure the animal.

---

# 10. Relationships and personal space

## Personal space

Each animal has an individually variable personal-space radius. Traits, species, maturity, familiarity, context and aggression influence tolerance.

Crossing that space creates a social opportunity, not an automatic fight. Possible responses include:

- ignore;
- orient or watch;
- tolerate;
- greet or communicate;
- approach or affiliate;
- form or reinforce a group;
- court;
- warn or displace;
- call allies;
- fight;
- protect a dependent.

## Trust and conflict

Trust can grow through proximity, coordination, caregiving and successful shared activity. Conflict burden can grow through aggression, competition, abandonment, leader mismatch and repeated disputes.

## Care is not courtship

Parental care, dependent contact and pregnancy support are separate from reproductive affection. Hearts are reserved for courtship and pair affection; care uses family, shelter or request imagery.

## Individual recognition

Where memory supports it, reactions can target a known individual. “A carnivore is dangerous” and “this specific carnivore injured me” are different knowledge states.

---

# 11. Groups, meta-groups and goals

## Ordinary groups

Ordinary groups are cohesive social units. They can be pairs, families, same-sex groups, reproductive associations, hunting parties or packs. Their identity is based on compatibility and continuing organisation, not only population count.

## Meta-groups

A meta-group is a larger proximity-and-movement structure composed of several groups and possibly individuals. A herd is the primary example. It forms because nearby units move with compatible purpose and benefit from collective protection.

An individual animal is not a one-member group. At middle map zoom it may still receive a marker so the player can inspect the world more granularly.

## Group goals

Current goal classes include:

| Goal | Typical trigger | Group response |
|---|---|---|
| Protection | High fear or threat evidence | Cluster, flee, guard, warn or defend |
| Pregnancy support | Known pregnant member | Stay near support, safer resources and lower-risk activity |
| Caregiving | Dependent or vulnerable young | Maintain contact and assistance |
| Water | Strong member thirst | Follow water knowledge and travel feasibility |
| Foraging | Grazer food pressure | Move toward usable vegetation |
| Hunting | Hunter food pressure | Search, patrol or pursue viable prey |
| Carcass hunt | Known carcass | Coordinate travel, ownership and feeding |
| Mates | Reproductive pressure | Seek eligible social opportunity |
| Travelling | No stronger shared need | Move with the group’s leader or direction |

Goal selection considers the group’s members, not an abstract group meter. A single severe emergency can redirect the collective goal.

## Group and personal conflict

Membership does not eliminate autonomy. An animal can follow, delay, meet an urgent personal prerequisite, disagree, influence the group or leave.

---

# 12. Leadership, disagreement and departure

## Goal-specific leadership

Leadership suitability depends on the goal:

- water skill for a water journey;
- food knowledge for foraging;
- scent, aggression and hunting ability for predation;
- care affinity, stability and resource competence for caregiving or pregnancy support;
- mate skill for reproductive coordination;
- balanced resource competence for ordinary travel.

Age and experience often help, but they are preferences rather than absolute rules.

## Stability and succession

A challenger must offer a meaningful advantage. Tenure discourages constant switching. Leadership becomes easier to replace when the leader is exhausted, injured, unhealthy or poorly matched to the current goal.

## Voluntary departure

Departure pressure can grow from:

- crowding;
- resource scarcity or competition;
- leader distrust;
- disagreement with the group goal;
- accumulated grievance;
- maturation and dispersal;
- mate-seeking pressure;
- personal emergency.

Departure can be temporary or permanent. The former member maintains distance and cannot immediately rejoin the same group. Remaining members remember the event; succession may occur if the leader left.

## Involuntary separation

Falling behind, fleeing, resource travel or blocked movement can separate an animal without a deliberate decision to leave. Diagnostics should distinguish separation from voluntary departure.

---

# 13. Courtship, mate choice and mating

## Eligibility

Courtship requires maturity, compatible sex and species rules, reproductive readiness, condition and cooldown availability. Juveniles do not receive mating actions merely because another animal is nearby.

## Preference and social history

Females can evaluate mate condition, aggression compatibility, familiarity and remembered ratings. Mating is therefore not random adjacency.

## Visible sequence

| Stage | Duration |
|---|---:|
| Courtship | 8 minutes |
| Acceptance period | 5 minutes |
| Mating | 2–12 minutes |
| Conception resolution | 3 minutes |
| Rejection display | 3 minutes |
| Rejected-pair cooldown | 60 minutes from rejection decision |

A successful visible interaction lasts 18–28 minutes before conception resolves. A rejected attempt reaches visible rejection after 11 minutes.

## Cooldowns

- Female successful-mating cooldown: 60 minutes after mating.
- Male cooldown: 30–99 minutes, influenced by fluctuating libido.

## Conception

Mating does not guarantee pregnancy. Conception is resolved after the visible sequence and a further condition check.

## Reproductive association

A harem or other reproductive association should be understood as an emergent social grouping: repeated accepted preferences, compatibility, leadership and continued proximity. Its event explanation must identify the actual participating relationships rather than imply a scripted structure.

---

# 14. Pregnancy, birth and caregiving

## Fertility and gestation

| Species | Fertility cycle | Fertile window | Gestation |
|---|---:|---:|---:|
| Valley Grazer | 28 days | First 6 days | 60 days |
| Ridge Hunter | 36 days | First 7 days | 90 days |

## Pregnancy physiology

Hydration demand increases with pregnancy progress. The late stage is more demanding than the early stage, and additional offspring can add demand. Pregnancy also changes safe exertion and social priorities.

Pregnant animals begin with protected starting reserves when spawned. A pregnant hunter should avoid unnecessary hunting when food condition is adequate; survival planning can prefer rest, water, safety, scavenging or support.

## Pregnancy-support network

A pregnant female can seek reliable companions and remain near known water and food. Group members who become aware of pregnancy can adopt pregnancy support as the group goal. Awareness is acquired, not magically shared.

Trust matters. Support is strongest when companions are familiar, caring, capable and not currently overwhelmed by danger or their own emergencies.

## Labour and birth

The visible labour/birth event lasts 15 minutes. A suitable father may attend when alive, healthy, sufficiently energetic, calm enough and compatible with the female’s preferences.

## Dependency and postpartum recovery

| Species | Offspring dependency | Maternal postpartum period |
|---|---:|---:|
| Valley Grazer | 48 days | 31.2 days |
| Ridge Hunter | 65 days | 42.25 days |

Postpartum recovery is currently 65% of dependency duration. Females cannot return to a fertile mating state during this period.

## Caregiving network

Care can include nursing, protection, waiting, responding to calls and maintaining contact. Biological parenthood and actual caregiving are recorded separately. If a parent dies, known adult relatives—including grandparents—may become relevant.

## Caregiver conflict and abandonment

Caregivers are autonomous individuals. They can dispute care, fight one another, aggress against a dependent or withdraw. Abandonment is remembered by the dependent, former caregivers and relevant group members.

---

# 15. Predation and defence

## Hunting sequence

```text
prey evidence
→ evaluate opportunity
→ stalk or intercept
→ chase
→ attack
→ kill or lose prey
→ claim, yield or guard carcass
→ feed
→ recover
```

Every arrow can branch. A hunter may listen, search, follow scent, abandon after repeated failure, switch to a carcass or suppress hunting because condition is unsuitable.

## Purposeful patrol

A patrol uses prey memory and area estimates. Hunters can remember approximate prey numbers, direction and potential calories, then move toward an interception area to update evidence.

## Hunt suppression

Hunting can be suppressed by:

- dehydration;
- fatigue or inadequate sprint reserve;
- injury or poor health;
- pregnancy when food is not urgently required;
- repeated failed strikes;
- poor prey opportunity;
- strong herd or caregiver defence;
- a safer available carcass.

## Herbivore reaction

A grazer can flee, warn, seek a herd, shelter, guard offspring, mob or attack. Response uses distance, remembered threat, protective motivation, aggression, condition, nearby adult grazers and nearby adult predators.

## Attack memory

Being physically struck is distinct from merely detecting danger. A strike receives emergency presentation precedence and creates stronger individual threat memory.

---

# 16. Resources and acquisition

## Water

Water is acquired only at real surface contact. The animal must reach an accessible shoreline, stop close enough and face the water. Drinking from a distant coordinate is invalid.

### Finding water

Possible routes include:

- current sight;
- recent exact memory;
- vague starting or map memory followed by local search;
- terrain clues;
- communication from another animal;
- widening exploration after a failed estimate.

Successful drinking strengthens an exact contact memory. Failure reduces confidence and prevents immediate stale-target reselection.

## Vegetation

| Resource | Nutrition | Growth | Maximum stock |
|---|---:|---:|---:|
| Grass | 1.0 | 0.055 | 1.0 |
| Shrub | 1.4 | 0.028 | 1.4 |
| Tree browse | 0.35 | 0.012 | 2.0 |

Plant availability is local. Grazing reduces the cell’s stock; growth depends on ecology and season.

## Carcasses

Carcasses contain finite biomass. Freshness affects moisture and presentation. Hunters can remember, approach, claim, guard, contest, yield and feed from them.

## Resource memory failure

If an animal repeatedly arrives at the same empty location, inspect whether the target is vague, disproven or blocked. The intended system treats remembered regions as search areas, not magic exact resources.

---

# 17. Weather, seasons and landscape

## Seasons

| Season | Plant-growth modifier | Temperature reference | Rain reference | Breeding modifier |
|---|---:|---:|---:|---:|
| Spring | 1.45 | 14°C | 0.42 | 1.00 |
| Summer | 1.08 | 24°C | 0.25 | 0.80 |
| Autumn | 0.82 | 11°C | 0.38 | 0.35 |
| Winter | 0.22 | 1°C | 0.22 | 0.00 |

These values interact with regional climate and generated terrain rather than imposing identical weather everywhere.

## Weather systems

Moving pressure systems combine humidity, wind, elevation uplift, rain shadow, seasonal temperature and storm strength. Weather changes local opportunity and cost; it is not merely decorative.

## Terrain

Elevation, slope, water, woodland and connected hexes influence routes, visibility, plants and habitat. A destination that is geographically close may still be mechanically difficult or unreachable.

## Observation timescales

The 30-, 60- and 180-minute observation modes accelerate ecological time while preserving visible interaction durations. Continuous physiological gains and costs use elapsed ecological time so the modes are intended to remain comparable.

---

# 18. Death, carcasses and ecological succession

## Causes of death

Animals can die from age, predation, injury, starvation, dehydration and interacting physiological collapse. The selected-animal explanation should preserve the actual cause and preceding plan failure.

## Selection transition

If a selected animal dies, selection moves to its carcass rather than silently disappearing. The carcass view preserves identity, cause, remaining biomass, age and decay stage.

## Decay sequence

```text
living animal
→ fresh carcass
→ decaying carcass
→ skeleton
→ removed remains
```

Feeding can reduce biomass before time alone advances the sequence.

## Group consequences

A death can create:

- a food resource;
- a group loss memory;
- reduced group size;
- caregiver loss;
- orphaned dependents;
- leadership succession;
- stronger threat memory;
- later pressure to rebuild social numbers.

---

# 19. Generations, ancestry and family trees

## Biological ancestry

The family tree preserves parents, offspring, ancestors and descendants. Depth labels include parent, grandparent, great-grandparent and corresponding descendants.

## Social ancestry

Caregiver history is distinct from biology. An animal can be protected by a grandparent, unrelated familiar adult or group caregiver. Conversely, a biological parent can abandon a dependent.

## Generational consequences

Across generations, current social structure reflects:

- which courtships were accepted;
- which pregnancies survived;
- who provided care;
- who dispersed;
- which leaders retained trust;
- which threats were remembered;
- which resources and climates permitted survival.

The simulation tracks history; it does not currently claim genetic evolution or inheritance of a scientifically validated genome.

---

# 20. Observation, privacy and diagnostic views

## Observation contexts

| Context | What it permits |
|---|---|
| Strategic | Aggregate identity, position and population organisation |
| Observable other | Externally visible body, movement, action, injury and outward signals |
| Selected self | Selected animal’s permitted private priority and diagnostics |
| Laboratory | Complete authorized internal state, traces, memory and history |

Presentation importance cannot override privacy. A dramatic event does not reveal private memory in ordinary external observation.

## Selected-animal view

The compact panel answers:

- **What?** Current action.
- **Why?** Captured decision reason.
- **Where?** Current destination or remaining position.
- **Group?** Membership, leader and goal.

Exact physiology is primarily visual around the selected animal. Long prose and complete histories remain in Laboratory.

## Decision trace

A trace records evidence and constraints at decision time. It is the best diagnostic for “why did it do this?” and should be available without forcing the player to navigate away from the selected animal.

## Isolated model and knowledge views

Isolated view can remove terrain presentation while retaining diagnostic overlays, detected entities, vague remembered entities, resources and direction. Knowledge fog remains a separate mode because “hide the map” and “show only what this animal knows” answer different questions.

---

# 21. Discovery-event catalogue

Discovery events teach unusual mechanics in context. Recommended structure:

```text
[Event title]
[One sentence naming the animals and concrete change]
[Learn how this mechanic works]
```

## Social discoveries

### Group formed
Two or more compatible animals established a continuing group and selected an initial goal.

### Meta-group formed
Several groups and individuals began moving together as a herd or larger coordinated structure.

### Leadership changed
A better-suited member replaced the leader after the stability and advantage conditions were met.

### Member departed
An animal deliberately left because departure pressure crossed its threshold.

### Caregiver conflict
Two caregivers disputed care, or a caregiver aggressed against or abandoned a dependent.

## Reproductive discoveries

### Courtship accepted or rejected
A potential mate evaluated the interaction and either continued or displayed rejection.

### Reproductive association formed
Repeated compatible social and mating relationships produced a continuing pair, harem or related structure.

### Pregnancy support established
A pregnant female and trusted companions adopted a safer collective goal.

### Birth
Labour completed and new dependent offspring entered the population and family tree.

### New generation milestone
An animal became a grandparent, great-grandparent or more distant ancestor.

## Survival discoveries

### Prerequisite recovery
An animal rested not because its terminal need disappeared, but because recovery was required to complete the plan.

### Resource memory disproven
An animal searched an expected region, found no resource and reduced confidence in the memory.

### Known threat recognized
A remembered individual changed the animal’s response before a new attack occurred.

### Herd defence
Nearby adults changed an attack into warning, mobbing, defence or counterattack.

### Hunt abandoned
A hunter ended pursuit because cost, condition, repeated failure or defence made continuation unsuitable.

Each event should open this encyclopedia at the exact entry rather than merely expanding the symbol legend.

---

# 22. Troubleshooting surprising behaviour

## “Why is the animal resting while desperately thirsty?”

The water goal may be reserved while endurance recovery is its current prerequisite. Check fatigue, route distance, remembered water confidence and whether the plan resumes after recovery.

## “Why can it see prey but is not hunting?”

Check hydration, fatigue, sprint reserve, injury, pregnancy, stomach state, carcass alternatives, recent failed strikes and nearby herd defenders.

## “Why is it travelling to empty terrain?”

It may possess vague or stale resource memory. Inspect evidence age, confidence, uncertainty and failed-arrival history. A valid plan should search locally, disprove the estimate and avoid immediate reselection.

## “Why is it drinking before the water bar looks critical?”

ETA matters. Distance, declining reserve, weather, pregnancy, lactation and expected future exertion can make early acquisition safer than waiting for a fixed threshold.

## “Why did it ignore a public warning?”

The signal may be weak, old, outside attention, contradicted by stronger evidence or insufficiently precise. Receiving a warning does not confer the sender’s full perception.

## “Why did a group member leave?”

Check leader trust, goal mismatch, grievance, crowding, scarcity, maturity, mate pressure and personal emergency. Distinguish an explicit departure trace from accidental separation.

## “Why did the leader change?”

The group goal may have changed, the former leader may be impaired or the challenger may have a sufficiently large goal-specific advantage after the stability period.

## “Why did the group patrol while a member was pregnant?”

Pregnancy must be known and sufficiently important to the members. If awareness and trust exist, pregnancy support should outrank ordinary patrol. The trace reveals whether awareness, grouping or goal selection failed.

## “Why did a child approach danger?”

Young animals act from incomplete categorization, familiar-adult needs and uncertain evidence. Inspect whether the animal recognized species, remembered a caregiver or interpreted the nearby individual as possible support.

## “Why did the animal die despite a nearby resource?”

Physical proximity in the true world is not enough. Check knowledge, route feasibility, shoreline or food contact, facing, exhaustion, decision cadence and whether another prerequisite deadlocked the acquisition plan.

---

# 23. Glossary

**Action** — The currently executed behaviour, such as rest, travel, graze, stalk or guard.

**Authoritative state** — Simulation truth that affects future outcomes and belongs in a save.

**Capability** — Whether an animal can currently perform an activity, considering age and physiology.

**Confidence** — Strength of evidence or memory.

**Decision trace** — Immutable record of the evidence, constraints and reason used when an action was selected.

**Dependency** — A condition that a need-satisfaction method requires before it can succeed.

**Discovery event** — A notable occurrence with a contextual explanation link.

**Evidence** — Perceived, remembered, communicated, inferred or internal information used in a decision.

**Group** — A continuing compatible social unit with members, goal and leader.

**Group goal** — The current shared problem around which members coordinate.

**Harem** — An emergent reproductive association involving one focal reproductive member and several compatible mates; not a scripted spawn category.

**Life stage** — Dependent, juvenile, young adult, adult or old.

**Memory provenance** — Where remembered information originally came from, such as sight or communication.

**Meta-group** — A larger proximity-and-movement organisation made from groups and possibly individuals, such as a herd.

**Method** — A route by which a need may be satisfied, such as drinking, grazing, scavenging or hunting.

**Personal space** — Individually variable social distance whose crossing can prompt interaction.

**Presentation state** — Visual explanation of truth; it does not independently control the simulation.

**Private thought** — Selected animal’s internal leading priority, not an outward signal.

**Public signal** — An observable vocal or non-vocal communication.

**Reservation** — Retaining a terminal need as the goal while executing prerequisite phases.

**Social memory** — Remembered information about particular individuals and interactions.

**Uncertainty** — Imprecision in evidence, especially estimated locations.

**Visual expression** — Externally observable face or bodily state, not private cognition.

