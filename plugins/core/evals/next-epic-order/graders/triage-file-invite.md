---
type: regex
pattern: '(expired|blank)[\s\S]{0,200}\bfile'
flags: i
match: contains
target: last_message
---
