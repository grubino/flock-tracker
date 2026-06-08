import type { UpcomingTask } from '../types';

function formatGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatCareType(type: string): string {
  return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export function buildGoogleCalendarUrl(
  task: UpcomingTask,
  animalNames?: string,
  durationMinutes = 60
): string {
  const start = new Date(task.due_date);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const details = [
    `Care type: ${formatCareType(task.care_type)}`,
    task.priority ? `Priority: ${task.priority}` : null,
    animalNames ? `Animals: ${animalNames}` : null,
    'Created from Flock Tracker',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
