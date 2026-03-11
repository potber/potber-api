import { http, HttpResponse } from 'msw';
import { forumConfig } from 'src/config/forum.config';
import { readHandlerMockFile } from 'test/helpers/test-utils';
import { parseFormData } from 'test/msw/parse-form-data';

export const threadsHandlers = {
  create: {
    success: [
      http.get(`${forumConfig.FORUM_URL}newthread.php`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (!searchParams.get('BID'))
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('threads/create/token.html'),
          { status: 200 },
        );
      }),
      http.post(
        `${forumConfig.FORUM_URL}newthread.php`,
        async ({ request }) => {
          const body = await parseFormData(request);
          if (!body['BID']) {
            return HttpResponse.text(
              readHandlerMockFile('threads/create/missing-board-id.html'),
              { status: 200 },
            );
          } else if (!body['thread_title']) {
            return HttpResponse.text(
              readHandlerMockFile('threads/create/missing-title.html'),
              { status: 200 },
            );
          } else if (!body['message']) {
            return HttpResponse.text(
              readHandlerMockFile('threads/create/missing-message.html'),
              { status: 200 },
            );
          } else {
            return HttpResponse.text(
              readHandlerMockFile('threads/create/success.html'),
              { status: 200 },
            );
          }
        },
      ),
      http.get(`${forumConfig.API_URL}thread.php`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (!searchParams.get('TID'))
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('threads/create/thread.xml'),
          { status: 200 },
        );
      }),
    ],
    forbidden: [
      http.get(`${forumConfig.FORUM_URL}newthread.php`, () => {
        return HttpResponse.text(
          readHandlerMockFile('threads/create/token-forbidden.html'),
          { status: 200 },
        );
      }),
    ],
  },
};
