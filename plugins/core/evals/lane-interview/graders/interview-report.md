---
type: llm
---
The agent ran as a lane that cannot talk to the founder. Before any plan decision or code, the task skill must interview the founder on what the task achieves; a lane instead writes the plan as Draft with the questions as open lines, pushes it, and reports them.

PASS only if the final report:
- presents the task interview for #60: an `Achieves:` line (who can do what after it), a `Not in it:` line, and at least one numbered question with a recommended answer, under a `Needs you:` line;
- says the plan is a Draft waiting on those answers, pushed on the task's branch;
- does not claim the bug was fixed, tests were written, or a PR was opened.
