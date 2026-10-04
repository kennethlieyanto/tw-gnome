import Gio from 'gi://Gio';

export class TaskwarriorError extends Error {}

function parseDate(value) {
    if (!value || typeof value !== 'string')
        return null;

    const compact = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
    const isoValue = compact
        ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`
        : value;
    const date = new Date(isoValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeTask(raw) {
    if (!raw || typeof raw !== 'object' || !raw.uuid)
        return null;

    return {
        uuid: String(raw.uuid),
        description: String(raw.description ?? '').trim() || '(No description)',
        project: typeof raw.project === 'string' ? raw.project : '',
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
        due: parseDate(raw.due),
        urgency: Number(raw.urgency) || 0,
        status: String(raw.status ?? ''),
    };
}

export function parseExport(text) {
    const parsed = JSON.parse(text);
    const tasks = Array.isArray(parsed) ? parsed : [parsed];
    return tasks.map(normalizeTask).filter(task => task !== null);
}

function runTask(args, cancellable) {
    return new Promise((resolve, reject) => {
        let process;
        try {
            process = Gio.Subprocess.new(
                ['task', ...args],
                Gio.SubprocessFlags.STDOUT_PIPE |
                    Gio.SubprocessFlags.STDERR_PIPE
            );
        } catch (error) {
            reject(new TaskwarriorError(`Could not start Taskwarrior: ${error.message}`));
            return;
        }

        process.communicate_utf8_async(null, cancellable, (_process, result) => {
            try {
                const [, stdout, stderr] = process.communicate_utf8_finish(result);
                if (!process.get_successful()) {
                    reject(new TaskwarriorError(stderr.trim() || 'Taskwarrior command failed.'));
                    return;
                }
                resolve(stdout);
            } catch (error) {
                reject(error);
            }
        });
    });
}

export class TaskwarriorClient {
    async getMostUrgentStartedTask(cancellable = null) {
        const output = await runTask(
            ['+ACTIVE', 'limit:1', 'export', 'next'],
            cancellable
        );
        return parseExport(output)[0] ?? null;
    }

    async getStartedTasks(cancellable = null) {
        const output = await runTask(
            ['+ACTIVE', 'export', 'next'],
            cancellable
        );
        return parseExport(output);
    }

    async completeTask(uuid, cancellable = null) {
        await runTask([uuid, 'done'], cancellable);
    }
}
