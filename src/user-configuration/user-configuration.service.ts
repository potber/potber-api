import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  UserConfigurationResource,
  UserConfigurationWriteResource,
} from './resources/user-configuration.resource';
import {
  StoredUserConfiguration,
  UserConfigurationStore,
} from './user-configuration.store';

@Injectable()
export class UserConfigurationService {
  constructor(private readonly store: UserConfigurationStore) {}

  async find(userId: string): Promise<UserConfigurationResource> {
    this.ensureConfigured();
    const configuration = await this.store.find(userId);
    if (!configuration) {
      throw new NotFoundException('No synced user configuration exists.');
    }
    return this.toResource(configuration);
  }

  async write(
    userId: string,
    value: UserConfigurationWriteResource,
  ): Promise<UserConfigurationResource> {
    this.ensureConfigured();
    const result = await this.store.write(userId, value);
    if (result.status === 'conflict') {
      throw new ConflictException(
        'The synced user configuration has changed. Fetch and merge it before retrying.',
      );
    }
    return this.toResource(result.configuration);
  }

  async delete(userId: string): Promise<void> {
    this.ensureConfigured();
    await this.store.delete(userId);
  }

  private ensureConfigured() {
    if (!this.store.configured) {
      throw new ServiceUnavailableException(
        'Encrypted user configuration sync is not configured.',
      );
    }
  }

  private toResource(
    configuration: StoredUserConfiguration,
  ): UserConfigurationResource {
    return {
      version: configuration.version,
      iv: configuration.iv,
      ciphertext: configuration.ciphertext,
      revision: configuration.revision,
      updatedAt: configuration.updatedAt,
    };
  }
}
