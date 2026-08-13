import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserConfigurationService } from './user-configuration.service';
import { UserConfigurationStore } from './user-configuration.store';

describe('UserConfigurationService', () => {
  const configuration = {
    userId: '123',
    version: 1,
    iv: 'AAAAAAAAAAAAAAAA',
    ciphertext: 'encrypted',
    revision: 1,
    updatedAt: '2026-08-08T12:00:00.000Z',
  };

  it('never exposes the user id in the resource', async () => {
    const store = {
      configured: true,
      find: jest.fn().mockResolvedValue(configuration),
    } as unknown as UserConfigurationStore;
    const service = new UserConfigurationService(store);

    await expect(service.find('123')).resolves.toEqual({
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'encrypted',
      revision: 1,
      updatedAt: '2026-08-08T12:00:00.000Z',
    });
  });

  it('returns not found when no encrypted configuration exists', async () => {
    const store = {
      configured: true,
      find: jest.fn().mockResolvedValue(null),
    } as unknown as UserConfigurationStore;
    const service = new UserConfigurationService(store);

    await expect(service.find('123')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('turns stale writes into conflicts', async () => {
    const store = {
      configured: true,
      write: jest.fn().mockResolvedValue({ status: 'conflict' }),
    } as unknown as UserConfigurationStore;
    const service = new UserConfigurationService(store);

    await expect(
      service.write('123', {
        version: 1,
        iv: 'AAAAAAAAAAAAAAAA',
        ciphertext: 'encrypted',
        expectedRevision: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails closed when the database is not configured', async () => {
    const store = {
      configured: false,
    } as UserConfigurationStore;
    const service = new UserConfigurationService(store);

    await expect(service.find('123')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
