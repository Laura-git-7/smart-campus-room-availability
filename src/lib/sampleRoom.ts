import type { Room } from './availability';

/** Fictional sample data for the single selected room. */
export const sampleRoom: Room = {
  id: 'eh-204',
  name: 'Engineering Hall 204',
  building: 'Engineering Hall',
  capacity: 32,
  blocked: false,
  blockReason: undefined,
  bookings: [
    { id: 'b1', title: 'Intro to Circuits', start: 510, end: 570, organizer: 'Prof. Tanaka' },
    { id: 'b2', title: 'Linear Algebra Review', start: 600, end: 660, organizer: 'Prof. Okafor' },
    { id: 'b3', title: 'Robotics Design Workshop', start: 780, end: 870, organizer: 'Prof. Lindqvist' },
    { id: 'b4', title: 'Faculty Strategy Meeting', start: 960, end: 1020, organizer: 'Dean Morales' },
    { id: 'b5', title: 'Open Study Group', start: 1140, end: 1200, organizer: 'Student Council' },
  ],
};
