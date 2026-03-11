import { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

export const createMockServer = (requestHandlers: RequestHandler[] = []) => {
  const mockServer = setupServer(...requestHandlers);
  mockServer.listen({
    onUnhandledRequest: (request, print) => {
      const url = new URL(request.url);
      // Don't handle internal requests to Nest
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return;
      }
      // Disallow all other unhandled requests
      print.error();
    },
  });
  return mockServer;
};
