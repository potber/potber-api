import { TestContainer, createTestContainer } from 'test/container';
import { PostsModule } from './posts.module';
import { postsHandlers } from 'test/msw/handlers/posts/posts.handlers';
import { fakeRequest } from 'test/helpers/fake-request';
import { threadsHandlers } from 'test/msw/handlers/threads/threads.handlers';

describe('Posts | e2e', () => {
  let container: TestContainer;

  beforeEach(async () => {
    container = await createTestContainer({
      imports: [PostsModule],
      enableEndToEnd: true,
    });
  });

  describe('GET :id', () => {
    it('should omit richMessage by default', async () => {
      container.mockServer.use(...threadsHandlers.findById.success);
      const request = fakeRequest(
        container.app,
        'GET',
        '/posts/1250038718?threadId=219501',
      );
      const response = await request.send();

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('richMessage');
    });

    it('should include richMessage when requested', async () => {
      container.mockServer.use(...threadsHandlers.findById.success);
      const request = fakeRequest(
        container.app,
        'GET',
        '/posts/1250038718?threadId=219501&include=richMessage',
      );
      const response = await request.send();

      expect(response.status).toBe(200);
      expect(response.body.richMessage).toEqual({
        version: 1,
        nodes: [{ type: 'text', value: 'das ist der startpost' }],
      });
    });
  });

  describe('POST :id/report', () => {
    it('should be successful', async () => {
      container.mockServer.use(...postsHandlers.report.success);
      const request = fakeRequest(container.app, 'POST', '/posts/123/report');
      const response = await request.send({
        cause: 'foo',
      });
      expect(response.status).toBe(201);
    });

    it('should fail with 401', async () => {
      const request = fakeRequest(container.app, 'POST', '/posts/123/report', {
        mockSession: false,
      });
      const response = await request.send({
        cause: 'foo',
      });
      expect(response.status).toBe(401);
    });

    it('should fail with 400 due to missing or invalid cause', async () => {
      const request = fakeRequest(container.app, 'POST', '/posts/123/report');
      let response = await request.send();
      expect(response.status).toBe(400);
      response = await request.send({
        cause: 123,
      });
      expect(response.status).toBe(400);
    });

    it('should fail with 404 due to invalid post id', async () => {
      container.mockServer.use(...postsHandlers.report.notFound);
      const request = fakeRequest(container.app, 'POST', '/posts/123/report');
      const response = await request.send({
        cause: 'foo',
      });
      expect(response.status).toBe(404);
    });

    it('should fail with 409 due to the post already having been reported', async () => {
      container.mockServer.use(...postsHandlers.report.alreadyReported);
      const request = fakeRequest(container.app, 'POST', '/posts/123/report');
      const response = await request.send({
        cause: 'foo',
      });
      expect(response.status).toBe(409);
    });

    it('should fail with 500 due to an unknown error', async () => {
      container.mockServer.use(...postsHandlers.report.unknownFailure);
      const request = fakeRequest(container.app, 'POST', '/posts/123/report');
      const response = await request.send({
        cause: 'foo',
      });
      expect(response.status).toBe(500);
    });
  });
});
