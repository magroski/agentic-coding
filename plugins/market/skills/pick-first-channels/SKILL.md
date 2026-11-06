---
name: pick-first-channels
description: Choose the first two distribution channels for a business idea from its channel map and the founder's constraints - at two funnel stages, one built and one partnered or rented - with each one's trade-off, first actions, measures and stop rule. Use when the user invokes it, or asks which marketing or acquisition channels to start with, how to reach first customers, or how to plan go-to-market for an idea. Not for researching channels or competitors; that is channel-map.
argument-hint: "<idea, or path to its channel map>"
---

# Pick first channels

Nobody runs 24 channels well at once. Start with two, at two different funnel stages: one you build, which is slow but compounds and stays yours, and one you partner on or rent, which brings customers while the built one grows.

This plans how buyers will reach the product. It assumes the idea is worth building. It does not test demand.

## 1. Read

- `docs/market/<idea-slug>/channel-map.md`. If none exists, run the `channel-map` skill first. If it was checked more than 90 days ago, say so, and re-check the cells you pick from.
- The channel catalog: `../channel-map/channels.md` from this skill's base directory.

## 2. Constraints

Ask what the map and the founder's notes leave open, in one numbered batch, each question with a recommended default, so the founder can reply `go` or `2: other answer`:

1. **Wait:** weeks until the first paying customer must arrive.
2. **Money:** monthly budget for ads, sponsorships and paid placements. Capital to buy a channel, if any.
3. **Time:** founder hours a week for distribution, and what an hour of it is worth.
4. **Assets:** audiences the founder or team already have (where, how big), and what they do well: writing, video, speaking, selling, building tools.
5. **Price:** expected price, and first-year revenue per customer.
6. **Users:** existing users, customers or a waitlist.

## 3. Filter

Run every channel on the map through the six checks. A failed hard check drops it.

| Check | Fails when | Drops it |
| :- | :- | :- |
| Buyers are there | The map's Reading lists it as Empty, or buyer answers rule it out | yes |
| Fits how they buy | Self-serve, but the channel isn't where buyers compare (stage 2). Sales-led, and the plan has no outreach, agency or event route (09, 18, 06) | no, flag it |
| The founder can run it | It needs an asset the founder lacks: a following, comfort on video, a sales motion. An engineer can always build a free tool (07), an integration (16), an agent surface (17) or search pages (11) | yes |
| Pays off in time | Its first signal comes after the Wait (windows below) | yes |
| Can be measured | Its customers can't be counted within the window | yes |
| The audience fits | The venue's audience is big but isn't the buyer | yes |

Modes filter too. Rent needs a budget. Acquire needs capital. Partner needs a named venue in the map's Venues column. Stage 4 channels (23, 24) need existing users: without them, record channel 23 as a product decision for later, not a pick.

Ads and launches bring visitors fast; search, YouTube, newsletters and communities take longer to build. Default windows to a first signal, which the founder can change:

| Mode | Window |
| :- | :- |
| Rent, and launches (14) | 2-4 weeks |
| Partner | 4-8 weeks |
| Build | 12 weeks |

## 4. Pick two

Rank what survives: Open before Owned (the map's Reading), then buyer evidence, founder fit, and time to a first signal. Pick two that satisfy:

- **Different stages.** Two in one stage leave the other stages to competitors.
- **One Build, one Partner or Rent.** The built one stays yours; the other brings customers now.

The source's example: partner in stage 1, build in stage 2.

If no pair satisfies both rules (no budget and no partner venue, say), break the one that costs less and record why in Decisions.

Show the shortlist and the two picks, one line of reason each. The founder confirms or swaps.

## 5. Plan each pick

| Mode | You | How fast | You keep | Watch for |
| :- | :- | :- | :- | :- |
| Build | create and own it: site, newsletter, channel, community | slowest | the audience, content and data | a person's audience on X, LinkedIn, TikTok or Instagram leaves with them |
| Partner | reach buyers through someone they trust: creator, affiliate, agency, integration, community | faster than building | the relationship stays with the partner | an audience you hire still belongs to them |
| Rent | buy access: ads, sponsorships, paid placements | from day one of a campaign | access, while you pay | what each customer costs, and whether they stay |
| Acquire | buy an existing channel or business | an audience on day one | what transfers after the sale | the audience came for the previous owner's work |

For each pick:

- **Trade-off:** its row above.
- **Venues:** named partners or placements from the map, with audience size.
- **First two weeks:** 3-5 concrete actions, each owned by the founder or an agent.
- **Measures:** where each of the four below will come from.
- **Stop rule:** by <today + window>, cost per customer above <limit> drops it for the next runner-up. No customers counts as above. Default limit: a third of first-year revenue per customer. Customers lag on a Build channel, so it may use a leading signal instead (subscribers, rank, members) with a target the founder sets.

| Measure | What it counts |
| :- | :- |
| Reach | People it reached. |
| Customers | People who became paying customers. Engagement isn't sales: keep likes and views out. |
| Cost | Money spent plus founder and team hours, at the hourly value from step 2. |
| Retention | Whether those customers stay, and what they spend over time. |

Attribution: a free-text "How did you hear about us?" at signup or checkout, because podcasts, word of mouth and creator posts rarely show in click tracking. A ref or UTM link per partner and campaign.

### Acquiring a channel

Only when a pick is Acquire. Before any offer, check:

1. Its readers, viewers or members match the buyer.
2. Subscriber consent and data-transfer rules allow emailing the list.
3. What leaves with the seller: an audience that came for one person can follow them.
4. Who stays after the sale: the team, contributors, members.
5. Where its traffic comes from: a site living on search rankings can lose it in one update.
6. How the product will be introduced: a publication that starts promoting its new owner can lose the trust that made it worth buying.

Buying is a one-way door. The founder decides, from these answers.

## 6. Write

`docs/market/<idea-slug>/first-channels.md`:

```markdown
# First channels: <idea>

Decided: YYYY-MM-DD · Map: [channel-map.md](channel-map.md), checked YYYY-MM-DD

## Constraints
Wait: <n> weeks · Paid budget: <amount>/month · Capital: <amount or none>
Founder time: <h>/week at <amount>/h · Price: <price>, first-year revenue per customer <amount>
Assets: <…> · Users: <…> · Buys by: <…>

## Shortlist
| # | Channel | Stage | Mode | Buyers there | Competitors | Founder fit | First signal | Measurable |
| :- | :- | :- | :- | :- | :- | :- | :- | :- |

Dropped: <#> <channel>: <failed check>; …

## Picks

### 1. <channel> · stage <n> · <mode>
Why: <one line>
Trade-off: <how fast> · keeps <…> · watch for <…>
Venues: <name (audience)>, …
First two weeks:
1. <action> (<owner>)
Measures: reach <source> · customers <source> · cost <source> · retention <source>
Stop rule: by YYYY-MM-DD, cost per customer above <amount> → <runner-up>

### 2. <channel> · stage <n> · <mode>

## Attribution
<the signup question, and the link scheme>

## Runners-up
1. <#> <channel>: <why not now>

## Results
| Date | Channel | Reach | Customers | Cost | Retained | Call |
| :- | :- | :- | :- | :- | :- | :- |

## Decisions
- <decision>, because <reason> (founder, YYYY-MM-DD)
```

Report the two picks, their stop dates and the doc's path.

## Reviewing

On a stop date, or when the founder brings numbers: add a Results row per channel and apply its stop rule. Replace a dropped channel with the first runner-up that still passes step 3, planned as in step 5, and add a Decisions line.
