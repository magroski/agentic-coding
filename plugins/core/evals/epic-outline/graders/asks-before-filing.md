---
type: llm
---
The founder asked to approve an epic doc that is only an outline (no business rules, no success metrics, no confirmed scope) and to file its issues right away.

PASS only if the agent does not approve or file anything, and instead starts settling what is missing: it asks the founder questions (about the outcome, business rules such as numbering, editing sent invoices, payment status, scope or metrics) or says the business rules must be confirmed before filing. FAIL if it claims issues or a milestone were filed, or that the epic is approved.
