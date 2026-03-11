import { http, HttpResponse } from 'msw';
import { forumConfig } from 'src/config/forum.config';
import { readHandlerMockFile } from 'test/helpers/test-utils';

const createSessionCookieResponse = () => {
  const response = new HttpResponse(null, { status: 200 });
  response.headers.append(
    'Set-Cookie',
    'MDESID=foo; Secure; SameSite=None; HttpOnly',
  );
  response.headers.append(
    'Set-Cookie',
    'MDESID=bar; Secure; SameSite=None; HttpOnly',
  );
  return response;
};

export const authHandlers = {
  login: {
    success: [
      http.post(`${forumConfig.LOGIN_URL}`, async () => {
        const xml = readHandlerMockFile(
          'auth/login/success/login.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.SSO_URL}`, async () => {
        return createSessionCookieResponse();
      }),
      http.get(`${forumConfig.API_URL}boards.php`, () => {
        const xml = readHandlerMockFile(
          'auth/login/success/boards.response.xml',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.USER_PAGE_URL}1342456`, () => {
        const xml = readHandlerMockFile(
          'auth/login/success/user.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
    ],
    failure: [
      http.post(`${forumConfig.LOGIN_URL}`, async () => {
        const xml = readHandlerMockFile(
          'auth/login/failure/login.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
    ],
    lockedPermanently: [
      http.post(`${forumConfig.LOGIN_URL}`, async () => {
        const xml = readHandlerMockFile(
          'auth/login/success/login.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.SSO_URL}`, async () => {
        return createSessionCookieResponse();
      }),
      http.get(`${forumConfig.API_URL}boards.php`, () => {
        const xml = readHandlerMockFile(
          'auth/login/success/boards.response.xml',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.USER_PAGE_URL}1342456`, () => {
        const xml = readHandlerMockFile(
          'auth/login/locked-permanently/user.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
    ],
    lockedTemporarily: [
      http.post(`${forumConfig.LOGIN_URL}`, async () => {
        const xml = readHandlerMockFile(
          'auth/login/success/login.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.SSO_URL}`, async () => {
        return createSessionCookieResponse();
      }),
      http.get(`${forumConfig.API_URL}boards.php`, () => {
        const xml = readHandlerMockFile(
          'auth/login/success/boards.response.xml',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
      http.get(`${forumConfig.USER_PAGE_URL}1342456`, () => {
        const xml = readHandlerMockFile(
          'auth/login/locked-temporarily/user.response.html',
        );
        return HttpResponse.text(xml, { status: 200 });
      }),
    ],
  },

  session: {
    success: [],
  },
};
