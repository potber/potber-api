import { http, HttpResponse } from 'msw';
import { forumConfig } from 'src/config/forum.config';
import { readHandlerMockFile } from 'test/helpers/test-utils';

export const postsHandlers = {
  report: {
    success: [
      http.post(`${forumConfig.FORUM_URL}reportpost.php`, () => {
        const html = readHandlerMockFile('posts/report/report.success.html');
        return HttpResponse.text(html, { status: 200 });
      }),
    ],
    notFound: [
      http.post(`${forumConfig.FORUM_URL}reportpost.php`, () => {
        const html = readHandlerMockFile(
          'posts/report/report.failure-not-found.html',
        );
        return HttpResponse.text(html, { status: 200 });
      }),
    ],
    alreadyReported: [
      http.post(`${forumConfig.FORUM_URL}reportpost.php`, () => {
        const html = readHandlerMockFile(
          'posts/report/report.failure-already-reported.html',
        );
        return HttpResponse.text(html, { status: 200 });
      }),
    ],
    unknownFailure: [
      http.post(`${forumConfig.FORUM_URL}reportpost.php`, () => {
        return HttpResponse.text('foo bar', { status: 200 });
      }),
    ],
  },
};
