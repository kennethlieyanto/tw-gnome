import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {TaskwarriorClient} from './taskwarrior.js';
import {metadataText, truncate} from './task-format.js';

export default class TaskwarriorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._client = new TaskwarriorClient();
        this._cancellable = new Gio.Cancellable();
        this._tasks = [];
        this._refreshing = false;

        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        const panelBox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        panelBox.add_child(new St.Icon({
            icon_name: 'view-list-bullet-symbolic',
            style_class: 'system-status-icon',
        }));
        this._panelLabel = new St.Label({
            text: 'No active task',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'taskwarrior-panel-label',
        });
        this._panelLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        panelBox.add_child(this._panelLabel);
        this._indicator.add_child(panelBox);

        this._buildMenu();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this._settingsChangedId = this._settings.connect(
            'changed::refresh-interval', () => this._restartTimer()
        );
        this._restartTimer();
        void this._refresh();
    }

    disable() {
        this._cancellable?.cancel();
        if (this._timerId)
            GLib.Source.remove(this._timerId);
        if (this._settings && this._settingsChangedId)
            this._settings.disconnect(this._settingsChangedId);
        if (this._indicator && this._menuSignalId)
            this._indicator.menu.disconnect(this._menuSignalId);
        this._indicator?.destroy();
        this._indicator = null;
        this._client = null;
        this._settings = null;
        this._tasks = [];
    }

    _restartTimer() {
        if (this._timerId)
            GLib.Source.remove(this._timerId);
        const interval = Math.max(5, this._settings.get_int('refresh-interval'));
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            void this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _buildMenu() {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'taskwarrior-menu-item',
        });
        const root = new St.BoxLayout({
            vertical: true,
            style_class: 'taskwarrior-root',
        });
        item.add_child(root);

        const header = new St.BoxLayout({style_class: 'taskwarrior-header'});
        header.add_child(new St.Label({
            text: 'Started tasks',
            x_expand: true,
            style_class: 'taskwarrior-title',
        }));
        this._countLabel = new St.Label({style_class: 'taskwarrior-count'});
        header.add_child(this._countLabel);
        root.add_child(header);

        this._statusLabel = new St.Label({
            visible: false,
            style_class: 'taskwarrior-status',
        });
        root.add_child(this._statusLabel);

        const scroll = new St.ScrollView({
            overlay_scrollbars: true,
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            style_class: 'taskwarrior-scroll-view',
        });
        this._taskList = new St.BoxLayout({
            vertical: true,
            style_class: 'taskwarrior-task-list',
        });
        scroll.set_child(this._taskList);
        root.add_child(scroll);

        this._indicator.menu.addMenuItem(item);
        this._menuSignalId = this._indicator.menu.connect(
            'open-state-changed', (_menu, open) => {
                if (open)
                    void this._refresh();
            }
        );
    }

    async _refresh() {
        if (this._refreshing || !this._client)
            return;
        this._refreshing = true;
        try {
            const contextFilter = await this._client.getActiveContextFilter(
                this._cancellable
            );
            const [urgent, tasks] = await Promise.all([
                this._client.getMostUrgentStartedTask(
                    contextFilter,
                    this._cancellable
                ),
                this._client.getStartedTasks(contextFilter, this._cancellable),
            ]);
            this._panelLabel.text = urgent
                ? truncate(urgent.description, this._settings.get_int('panel-max-length'))
                : 'No active task';
            this._tasks = tasks;
            this._renderTasks();
            this._setStatus('');
        } catch (error) {
            if (!this._cancellable.is_cancelled()) {
                console.error(`Taskwarrior: ${error.message}`);
                this._setStatus(error.message, true);
            }
        } finally {
            this._refreshing = false;
        }
    }

    _renderTasks() {
        for (const child of this._taskList.get_children())
            child.destroy();
        this._countLabel.text = `${this._tasks.length} ${this._tasks.length === 1 ? 'task' : 'tasks'}`;

        if (this._tasks.length === 0) {
            this._taskList.add_child(new St.Label({
                text: 'No started tasks',
                style_class: 'taskwarrior-empty-state',
            }));
            return;
        }

        this._tasks.forEach((task, index) => {
            this._taskList.add_child(this._createTaskRow(task, index === 0));
        });
    }

    _createTaskRow(task, isUrgent) {
        const row = new St.BoxLayout({
            style_class: isUrgent
                ? 'taskwarrior-task-row taskwarrior-task-row-urgent'
                : 'taskwarrior-task-row',
        });
        const complete = new St.Button({
            can_focus: true,
            style_class: 'taskwarrior-complete-button',
            accessible_name: `Complete ${task.description}`,
            child: new St.Icon({icon_name: 'emblem-ok-symbolic', icon_size: 16}),
        });
        complete.connect('clicked', () => void this._complete(task));
        row.add_child(complete);

        const details = new St.BoxLayout({vertical: true, x_expand: true});
        const description = new St.Label({
            text: task.description,
            x_expand: true,
            style_class: 'taskwarrior-task-description',
        });
        description.clutter_text.line_wrap = true;
        description.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        details.add_child(description);

        if (this._settings.get_boolean('show-metadata')) {
            const metadata = metadataText(task);
            if (metadata)
                details.add_child(new St.Label({
                    text: metadata,
                    style_class: 'taskwarrior-task-metadata',
                }));
        }
        row.add_child(details);
        return row;
    }

    async _complete(task) {
        this._setStatus('Completing task...');
        try {
            await this._client.completeTask(task.uuid, this._cancellable);
            await this._refresh();
        } catch (error) {
            if (!this._cancellable.is_cancelled())
                this._setStatus(error.message, true);
        }
    }

    _setStatus(message, error = false) {
        if (!this._statusLabel)
            return;
        this._statusLabel.text = message;
        this._statusLabel.visible = Boolean(message);
        if (error)
            this._statusLabel.add_style_class_name('taskwarrior-status-error');
        else
            this._statusLabel.remove_style_class_name('taskwarrior-status-error');
    }
}
