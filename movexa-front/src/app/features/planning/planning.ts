import { Component, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';

export type CourseStatus = 'disponible' | 'complet' | 'annulé';

export interface Course {
  id: number;
  time: string;
  name: string;
  coach: string;
  enrolled: number;
  capacity: number;
  status: CourseStatus;
}

export interface WeekDay {
  label: string;   // 'Lun'
  date: number;    // 12
  iso: string;     // '2026-10-12'
  courses: Course[];
}

export interface CoachEntry {
  initials: string;
  name: string;
  coursesThisWeek: number;
}

function makeDay(label: string, date: number, iso: string, courses: Course[]): WeekDay {
  return { label, date, iso, courses };
}

const WEEK_START = new Date('2026-10-12');

function isoDate(offset: number): string {
  const d = new Date(WEEK_START);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const WEEK: WeekDay[] = [
  makeDay('Lun', 12, isoDate(0), [
    { id: 1, time: '07:00', name: 'Cross training', coach: 'Alex M.',  enrolled: 8,  capacity: 12, status: 'disponible' },
    { id: 2, time: '18:00', name: 'Renforcement',   coach: 'Sarah K.', enrolled: 10, capacity: 12, status: 'disponible' },
  ]),
  makeDay('Mar', 13, isoDate(1), [
    { id: 3, time: '12:30', name: 'Yoga',  coach: 'Léa D.', enrolled: 6,  capacity: 10, status: 'disponible' },
    { id: 4, time: '18:30', name: 'Boxe',  coach: 'Omar T.', enrolled: 12, capacity: 12, status: 'complet' },
  ]),
  makeDay('Mer', 14, isoDate(2), [
    { id: 5,  time: '07:00', name: 'Cross training', coach: 'Alex M.',  enrolled: 9,  capacity: 12, status: 'disponible' },
    { id: 6,  time: '12:30', name: 'Pilates',        coach: 'Léa D.',  enrolled: 8,  capacity: 10, status: 'disponible' },
    { id: 7,  time: '19:00', name: 'Cardio',         coach: 'Sarah K.', enrolled: 10, capacity: 10, status: 'complet' },
  ]),
  makeDay('Jeu', 15, isoDate(3), [
    { id: 8,  time: '07:00', name: 'Renforcement', coach: 'Alex M.',  enrolled: 7,  capacity: 12, status: 'disponible' },
    { id: 9,  time: '17:30', name: 'Yoga',         coach: 'Léa D.',  enrolled: 9,  capacity: 10, status: 'disponible' },
  ]),
  makeDay('Ven', 16, isoDate(4), [
    { id: 10, time: '12:30', name: 'Cross training', coach: 'Omar T.', enrolled: 11, capacity: 12, status: 'disponible' },
    { id: 11, time: '18:00', name: 'Cardio',         coach: 'Sarah K.', enrolled: 10, capacity: 10, status: 'complet' },
  ]),
  makeDay('Sam', 17, isoDate(5), [
    { id: 12, time: '09:00', name: 'Boxe',       coach: 'Omar T.', enrolled: 8,  capacity: 12, status: 'disponible' },
    { id: 13, time: '10:30', name: 'Stretching', coach: 'Léa D.',  enrolled: 6,  capacity: 12, status: 'disponible' },
  ]),
  makeDay('Dim', 18, isoDate(6), [
    { id: 14, time: '10:00', name: 'Yoga', coach: 'Léa D.', enrolled: 7, capacity: 10, status: 'disponible' },
  ]),
];

const TODAY_ISO = '2026-10-14'; // mercredi 14 oct.

@Component({
  selector: 'app-planning',
  imports: [NgClass],
  templateUrl: './planning.html',
  styleUrl: './planning.css',
})
export class Planning {
  readonly weekLabel = 'Semaine du 12 au 18 octobre 2026';
  readonly week = WEEK;
  readonly todayIso = TODAY_ISO;

  readonly coaches: CoachEntry[] = [
    { initials: 'AM', name: 'Alex Morel',    coursesThisWeek: 3 },
    { initials: 'LD', name: 'Léa Dubois',    coursesThisWeek: 4 },
    { initials: 'SK', name: 'Sarah Konaté',  coursesThisWeek: 3 },
    { initials: 'OT', name: 'Omar Traoré',   coursesThisWeek: 3 },
  ];

  selectedDay = signal<string>(TODAY_ISO);

  readonly selectedDayData = computed(() =>
    this.week.find(d => d.iso === this.selectedDay()) ?? this.week[0]
  );

  selectDay(iso: string): void {
    this.selectedDay.set(iso);
  }

  statusClass(status: CourseStatus): string {
    const map: Record<CourseStatus, string> = {
      disponible: 'status-disponible',
      complet:    'status-complet',
      annulé:     'status-annule',
    };
    return map[status];
  }

  enrollLabel(c: Course): string {
    return `${c.enrolled}/${c.capacity} inscrits`;
  }
}
