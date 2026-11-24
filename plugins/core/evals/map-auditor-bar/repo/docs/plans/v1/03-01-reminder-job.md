# Email clients about overdue invoices every day

Status: Draft
Issue: [#53](https://github.com/acme/ledger/issues/53) · Task 1 of [03 Reminders](03-reminders.md)
Track: light

## Goal
Clients with an overdue invoice get a reminder on days 3, 7 and 14 after the due date, and never once it is paid.

1. A reminder goes out 3, 7 and 14 days after the due date, and on no other day (BR1) | check: `npm test`
2. A paid invoice gets no reminder (BR2) | check: `npm test`

## Context
No reminders exist today. Invoices have `id`, `dueDate`, `paidAt` and `clientEmail`.

## Approach
`sendDueReminders(now, invoices, mailer)` in `src/reminders.js` picks the invoices due a reminder on `now` and calls `mailer.send(email, invoiceId)` once for each. The schedule lives in `ReminderSchedule` (`src/schedule.js`), a plain object with a `days` getter returning `[3, 7, 14]`. `toReminderDto(invoice)` maps an invoice to `{ invoiceId, email }`. A daily cron calls `sendDueReminders` with the clock's date. The mailer is injected; tests pass a fake that records calls.

## Test map
| C | Test | Level | Behavior | Red before build because | Rules out |
| :- | :- | :- | :- | :- | :- |
| 1 | `test/reminders.test.js`: sends on days 3, 7 and 14 | feature | given unpaid invoices 41, 42, 43 due 3, 7 and 14 days before now, when sendDueReminders runs, then the fake mailer gets exactly one send for each of 41, 42 and 43 | src/reminders.js does not exist | a build that never sends |
| 1 | `test/reminders.test.js`: no reminder on other days | feature | given unpaid invoices 51 and 52 due 5 and 15 days before now, when sendDueReminders runs, then the fake mailer gets no send | src/reminders.js does not exist | a build that sends every day an invoice is overdue |
| 2 | `test/reminders.test.js`: paid invoice gets none | feature | given invoice 61 due 7 days before now and paid yesterday, when sendDueReminders runs, then the fake mailer gets no send | src/reminders.js does not exist | a build that ignores paidAt |
| 1 | `test/schedule.test.js`: schedule lists the days | unit | given ReminderSchedule, when reading days, then it is [3, 7, 14] | src/schedule.js does not exist | a wrong schedule constant |
| 1 | `test/dto.test.js`: dto maps fields | unit | given invoice 71 with clientEmail a@b.c, when toReminderDto, then { invoiceId: 71, email: "a@b.c" } | src/reminders.js does not exist | a dto with swapped fields |

## Steps
1. [ ] Add `src/schedule.js` and `src/reminders.js` | `src/` | domain
2. [ ] Add the daily cron entry | `vercel.json` | infra

## Decisions
- Outcome confirmed by the founder (2026-11-20)
