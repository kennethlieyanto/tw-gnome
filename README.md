# Taskwarrior GNOME Extension

A native GNOME Shell extension for viewing and completing started Taskwarrior tasks.

The panel shows the most urgent started task using Taskwarrior's `next` report. Clicking it opens a TaskDock-inspired popup containing all started tasks. The only available task action is completion.

## Requirements

- GNOME Shell 50
- Taskwarrior 3.x available as `task`
- `gnome-extensions`
- GTK4 and libadwaita for preferences

## Development

Compile the settings schema before running the extension:

```bash
glib-compile-schemas schemas
```

Install locally:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/taskwarrior@kennethl.dev
cp metadata.json extension.js prefs.js taskwarrior.js task-format.js stylesheet.css ~/.local/share/gnome-shell/extensions/taskwarrior@kennethl.dev/
cp -r schemas ~/.local/share/gnome-shell/extensions/taskwarrior@kennethl.dev/
gnome-extensions enable taskwarrior@kennethl.dev
```

Run the parser tests with:

```bash
gjs -m tests/test-taskwarrior.js
```

The extension invokes Taskwarrior with structured export commands (`task +ACTIVE limit:1 export next` and `task +ACTIVE export next`) and does not send task data anywhere.
