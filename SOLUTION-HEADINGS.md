# SOLUTION files: Heading & TOC Guidelines

Purpose
- Prevent manual numeric prefixes in `SOLUTION-*.md` files and keep headings stable as content changes.

Guidelines
- Do NOT add numeric prefixes to headings (e.g. `## 1. Title`).
- Use plain headings (e.g. `## Title`) so sections can be reordered without needing renumbering.
- Add a Table of Contents near the top of the file (after the main title and introductory paragraph). The TOC may contain links to major sections (H2) and important subsections (H3) if helpful.

How to update a SOLUTION file
1. Edit the file and keep headings unnumbered.
2. Regenerate or edit the `Table of Contents` to reflect the H2/H3 headings.
3. Run a quick preview (GitHub or local Markdown viewer) to verify anchors/links.

Why
- Manual numeric headings easily become inconsistent as sections are moved or split.
- Unnumbered headings keep diffs smaller and reduce merge conflicts.
- A TOC provides readable order without hard-coding numbers.

Recommended tooling
- Use your editor's Markdown TOC extension or a small script to generate TOC entries if you prefer automated updates.
- Add a lightweight markdown linter to CI to warn about headings that start with a number followed by a dot (optional).

Example
```markdown
# Exercise X: Title

Intro paragraph.

## Table of Contents
- [First Section](#first-section)
- [Second Section](#second-section)

## First Section
...
```
