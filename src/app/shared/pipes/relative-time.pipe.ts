import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeTime',
  standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string): string {
    const updatedAt = new Date(value).getTime();

    if (Number.isNaN(updatedAt)) {
      return '';
    }

    const differenceInSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

    if (differenceInSeconds < 60) {
      return 'Updated just now';
    }

    const minutes = Math.floor(differenceInSeconds / 60);

    if (minutes < 60) {
      return `Updated ${minutes} ${this.pluralize(minutes, 'minutes')} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `Updated ${hours} ${this.pluralize(hours, 'hour')} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 9) {
      return `Updated ${days} ${this.pluralize(days, 'day')} ago`;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(updatedAt);
  }

  private pluralize(value: number, unit: string): string {
    return value === 1 ? unit : `${unit}s`;
  }
}
