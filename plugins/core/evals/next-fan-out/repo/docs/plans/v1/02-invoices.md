# 02 Invoices

Status: Approved
Milestone: P2 Invoices · Roadmap: [README](README.md)

## Outcome
Studios issue invoices from the app and email them to clients.

## Business rules
BR1. An invoice number is unique per studio and never reused | decided: founder 2026-11-12
BR2. A sent invoice cannot be edited, only voided | decided: founder 2026-11-12
BR3. A client is marked paid only by the studio | decided: founder 2026-11-12

## Order
1 ─┬─ 2
   ├─ 3
   └─ 4

## Tasks
1. **Invoice record** (#20). A studio creates a draft invoice with lines and a number. Covers BR1. Depends on —.
2. **Send by email** (#21). Covers BR2. Depends on 1.
3. **Mark paid** (#22). Covers BR3. Depends on 1.
4. **Invoice PDF** (#23). Depends on 1.

## Decisions
- Approved by the founder on 2026-11-12.
