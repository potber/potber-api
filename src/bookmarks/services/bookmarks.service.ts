import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SessionResource } from 'src/auth/resources/session.resource';
import { forumConfig } from 'src/config/forum.config';
import { HttpService } from 'src/http/http.service';
import { Element, XmlJsService } from 'src/xml-api/xml-js.service';
import { bookmarksExceptions } from '../config/bookmarks.exceptions';
import { BookmarkCreateResource } from '../resources/bookmark.create.resource';
import { BookmarkResource } from '../resources/bookmark.resource';
import { BookmarksSummaryResource } from '../resources/bookmarks-summary.resource';

const buildForumUrl = (
  path: string,
  parameters: Record<string, string>,
): string => {
  const url = new URL(path, forumConfig.FORUM_URL);
  url.search = new URLSearchParams(parameters).toString();
  return url.toString();
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Bookmarks service class. Can return and transform the bookmarks summary and bookmarks, as well as delete bookmarks.
 */
@Injectable()
export class BookmarksService {
  constructor(
    private readonly httpService: HttpService,
    private readonly xmljs: XmlJsService,
  ) {}

  /**
   * Returns the bookmarks summary.
   * @param session The session resource.
   * @returns The bookmarks summary resource.
   */
  async getSummary(
    session: SessionResource,
  ): Promise<BookmarksSummaryResource> {
    const { data } = await this.httpService.get(
      `${forumConfig.API_URL}bookmarks.php`,
      {
        cookie: session.cookie,
      },
    );
    const xmlDocument = this.xmljs.parseXml(data);
    const bookmarksSummary = this.transformBookmarksSummary(xmlDocument);
    return bookmarksSummary;
  }

  /**
   * Wraps BookmarksService.getSummary(), but only returns the bookmarks.
   * @param session The session resource.
   * @returns The bookmarks resource array.
   */
  async findAll(session: SessionResource): Promise<BookmarkResource[]> {
    const summary = await this.getSummary(session);
    return summary.bookmarks;
  }

  /**
   * Transforms the bookmarks summary XML object.
   * @param xmlDocument The bookmarks summary XML object.
   * @returns The bookmarks summary resource.
   */
  transformBookmarksSummary(xmlDocument: Element): BookmarksSummaryResource {
    const bookmarkSummaryNode = this.xmljs.getElement('bookmarks', xmlDocument);
    if (!bookmarkSummaryNode) return null;
    if (bookmarkSummaryNode) {
      const bookmarks: BookmarkResource[] = [];
      if (bookmarkSummaryNode.elements?.length > 0) {
        for (const bookmarkNode of bookmarkSummaryNode.elements) {
          if (bookmarkNode.name !== 'bookmark') continue;
          const bookmark: BookmarkResource = {
            id: this.xmljs.getAttribute('BMID', bookmarkNode),
            newPostsCount: parseInt(
              this.xmljs.getAttribute('newposts', bookmarkNode),
            ),
            postId: this.xmljs.getAttribute('PID', bookmarkNode),
            thread: {
              id: this.xmljs.getAttribute(
                'TID',
                this.xmljs.getElement('thread', bookmarkNode),
              ),
              title: this.xmljs.getElementCdata('thread', bookmarkNode),
              isClosed:
                this.xmljs.getAttribute(
                  'closed',
                  this.xmljs.getElement('thread', bookmarkNode),
                ) === '1',
              pagesCount: parseInt(
                this.xmljs.getAttribute(
                  'pages',
                  this.xmljs.getElement('thread', bookmarkNode),
                ),
              ),
            },
            board: {
              id: this.xmljs.getAttribute(
                'BID',
                this.xmljs.getElement('board', bookmarkNode),
              ),
              name: this.xmljs.getElementCdata('board', bookmarkNode),
            },
            removeToken: this.xmljs.getAttribute(
              'value',
              this.xmljs.getElement('token-removebookmark', bookmarkNode),
            ),
          };
          bookmarks.push(bookmark);
        }
      }
      const bookmarkSummary: BookmarksSummaryResource = {
        userId: this.xmljs.getAttribute('current-user-id', bookmarkSummaryNode),
        count: parseInt(this.xmljs.getAttribute('count', bookmarkSummaryNode)),
        newPostsCount: parseInt(
          this.xmljs.getAttribute('newposts', bookmarkSummaryNode),
        ),
        bookmarks,
      };
      return bookmarkSummary;
    } else {
      return null;
    }
  }

  /**
   * Creates a bookmark.
   * @param newBookmark The bookmark-create resource.
   * @param session The session resource.
   */
  async create(newBookmark: BookmarkCreateResource, session: SessionResource) {
    Logger.log(
      {
        action: 'bookmark.create',
        message: 'Bookmark creation started.',
        post_id: newBookmark.postId,
        thread_id: newBookmark.threadId,
        user_id: session.userId,
      },
      this.constructor.name,
    );
    const token = await this.getCreateToken(
      newBookmark.postId,
      newBookmark.threadId,
      session,
    );
    const url = buildForumUrl('async/set-bookmark.php', {
      PID: newBookmark.postId,
      token,
    });
    const { data } = await this.httpService.get(url, {
      cookie: session.cookie,
    });
    if (!/OK/.test(data)) {
      throw new Error(
        `Unable to create bookmark on post '${newBookmark.postId}'.`,
      );
    }
    const bookmarks = await this.findAll(session);
    const bookmark = bookmarks.find(
      (bookmark) => bookmark.thread.id === newBookmark.threadId,
    );
    if (!bookmark) {
      throw new Error(
        'Bookmark creation was judged successful, but bookmark could not be found.',
      );
    }
    Logger.log(
      {
        action: 'bookmark.create',
        bookmark_id: bookmark.id,
        message: 'Bookmark created.',
        user_id: session.userId,
      },
      this.constructor.name,
    );
    return bookmark;
  }

  async getCreateToken(
    postId: string,
    threadId: string,
    session: SessionResource,
  ) {
    const url = buildForumUrl('thread.php', {
      TID: threadId,
      PID: postId,
    });
    const { data } = await this.httpService.get(url, {
      cookie: session.cookie,
    });
    const regex = new RegExp(
      `(?:(setBookmark\\(${escapeRegExp(postId)}, ')([0-9a-f]*)')`,
    );
    const tokenMatches = data.match(regex);
    if (tokenMatches && tokenMatches.length >= 3) {
      return tokenMatches[2];
    } else {
      throw bookmarksExceptions.create.invalidPost;
    }
  }

  /**
   * Deletes a bookmark.
   * @param id The bookmark id.
   * @param session The session resource.
   */
  async delete(id: string, session: SessionResource): Promise<void> {
    Logger.log(
      {
        action: 'bookmark.delete',
        bookmark_id: id,
        message: 'Bookmark deletion started.',
        user_id: session.userId,
      },
      this.constructor.name,
    );
    const removeToken = await this.getRemoveToken(id, session);
    const url = buildForumUrl('async/remove-bookmark.php', {
      BMID: id,
      token: removeToken,
    });
    const { data } = await this.httpService.get(url, {
      cookie: session.cookie,
    });
    if (!/OK/.test(data)) {
      throw new Error(`Unable to delete bookmark '${id}'.`);
    }
    Logger.log(
      {
        action: 'bookmark.delete',
        bookmark_id: id,
        message: 'Bookmark deleted.',
        user_id: session.userId,
      },
      this.constructor.name,
    );
  }

  /**
   * Returns the removeToken that is required to remove a bookmark.
   */
  async getRemoveToken(id: string, session: SessionResource) {
    const bookmarks = await this.findAll(session);
    const bookmark = bookmarks.find((bookmark) => bookmark.id === id);
    if (!bookmark) {
      throw new NotFoundException();
    }
    return bookmark.removeToken;
  }
}
