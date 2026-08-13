import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserConfigurationStore } from './user-configuration.store';

describe('UserConfigurationStore', () => {
  let store: UserConfigurationStore;

  beforeEach(async () => {
    const config = new ConfigService({
      USER_CONFIG_DATABASE_URL: 'file::memory:',
    });
    store = new UserConfigurationStore(config);
    await store.onModuleInit();
  });

  afterEach(() => store.onModuleDestroy());

  it('creates, updates and deletes one opaque configuration per user', async () => {
    const created = await store.write('123', {
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'encrypted-one',
    });
    expect(created).toMatchObject({
      status: 'written',
      configuration: {
        userId: '123',
        revision: 1,
        ciphertext: 'encrypted-one',
      },
    });

    const updated = await store.write('123', {
      version: 1,
      iv: 'BBBBBBBBBBBBBBBB',
      ciphertext: 'encrypted-two',
      expectedRevision: 1,
    });
    expect(updated).toMatchObject({
      status: 'written',
      configuration: {
        userId: '123',
        revision: 2,
        ciphertext: 'encrypted-two',
      },
    });

    await store.delete('123');
    await expect(store.find('123')).resolves.toBeNull();
  });

  it('rejects stale and duplicate writes without replacing ciphertext', async () => {
    await store.write('123', {
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'current',
    });

    await expect(
      store.write('123', {
        version: 1,
        iv: 'BBBBBBBBBBBBBBBB',
        ciphertext: 'duplicate-create',
      }),
    ).resolves.toEqual({ status: 'conflict' });
    await expect(
      store.write('123', {
        version: 1,
        iv: 'CCCCCCCCCCCCCCCC',
        ciphertext: 'stale-update',
        expectedRevision: 2,
      }),
    ).resolves.toEqual({ status: 'conflict' });

    await expect(store.find('123')).resolves.toMatchObject({
      revision: 1,
      ciphertext: 'current',
    });
  });

  it('returns the row written without a race-prone follow-up read', async () => {
    const find = jest.spyOn(store, 'find');

    const created = await store.write('123', {
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'created',
    });
    const updated = await store.write('123', {
      version: 1,
      iv: 'BBBBBBBBBBBBBBBB',
      ciphertext: 'updated',
      expectedRevision: 1,
    });

    expect(find).not.toHaveBeenCalled();
    expect(created).toMatchObject({
      status: 'written',
      configuration: { ciphertext: 'created', revision: 1 },
    });
    expect(updated).toMatchObject({
      status: 'written',
      configuration: { ciphertext: 'updated', revision: 2 },
    });
  });

  it('keeps users isolated', async () => {
    await store.write('123', {
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'first-user',
    });
    await store.write('456', {
      version: 1,
      iv: 'BBBBBBBBBBBBBBBB',
      ciphertext: 'second-user',
    });

    await expect(store.find('123')).resolves.toMatchObject({
      ciphertext: 'first-user',
    });
    await expect(store.find('456')).resolves.toMatchObject({
      ciphertext: 'second-user',
    });
  });

  it('stays unavailable instead of crashing when client creation fails', async () => {
    store.onModuleDestroy();
    const log = jest.spyOn(Logger, 'error').mockImplementation();
    store = new UserConfigurationStore(
      new ConfigService({
        USER_CONFIG_DATABASE_URL: 'unsupported://database',
        USER_CONFIG_DATABASE_AUTH_TOKEN: 'token',
      }),
    );

    await expect(store.onModuleInit()).resolves.toBeUndefined();
    expect(store.configured).toBe(false);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unable to initialize encrypted user configuration storage.',
      }),
      'UserConfigurationStore',
    );
  });
});
