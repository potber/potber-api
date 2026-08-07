import { Test } from '@nestjs/testing';
import { HttpModule } from 'src/http/http.module';
import { XmlApiModule } from 'src/xml-api/xml-api.module';
import { XmlJsService } from 'src/xml-api/xml-js.service';
import { BookmarksSummaryResource } from '../resources/bookmarks-summary.resource';
import { BookmarkResource } from '../resources/bookmark.resource';
import { BookmarksService } from './bookmarks.service';
import { bookmarksMockData } from './bookmarks.service.spec.includes';
import { HttpService } from 'src/http/http.service';
import { defaultMockSession } from 'test/mocks/session';

describe('Bookmarks | BookmarksService', () => {
  let xmljs: XmlJsService;
  let bookmarksService: BookmarksService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule, XmlApiModule],
      providers: [XmlJsService, BookmarksService],
    }).compile();
    xmljs = await moduleRef.resolve(XmlJsService);
    bookmarksService = await moduleRef.resolve(BookmarksService);
  });

  describe('transformBookmarksSummary', () => {
    it("Should properly transform the bookmarks summary object from the 'bookmarks.php' endpoint.", () => {
      const actual = bookmarksService.transformBookmarksSummary(
        xmljs.parseXml(bookmarksMockData.normal),
      );
      const expected: BookmarksSummaryResource = {
        userId: '123',
        count: 3,
        newPostsCount: 6,
        bookmarks: [
          {
            id: '1',
            postId: '1249805857',
            newPostsCount: 0,
            thread: {
              id: '199729',
              title: 'Der Grafikkarten-Thread',
              isClosed: false,
              pagesCount: 131,
            },
            board: {
              id: '10',
              name: 'Hardware & Netzwerk',
            },
            removeToken: '123',
          },
          {
            id: '2',
            postId: '1249820038',
            newPostsCount: 6,
            thread: {
              id: '194906',
              title: 'Hardware-Kaufberatung',
              isClosed: false,
              pagesCount: 1287,
            },
            board: {
              id: '10',
              name: 'Hardware & Netzwerk',
            },
            removeToken: '456',
          },
          {
            id: '3',
            postId: '1249782727',
            newPostsCount: 0,
            thread: {
              id: '90343',
              title: 'Hardwarekauf oder -tausch',
              isClosed: false,
              pagesCount: 183,
            },
            board: {
              id: '10',
              name: 'Hardware & Netzwerk',
            },
            removeToken: '789',
          },
        ],
      };
      expect(actual).toEqual(expected);
    });
  });

  describe('upstream request construction', () => {
    let get: jest.SpiedFunction<HttpService['get']>;

    beforeEach(() => {
      get = jest
        .spyOn(bookmarksService['httpService'], 'get')
        .mockResolvedValue({ data: 'OK', headers: {} });
    });

    it('encodes bookmark creation parameters', async () => {
      jest
        .spyOn(bookmarksService, 'getCreateToken')
        .mockResolvedValue('token&unexpected=value');
      jest.spyOn(bookmarksService, 'findAll').mockResolvedValue([
        {
          id: '1',
          thread: { id: '456&unexpected=value' },
        } as BookmarkResource,
      ]);

      await bookmarksService.create(
        {
          postId: '123&unexpected=value',
          threadId: '456&unexpected=value',
        },
        defaultMockSession,
      );

      const url = new URL(get.mock.calls[0][0]);
      expect(url.pathname).toBe('/bb/async/set-bookmark.php');
      expect(url.searchParams.get('PID')).toBe('123&unexpected=value');
      expect(url.searchParams.get('token')).toBe('token&unexpected=value');
      expect([...url.searchParams.keys()]).toStrictEqual(['PID', 'token']);
    });

    it('treats the post id as literal text when extracting a token', async () => {
      get.mockResolvedValue({
        data: "setBookmark(123).*evil, 'abcdef')",
        headers: {},
      });

      await expect(
        bookmarksService.getCreateToken(
          '123).*evil',
          '456&unexpected=value',
          defaultMockSession,
        ),
      ).resolves.toBe('abcdef');

      const url = new URL(get.mock.calls[0][0]);
      expect(url.pathname).toBe('/bb/thread.php');
      expect(url.searchParams.get('TID')).toBe('456&unexpected=value');
      expect(url.searchParams.get('PID')).toBe('123).*evil');
      expect([...url.searchParams.keys()]).toStrictEqual(['TID', 'PID']);
    });

    it('encodes bookmark deletion parameters', async () => {
      jest
        .spyOn(bookmarksService, 'getRemoveToken')
        .mockResolvedValue('token&unexpected=value');

      await bookmarksService.delete('123&unexpected=value', defaultMockSession);

      const url = new URL(get.mock.calls[0][0]);
      expect(url.pathname).toBe('/bb/async/remove-bookmark.php');
      expect(url.searchParams.get('BMID')).toBe('123&unexpected=value');
      expect(url.searchParams.get('token')).toBe('token&unexpected=value');
      expect([...url.searchParams.keys()]).toStrictEqual(['BMID', 'token']);
    });
  });
});
