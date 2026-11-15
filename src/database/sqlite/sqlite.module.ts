import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule, InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schemas';

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        drizzle,
        driver: 'sqlite:better-sqlite3',
        connection: configService.getOrThrow<string>('SQLITE_URL'),
        schema,
      }),
    }),
  ],
})
export class SQLiteModule implements OnModuleInit {
  constructor(
    @InjectDrizzle()
    private readonly db: BetterSQLite3Database<typeof schema>,
  ) {}

  onModuleInit() {
    this.db.run(sql`PRAGMA journal_mode = WAL;`);
    this.db.run(sql`PRAGMA synchronous = NORMAL;`);
    this.db.run(sql`PRAGMA foreign_keys = ON;`);
  }
}
