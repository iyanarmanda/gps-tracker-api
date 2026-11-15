import 'dotenv/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { devices } from '../schemas/devices.schema';
import { initialDevices } from './data/device';

const sqlite = new Database(process.env.SQLITE_URL);
const db = drizzle(sqlite);

async function seed(): Promise<void> {
  try {
    const inserted = await db
      .insert(devices)
      .values(initialDevices)
      .onConflictDoNothing({ target: devices.espId })
      .returning({
        id: devices.id,
        espId: devices.espId,
        name: devices.name,
        isActive: devices.isActive,
        interval: devices.interval,
      });

    console.log(`Seeding finished: ${inserted.length} new device added.`);
    if (inserted.length > 0) {
      console.table(inserted);
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    sqlite.close();
  }
}

void seed();
