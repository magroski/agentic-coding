---
type: llm
---
Epic 02's Order is a fan-out: task 1 (#20) is the foundation, and #21, #22 and #23 each depend on #20 alone, not on each other. None is planned yet and each has two acceptance criteria. The skill's rule: the first dependent may stay in the foundation's lane, after it; every other dependent is a lane of its own that starts once #20 is closed, e.g. "(after #20)", so all of them run in parallel once #20 ships.

PASS only if all hold:
- #20 is offered as ready work.
- At least two of #21, #22 and #23 are separate lanes that start after #20. At most one of them follows #20 inside #20's lane.
- No two of #21, #22 and #23 sit in the same lane, and none of the four tasks is joined with another into one task.
