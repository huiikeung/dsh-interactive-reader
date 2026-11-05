# Interactive Reader (dsh-interactive-reader)

Turns a conversation into a calm reading page: live process folding, turn navigation, expandable diffs, locatable deliverables, and MCP Apps cards in the final answer. Open it from the sidebar's 阅读 entry or by switching any session to the reading view.

## Settings

All settings live in **Settings → 交互阅读** (this page only documents them).

### Open deliverables in built-in panel

Off by default. When off, file chips and inline file mentions open in the system app; when on, they preview in the right sidebar like official chat. Reveal and folder actions always use the system file manager.

### Translucent frosted glass

Off by default. On, the reading chrome lets wallpaper and skins show through; path and count chips stay clear until hover or focus.

### Auto-fold process

On by default: new thinking collapses earlier reasoning and tool calls, while narration between blocks always stays visible. A compact seam (`思考×2 · 工具×1`) appears between blocks and expands the folded rows in place. Off, everything stays expanded.

### File manager URL

Shown only on desktop-less Hosts (fnOS / NAS); on Windows and macOS Hosts this section hides itself. Once filled, 「在文件夹中显示」opens the NAS file manager instead of silently doing nothing.

- Must contain a path placeholder; applies to `/vol{n}/…` paths only.
- Placeholders: `{path}` raw, `{encodedPath}` URL-encoded, `{name}` folder name.
- Example: `http://<nas>:5666/v/trim.file-manager?path={encodedPath}`

### generative-mcpapps skill

Detection only affects **model auto-selection of MCP Apps**; the Reader renders mcp-app fences regardless. Re-check queries the host skill catalog; when missing, the page offers the install command (copy the `generative-mcpapps` folder into `.dsh/skills` or `.agents/skills`, home or project).

## Working with other plugins

- **dsh-rewind-plugin**: a successful `/rewind` collapses the withdrawn message, the rows after it, and the command row, returning the Reader to the pre-send state.
- **Text transform service** (`dsh-interactive-reader.text-transform`): another plugin can rewrite reasoning and answer text before the reading reveal; the session keeps the original.
- **Third-party renderers**: user/steering/assistant-step renderers registered on the official node slot (message-recall buttons, raw-HTML cards) keep working inside the Reader.

## Install

```
dsh plugin --profile web add github:huiikeung/dsh-interactive-reader
```

Settings and detail-page copy follow the interface language (中文 / English).
