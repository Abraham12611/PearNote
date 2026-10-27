# Gamification — XP, streaks, quests, achievements, trophy hunts

## Purpose and ethics

Rewards should **recognize meaningful learning**, reinforce return habits and make the spatial world feel alive. Avoid exploitative infinite loops, shame-inducing streaks, pay-to-win grade advantages or encouraging mindless AI calls. A beautifully decorated world is only valuable if actual understanding grows.

## Phase 1 minimalist economy

| Event | Example XP | Rule |
|---|---:|---|
| Qualified challenge completion | 10 | server-evaluated, per-unique activity or bounded retry |
| Objective demonstrated | 25 | first qualified demonstration for objective in rule version |
| Teach-back meeting rubric | 30 | only if independent evidence; deduped |
| Focused remediation completed | 15 | actual successful reassessment |
| Unit achievement | 50 | all required objectives demonstrated |

Amounts are **initial design constants**, not implemented/validated pricing. A `rewards` function is server-authoritative and records a unique `eventKey` in `xpLedger`. Failed network retry ≠ more XP. A student who asks AI for the direct answer should still learn but might not qualify for the same independent-assessment reward.

## Streak and quests

Qualified day means at least one assessed learning interaction; merely opening the site doesn't count. Support timezone-safe local day, flexible weekly goals and grace days. Daily/weekly quests are optional: `practice 2 objectives`, `review yesterday's concept`, `teach back one idea`; do not require arbitrary time-on-site.

## Trophy taxonomy

- **First Chapter:** first independently demonstrated unit.
- **Deep Thinker:** successfully revisited a difficult concept after remedial practice.
- **Study Buddy:** completes a genuine shared learning session.
- **Explorer:** inspects linked sources and finishes a meaningful discovery exercise.
- **Comeback:** returns for a scheduled review and demonstrates retention.
- **Subject Scholar:** sustained high-quality evidence across subject objectives.

Every trophy has ID, criteria, icon asset, rarity/season, earnedAt, verificationEvent, revocation policy and accessible description. Trophies are symbolic, not formal academic credentials.

## Spatial trophy / perk hunt — the differentiator

A locked chest, torn note, puzzle seal, collectible specimen, or small floating illustrated artifact can appear inside a lesson world. Selecting it reveals a **real learning objective**. When the student demonstrates understanding (not merely presses a button), the artifact unlocks. Collected art can be placed on a Home shelf or profile wall. Some can be *discovered* via optional concept exploration rather than a simple checklist.

## Cosmetic collection and leveling

XP contributes to player level/visual flair only. Earnable cosmetics: avatar frames, subject-specific stickers, nameplate treatments, board decorative themes, trophy props, learning-path embellishments. Future seasonal galleries and group achievements. No advantage in assessments for paying users or XP whales.

## Leaderboards and leagues (Phase 4+)

Opt-in and friends/private group by default. Rank by defined qualified events, not raw click count or hours; short seasons and anti-cheat checks. Users may hide XP and turn off competitive features. Consider cohort fairness and avoiding disclosure of learning difficulties.

## Reward back end

`xpLedger(eventKey,userId,amount,ruleVersion,evidenceId)`; `userRewards(rewardId,userId,evidenceKey,earnedAt)`; `streaks`; later `quests` and `questProgress`. Transactionally check eligibility and unique grant. Never award from user-provided `amount`. Recompute totals from ledger for repair/audit.

## Tests and analytics

Duplicate retry, same answer farm, backdating/timezone switch, quiz reset, unauthorized reward grant, reduced-motion celebration, visibility for private profile, weekly disengagement after streak break. Measure delayed recall and repeated practice, not just XP earned.
