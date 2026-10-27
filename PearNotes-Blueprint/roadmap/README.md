# Multi-phase delivery roadmap — index and dependency graph

**Planning baseline:** October 27, 2026. **Phase 1 deadline:** November 4, 2026 at 9:00 p.m. ET (verify final organizer instructions). Current accepted hackathon track is not known; do not represent selected track as changed.

| Phase | Target result | File |
|---|---|---|
| **0** Foundation & migration | Clean pinned fork, auth and canvas preserved, Meta proof | [PHASE_00.md](PHASE_00.md) |
| **1** Hackathon Edition | End-to-end upload→subject→path→lesson→adaptation→resume + one live group room | [PHASE_01.md](PHASE_01.md) |
| **2** Complete platform | Library, subject updates, more widgets, production-quality core UX | [PHASE_02.md](PHASE_02.md) |
| **3** Advanced learning intelligence | Knowledge graph, calibrated mastery, spaced revision, path adaptation | [PHASE_03.md](PHASE_03.md) |
| **4** Rewards and play | Trophy hunting, XP, quests, streaks, optional leagues | [PHASE_04.md](PHASE_04.md) |
| **5** Multiplayer | Group HQ, specialized rooms, group activities and project tools | [PHASE_05.md](PHASE_05.md) |
| **6** Multimodal & simulation | Audio/video/PPTX/DOCX, discipline-specific widgets, interactive models | [PHASE_06.md](PHASE_06.md) |
| **7** Production & scale | Security, accessibility, operations, payments, service levels | [PHASE_07.md](PHASE_07.md) |
| **8** Growth ecosystem | Educators, schools, creators, integrations and research | [PHASE_08.md](PHASE_08.md) |

## Cross-phase ordering

`0 → 1 → 2` is mandatory. Phase 3 depends on lesson/attempt contracts in phases 1–2. Phase 4's initial ledger starts Phase 1, broader gamification follows. Phase 5 basic multiplayer starts Phase 1, full group experience after production-quality permissions. Phase 6 source adapters reuse common source segments. Phase 7 baseline security is **not deferred**: essential access control starts Phase 0. Phase 8 depends on usage evidence and support capacity.

## Terminology

Each phase contains ordered **sub-phases**, deliverables, implementation tasks, acceptance tests, out-of-scope decisions, dependencies and go/no-go gate. Long-term time ranges are directional, not commitments. Track features by status: `proposed`, `in_progress`, `verified`, `shipped`, `deferred`.

## One explicit scope-control policy

For Phase 1, if core generation fails, stop polishing cosmetics. If interactive lesson/attempt persistence fails, stop adding reward types. If the adaptive branch fails, constrain it to a verified template. If multiplayer fails, demonstrate stable inherited behavior but never pretend it is synchronized. Quality beats unchecked feature breadth.
