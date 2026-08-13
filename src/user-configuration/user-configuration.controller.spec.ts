import { UserConfigurationModule } from './user-configuration.module';
import { createTestContainer, TestContainer } from 'test/container';
import { fakeRequest } from 'test/helpers/fake-request';

describe('UserConfigurationController', () => {
  let container: TestContainer;

  beforeEach(async () => {
    process.env.USER_CONFIG_DATABASE_URL = 'file::memory:';
    process.env.USER_CONFIG_RATE_LIMIT_WRITE_MAX = '3';
    process.env.USER_CONFIG_RATE_LIMIT_IP_WRITE_MAX = '100';
    container = await createTestContainer({
      imports: [UserConfigurationModule],
      enableEndToEnd: true,
    });
  });

  afterEach(async () => {
    delete process.env.USER_CONFIG_DATABASE_URL;
    delete process.env.USER_CONFIG_RATE_LIMIT_WRITE_MAX;
    delete process.env.USER_CONFIG_RATE_LIMIT_IP_WRITE_MAX;
    container.mockServer.close();
    await container.app.close();
  });

  it('creates, reads and deletes only opaque configuration data', async () => {
    const createResponse = await fakeRequest(
      container.app,
      'PUT',
      '/user-configuration',
    ).send({
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'ZW5jcnlwdGVk',
    });
    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body).toMatchObject({
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'ZW5jcnlwdGVk',
      revision: 1,
    });
    expect(createResponse.body.userId).toBeUndefined();

    const readResponse = await fakeRequest(
      container.app,
      'GET',
      '/user-configuration',
    ).send();
    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.body).toEqual(createResponse.body);

    const deleteResponse = await fakeRequest(
      container.app,
      'DELETE',
      '/user-configuration',
    ).send();
    expect(deleteResponse.statusCode).toBe(204);
    const missingResponse = await fakeRequest(
      container.app,
      'GET',
      '/user-configuration',
    ).send();
    expect(missingResponse.statusCode).toBe(404);
  });

  it('rejects malformed envelopes and stale revisions', async () => {
    const invalidResponse = await fakeRequest(
      container.app,
      'PUT',
      '/user-configuration',
    ).send({
      version: 1,
      iv: 'too-short',
      ciphertext: 'ZW5jcnlwdGVk',
    });
    expect(invalidResponse.statusCode).toBe(400);

    await fakeRequest(container.app, 'PUT', '/user-configuration').send({
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'Zmlyc3Q=',
    });
    const staleResponse = await fakeRequest(
      container.app,
      'PUT',
      '/user-configuration',
    ).send({
      version: 1,
      iv: 'BBBBBBBBBBBBBBBB',
      ciphertext: 'c3RhbGU=',
      expectedRevision: 2,
    });
    expect(staleResponse.statusCode).toBe(409);
  });

  it('requires authentication', async () => {
    const response = await fakeRequest(
      container.app,
      'GET',
      '/user-configuration',
      { mockSession: false },
    ).send();
    expect(response.statusCode).toBe(401);
  });

  it('rate-limits repeated writes for one authenticated user', async () => {
    const envelope = {
      version: 1,
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'Zmlyc3Q=',
    };
    const createResponse = await fakeRequest(
      container.app,
      'PUT',
      '/user-configuration',
    ).send(envelope);
    expect(createResponse.statusCode).toBe(200);

    let revision = 1;
    for (let requestNumber = 2; requestNumber <= 3; requestNumber++) {
      const response = await fakeRequest(
        container.app,
        'PUT',
        '/user-configuration',
      ).send({ ...envelope, expectedRevision: revision });
      if (response.statusCode !== 200) {
        throw new Error(
          `Write ${requestNumber} returned ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );
      }
      revision += 1;
    }

    const limitedResponse = await fakeRequest(
      container.app,
      'PUT',
      '/user-configuration',
    ).send({ ...envelope, expectedRevision: revision });
    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.headers['retry-after']).toBeDefined();
  });
});
