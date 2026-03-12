import { http, HttpResponse } from 'msw';
import { forumConfig } from 'src/config/forum.config';

export const usersHandlers = {
  usernames: {
    success: {
      threeMatches: [
        http.get(`${forumConfig.FORUM_URL}pm/async/usernames.php`, () => {
          return HttpResponse.text(`Foo\nFooBar\nFooMaster`, { status: 200 });
        }),
      ],
      noMatches: [
        http.get(`${forumConfig.FORUM_URL}pm/async/usernames.php`, () => {
          return HttpResponse.text(``, { status: 200 });
        }),
      ],
    },
  },
};
