import type { NewDevice } from '../../schemas/devices.schema';

export const initialDevices: NewDevice[] = [
  {
    espId: 'esp32:001',
    name: 'Tracker Unit 01',
    isActive: false,
    interval: 0,
    activatedAt: null,
  },
  {
    espId: 'esp32:002',
    name: 'Tracker Unit 02',
    isActive: false,
    interval: 0,
    activatedAt: null,
  },
  {
    espId: 'esp32:003',
    name: 'Tracker Unit 03',
    isActive: false,
    interval: 0,
    activatedAt: null,
  },
];

