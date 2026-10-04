import {formatDue, metadataText} from '../task-format.js';
import {normalizeTask, parseExport} from '../taskwarrior.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const tasks = parseExport(JSON.stringify([{
    uuid: 'abc',
    description: 'Prepare release',
    project: 'work',
    tags: ['release', 'urgent'],
    due: '20300102T120000Z',
    urgency: 10,
}]));

assert(tasks.length === 1, 'Expected one parsed task');
assert(tasks[0].uuid === 'abc', 'UUID was not parsed');
assert(metadataText(tasks[0]).includes('work'), 'Project was not formatted');
assert(metadataText(tasks[0]).includes('#release'), 'Tags were not formatted');
assert(formatDue(tasks[0].due).startsWith('Due '), 'Due date was not formatted');
assert(normalizeTask(null) === null, 'Invalid tasks should be rejected');
print('Taskwarrior parser tests passed');
