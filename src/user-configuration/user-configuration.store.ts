import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type Client, type Row } from '@libsql/client';

export interface StoredUserConfiguration {
  userId: string;
  version: number;
  iv: string;
  ciphertext: string;
  revision: number;
  updatedAt: string;
}

export interface UserConfigurationWrite {
  version: number;
  iv: string;
  ciphertext: string;
  expectedRevision?: number;
}

export type UserConfigurationWriteResult =
  | { status: 'written'; configuration: StoredUserConfiguration }
  | { status: 'conflict' };

@Injectable()
export class UserConfigurationStore implements OnModuleInit, OnModuleDestroy {
  private client?: Client;
  private ready = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('USER_CONFIG_DATABASE_URL');
    const authToken = config.get<string>('USER_CONFIG_DATABASE_AUTH_TOKEN');
    const isLocal = url?.startsWith('file:');
    if (url && (isLocal || authToken)) {
      try {
        this.client = createClient({ url, authToken });
      } catch (error) {
        this.logInitializationError(error);
      }
    }
  }

  get configured() {
    return Boolean(this.client && this.ready);
  }

  async onModuleInit() {
    if (!this.client) return;
    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS user_configurations (
          user_id TEXT PRIMARY KEY NOT NULL,
          version INTEGER NOT NULL,
          iv TEXT NOT NULL,
          ciphertext TEXT NOT NULL,
          revision INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      this.ready = true;
    } catch (error) {
      this.logInitializationError(error);
      this.client.close();
      this.client = undefined;
    }
  }

  onModuleDestroy() {
    this.client?.close();
  }

  async find(userId: string): Promise<StoredUserConfiguration | null> {
    const client = this.requireClient();
    const result = await client.execute({
      sql: `
        SELECT user_id, version, iv, ciphertext, revision, updated_at
        FROM user_configurations
        WHERE user_id = ?
      `,
      args: [userId],
    });
    const row = result.rows[0];
    if (!row) return null;
    return this.toConfiguration(row);
  }

  async write(
    userId: string,
    value: UserConfigurationWrite,
  ): Promise<UserConfigurationWriteResult> {
    const client = this.requireClient();
    const updatedAt = new Date().toISOString();
    if (value.expectedRevision === undefined) {
      const result = await client.execute({
        sql: `
          INSERT INTO user_configurations (
            user_id, version, iv, ciphertext, revision, updated_at
          ) VALUES (?, ?, ?, ?, 1, ?)
          ON CONFLICT(user_id) DO NOTHING
          RETURNING user_id, version, iv, ciphertext, revision, updated_at
        `,
        args: [userId, value.version, value.iv, value.ciphertext, updatedAt],
      });
      const row = result.rows[0];
      if (!row) return { status: 'conflict' };
      return {
        status: 'written',
        configuration: this.toConfiguration(row),
      };
    } else {
      const result = await client.execute({
        sql: `
          UPDATE user_configurations
          SET version = ?, iv = ?, ciphertext = ?,
              revision = revision + 1, updated_at = ?
          WHERE user_id = ? AND revision = ?
          RETURNING user_id, version, iv, ciphertext, revision, updated_at
        `,
        args: [
          value.version,
          value.iv,
          value.ciphertext,
          updatedAt,
          userId,
          value.expectedRevision,
        ],
      });
      const row = result.rows[0];
      if (!row) return { status: 'conflict' };
      return {
        status: 'written',
        configuration: this.toConfiguration(row),
      };
    }
  }

  async delete(userId: string): Promise<void> {
    await this.requireClient().execute({
      sql: 'DELETE FROM user_configurations WHERE user_id = ?',
      args: [userId],
    });
  }

  private requireClient(): Client {
    if (!this.client) {
      throw new Error('User configuration database is not configured.');
    }
    return this.client;
  }

  private toConfiguration(row: Row): StoredUserConfiguration {
    return {
      userId: String(row.user_id),
      version: Number(row.version),
      iv: String(row.iv),
      ciphertext: String(row.ciphertext),
      revision: Number(row.revision),
      updatedAt: String(row.updated_at),
    };
  }

  private logInitializationError(error: unknown) {
    Logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        message: 'Unable to initialize encrypted user configuration storage.',
      },
      this.constructor.name,
    );
  }
}
