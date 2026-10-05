import {formatDue, metadataText} from '../task-format.js';
import {normalizeTask, parseContext, parseContextFilter, parseExport} from '../taskwarrior.js';

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

assert(
    parseContextFilter('context=none\n').length === 0,
    'No context should not add a filter'
);
assert(
    JSON.stringify(parseContextFilter(
        'context=work\ncontext.work.read=+work\n'
    )) === JSON.stringify(['(', '+work', ')']),
    'Simple context filter was not parsed'
);
assert(
    JSON.stringify(parseContextFilter(
        'context=work\ncontext.work.read=+work or +freelance\n'
    )) === JSON.stringify(['(', '+work', 'or', '+freelance', ')']),
    'Compound context filter was not grouped'
);
assert(
    parseContext('context=client\ncontext.client.read=project:client\n').name === 'client',
    'Active context name was not parsed'
);
assert(
    parseContext('context=client\ncontext.client.read=project:client\n').filter[1] ===
        'project:client',
    'Active context read filter was not parsed'
);
assert(
    !JSON.stringify(parseContext('context=d\ncontext.d.read=-work\n').filter)
        .includes('rc.context:d'),
    'Context filters should not include an rc.context override'
);
print('Taskwarrior parser tests passed');
