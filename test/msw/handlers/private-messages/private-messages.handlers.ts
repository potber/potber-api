import { http, HttpResponse } from 'msw';
import { forumConfig } from 'src/config/forum.config';
import { readHandlerMockFile } from 'test/helpers/test-utils';

export const privateMessagesHandlers = {
  send: {
    success: [
      http.post(`${forumConfig.FORUM_URL}pm`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (searchParams.get('a') !== '6')
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('private-messages/send/success.html'),
          { status: 200 },
        );
      }),
    ],
    invalidUser: [
      http.post(`${forumConfig.FORUM_URL}pm`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (searchParams.get('a') !== '6')
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('private-messages/send/invalid-user.html'),
          { status: 200 },
        );
      }),
    ],
    unknown: [
      http.post(`${forumConfig.FORUM_URL}pm`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (searchParams.get('a') !== '6')
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('private-messages/send/unknown.html'),
          { status: 200 },
        );
      }),
    ],
  },
  replyOrForward: {
    success: [
      http.get(`${forumConfig.FORUM_URL}pm`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (searchParams.get('a') !== '5' || !searchParams.get('reply'))
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile('private-messages/reply-or-forward/success.html'),
          { status: 200 },
        );
      }),
    ],
    notFound: [
      http.get(`${forumConfig.FORUM_URL}pm`, ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (searchParams.get('a') !== '5' || !searchParams.get('reply'))
          return new HttpResponse(null, { status: 404 });
        return HttpResponse.text(
          readHandlerMockFile(
            'private-messages/reply-or-forward/not-found.html',
          ),
          { status: 200 },
        );
      }),
    ],
    unknown: [
      http.get(`${forumConfig.FORUM_URL}pm`, () => {
        return HttpResponse.text(
          readHandlerMockFile('private-messages/reply-or-forward/unknown.html'),
          { status: 200 },
        );
      }),
    ],
  },
};
