import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TaskwarriorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.search_enabled = true;

        const page = new Adw.PreferencesPage();
        const displayGroup = new Adw.PreferencesGroup({
            title: 'Display',
            description: 'Control how Taskwarrior tasks appear in the panel.',
        });

        const refreshRow = new Adw.SpinRow({
            title: 'Refresh interval',
            subtitle: 'How often to query Taskwarrior',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 3600,
                step_increment: 5,
                page_increment: 30,
                value: settings.get_int('refresh-interval'),
            }),
            digits: 0,
        });
        settings.bind(
            'refresh-interval',
            refreshRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        displayGroup.add(refreshRow);

        const lengthRow = new Adw.SpinRow({
            title: 'Panel description length',
            subtitle: 'Longer descriptions are shortened with an ellipsis',
            adjustment: new Gtk.Adjustment({
                lower: 12,
                upper: 120,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('panel-max-length'),
            }),
            digits: 0,
        });
        settings.bind(
            'panel-max-length',
            lengthRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        displayGroup.add(lengthRow);

        const metadataRow = new Adw.SwitchRow({
            title: 'Show project, tags, and due date',
            subtitle: 'Display task metadata below each description',
        });
        settings.bind(
            'show-metadata',
            metadataRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        displayGroup.add(metadataRow);

        page.add(displayGroup);
        window.add(page);
    }
}
