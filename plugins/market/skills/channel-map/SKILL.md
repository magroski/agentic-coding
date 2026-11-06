---
name: channel-map
description: Map where a business idea's buyers find, compare and get recommended products - 24 distribution channels in 4 funnel stages - and which competitors hold each, from researched evidence. Shows which stages competitors own, which are open, and the signals that reaching buyers will be too expensive. Use when the user invokes it, or wants to research competitors' distribution, go-to-market or acquisition channels, or how buyers find products in a market, for a new or existing idea. Not for choosing which channels to run; that is pick-first-channels.
argument-hint: "<idea, or path to an existing channel map>"
---

# Channel map

Where buyers in this market find products, and who already reaches them there. A better product still loses the customers it never reaches. A new entrant's opening is the stage where nobody reaches buyers yet.

Evidence, not opinion: every grade on the board links to what was seen. The founder decides from the reading. The `pick-first-channels` skill plans from the board.

The channels, their stages, their modes and how to check each are in `channels.md` in this skill's base directory. Read it first.

## 1. Locate

Doc: `docs/market/<idea-slug>/channel-map.md` in the current project. If it exists, revise it (see Revising).

## 2. Frame

From the idea, draft:

- **Buyer:** who pays, and who uses it if different. A role in a situation, not a demographic: "owner of a 2-10 chair salon who takes bookings by WhatsApp".
- **Job:** what they hire a product for, in their words.
- **Buyer questions:** 3 things they would type into a search box or an AI assistant before buying, e.g. "best booking app for small salons".
- **Market:** country and language.

Ask only what the idea leaves open, in one numbered batch, each question with a recommended default, so the founder can reply `go` or `2: other answer`. In the same batch, ask for competitors they already know and any customer or prospect notes.

## 3. Pick competitors

Search the buyer questions, "<known competitor> alternatives", and the category on review sites. Keep up to 6:

- **Direct:** same job, same buyer. Prefer the ones with the most evidence of customers: reviews, installs, team size.
- **Substitutes:** what buyers use instead, such as a spreadsheet, an agency or a generic tool. At most 2. Doing nothing has no channels: note it and move on.

For each, record the URL, entry price, and how it sells: public prices with a free plan or trial is self-serve; "book a demo" or "contact sales" only is sales-led.

## 4. Research

Spawn one `general-purpose` subagent per competitor and one for the category, all in one message so they run together. Give each the buyer, the market, the buyer questions, the path to `channels.md`, the grade table below, and:

- **Competitor agents:** the competitor's name and URL. Check all 24 channels with the "Check a competitor" column.
- **Category agent:** the "Check the category" column. Name the venues buyers already use, with audience size where stated: newsletters, channels, creators, podcasts, communities, events, marketplaces, directories, agencies, affiliates.

Each returns one row per channel: `<#> | <grade> | <evidence, one line, with numbers> | <source URL>`.

| Grade | Means |
| :- | :- |
| S | Strong: active in the last 90 days, with a size signal (followers, reviews, members, installs, active ads) among the largest found for this channel. |
| W | Weak: present but stale, small, or a single instance. |
| – | None found: searched, nothing. Not proof of absence. |
| ? | Unchecked: behind a login, a paywall, or a tool this session can't reach. |

Agents grade on what they see. When merging, regrade S and W against the largest signal found per channel across all competitors.

Who an AI assistant cites can't be queried from here. Grade the AI half of channel 11 `?` unless the founder pastes the answers ChatGPT, Perplexity or Google's AI Mode give to the buyer questions.

Open two S sources per agent yourself. If one doesn't hold, re-check every S from that agent.

## 5. Read the board

- **Owned:** channels where 2 or more competitors are S. Entering head-on there costs the most.
- **Open:** channels where no competitor is S but the category agent found buyers: venues with audiences, active communities, buyer questions with results. The cheapest ways in.
- **Empty:** no competitor and no buyer evidence. Probably not a channel for this market, not an opening.
- **Missing stage:** a stage where no competitor is S. Either buyers aren't reached there yet, or the market is smaller than assumed. Say which the evidence favors.
- **How buyers buy:** self-serve, sales-led or mixed, from the competitors' pricing pages.
- **Kill signals:** state them; the founder decides. Every stage is owned and the only open channels are rented (08, 15, paid placements): expect a high cost per customer. No buyer venue anywhere: the buyer may be unreachable, or may not exist as defined.

## 6. Buyers

The source's first check is asking recent customers how they found the product and what they compared. Competitors' footprints show where they spend, not where buyers decided.

Write this script into the doc, for 5 target buyers:

1. Last time you looked for something to <job>, how did you first hear about what you chose?
2. What else did you look at, and where did you compare?
3. Whose opinion did you ask?
4. Where do you go to learn about <topic>?

Map each answer to a channel number. If founder notes or interview answers exist, map them now. If none exist, label the reading "competitor evidence only" until answers arrive. Don't wait for them.

## 7. Write

```markdown
# Channel map: <idea>

Checked: YYYY-MM-DD · Market: <country, language> · Buys by: <self-serve | sales-led | mixed>
Buyer: <one line> · Job: <one line>
Buyer questions: 1) <…> 2) <…> 3) <…>

## Competitors
| Competitor | Type | Entry price | Buys by |
| :- | :- | :- | :- |
| [<name>](<url>) | direct | <price> | self-serve |

## Board
S strong · W weak · – none found · ? unchecked. Each grade links to its source.

### 1. Before they know they need you
| # | Channel | Modes | <A> | <B> | <C> | Venues for you |
| :- | :- | :- | :- | :- | :- | :- |
| 01 | Founder & team audiences | B P | [S](<url>) | – | [W](<url>) | — |

### 2. While they compare options
### 3. Through tools and people they trust
### 4. After they buy

## Reading
<"Competitor evidence only", until buyer answers exist>
- **Owned:** <#> <channel>: <who>
- **Open:** <#> <channel>: <buyer evidence>
- **Empty:** <#, …>
- **Missing stage:** <stage, and the likelier reason>, or none
- **Kill signals:** <signal>, or none
- **Unknowns that would change this:** <? cells that matter, and how to check them>

## Buyers
Script: <the four questions>

| Who | First heard via | Compared at | Asked | Channels |
| :- | :- | :- | :- | :- |

## Evidence
### <Competitor>
- <#> <S|W>: <evidence, with numbers> (<url>)

### Category venues
- <#> <venue>: <audience size> (<url>)

## Log
- YYYY-MM-DD: created.
```

Evidence lists S and W rows only. The board's Venues column names the category venues by channel, with audience size.

Show the founder the Reading and the doc's path.

## Revising

New evidence or buyer answers reopen the doc. Re-check cells older than 90 days that the reading depends on, regrade, rewrite the Reading, update Checked, and add a Log line saying what changed in the reading.
