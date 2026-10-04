extension_uuid := "taskwarrior@kennethl.dev"
pack_dir := "/tmp/tw-gnome-pack"
archive := pack_dir / (extension_uuid + ".shell-extension.zip")

default:
    @just --list
# Run the GJS parser tests.
test:
    gjs -m tests/test-taskwarrior.js

# Compile the GSettings schema required by the preferences window.
schema:
    glib-compile-schemas schemas

# Create an installable GNOME Shell extension archive.
pack: schema
    mkdir -p "{{pack_dir}}"
    gnome-extensions pack \
        --force \
        --out-dir="{{pack_dir}}" \
        --extra-source=taskwarrior.js \
        --extra-source=task-format.js \
        --schema=schemas/org.gnome.shell.extensions.taskwarrior.gschema.xml \
        .

# Install the locally packaged extension.
install: pack
    gnome-extensions install --force "{{archive}}"

# Install and enable the extension.
enable: install
    gnome-extensions enable "{{extension_uuid}}"

# Open the extension preferences window.
prefs:
    gnome-extensions prefs "{{extension_uuid}}"

# Print all currently started tasks in Taskwarrior's next-report order.
tasks:
    task +ACTIVE export next

# Follow GNOME Shell logs while testing the extension.
logs:
    journalctl -f -o cat /usr/bin/gnome-shell

# Show enabled GNOME extensions.
status:
    gnome-extensions list --enabled
