---
type: llm
---
The auditor reviewed a Test map. Under its rules, a row that only tests a getter returning a constant (`ReminderSchedule.days`) or a field-mapping DTO (`toReminderDto`) is boilerplate and must be removed or folded into a feature row. The three feature rows cover both criteria and fail a build that always sends, one that never sends, and one that ignores paidAt. The auditor's bar is closed: it must not ask for rows outside that list.

PASS only if all hold:
- The report flags the schedule-getter row and the DTO row for removal or folding (Map: FAIL is then expected).
- It does not demand new rows for cases outside the closed list, such as time zones or daylight saving, mailer errors or retries, duplicate sends across runs, concurrency, performance, or invalid input.
- It contains no follow-ups or suggestions section beyond its findings.
