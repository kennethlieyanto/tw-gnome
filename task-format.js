export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

export function formatDue(date) {
    if (!(date instanceof Date))
        return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((dueDay - today) / 86400000);

    if (days < 0)
        return 'Overdue';
    if (days === 0)
        return 'Due today';
    if (days === 1)
        return 'Due tomorrow';

    return `Due ${new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(date)}`;
}

export function metadataText(task) {
    const metadata = [];
    if (task.project)
        metadata.push(task.project);
    if (task.tags.length > 0)
        metadata.push(task.tags.map(tag => `#${tag}`).join(' '));
    const due = formatDue(task.due);
    if (due)
        metadata.push(due);
    return metadata.join('  |  ');
}
