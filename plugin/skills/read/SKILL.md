---
name: read
description: Show today's Dreamlog entries in the editorial reading layout.
allowed-tools: ["mcp__dreamlog__today_dreams"]
---

# Dreamlog — read

Show the reader today's dreams in Claude Code's native text pane. Do NOT shell out to a script — rendering multi-line subprocess output inside the Claude Code TUI collides with the input buffer.

## Steps

1. Call `mcp__dreamlog__today_dreams` with no arguments. You'll get back `{ dreams: [...] }` where each dream has `{ id, type, title, body, created_at, seed, citations }`.
2. If `dreams` is empty, reply with exactly:

```
*no dream yet today.*

try `/dreamlog:dream` to wake the agent, or `/dreamlog:demo` to see how it feels.
```

and stop.

3. Otherwise render the dreams as your reply, **following the template below exactly**. One blank line between every block. No commentary before or after. Do NOT preface with "here are today's dreams" or anything like that.

## Template (use this literally, one dream at a time)

Start with this header, once, using today's date formatted like `Thursday, April 23`:

```
*the morning letter · Thursday, April 23*

_what we dreamt for you._
```

Then, for each dream in the order returned:

- Blank line, then `---`, then blank line (dream separator — skip the separator before the first dream).
- One italic caption line in this exact form (convert `created_at` UTC to local time; format like `3:24pm`; format date like `Apr 23`):

```
*— <type> · dreamt at <h:mmam/pm> · <Mon D>*
```

- Blank line, then the title as `**lowercase title**` (bold, already lowercase from the model).
- Blank line, then the dream body. Render the whole `body` field as plain prose paragraphs — no alterations. Split into paragraphs only if the body contains `\n\n`.
- Blank line, then a citations block as a markdown blockquote, one citation per line, each truncated to 100 chars with `…` if longer:

```
> · <first citation content>
> · <second citation content>
```

## Do not

- Do not call any Bash or subprocess tools.
- Do not wrap the body at a fixed width — Claude Code handles wrapping.
- Do not add ANSI codes; markdown is enough.
- Do not show seed IDs or citation IDs.
- Do not quote the skill template back at the user.
