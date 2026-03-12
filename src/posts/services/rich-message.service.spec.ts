import { RichMessageDocument, RichMessageNode } from '../types/rich-message';
import { RichMessageService } from './rich-message.service';

const doc = (...nodes: RichMessageNode[]): RichMessageDocument => ({
  version: 1,
  nodes,
});

const text = (value: string): RichMessageNode => ({
  type: 'text',
  value,
});

const lineBreak = (): RichMessageNode => ({
  type: 'lineBreak',
});

const container = (
  type:
    | 'bold'
    | 'italic'
    | 'strike'
    | 'underline'
    | 'preformatted'
    | 'trigger'
    | 'spoiler'
    | 'moderator',
  ...children: RichMessageNode[]
): RichMessageNode => ({
  type,
  children,
});

const code = (value: string): RichMessageNode => ({
  type: 'code',
  value,
});

const tex = (value: string): RichMessageNode => ({
  type: 'tex',
  value,
});

const link = (
  href: string,
  ...children: RichMessageNode[]
): RichMessageNode => ({
  type: 'link',
  href,
  children,
});

const quote = (
  children: RichMessageNode[],
  metadata?: { threadId?: string; postId?: string; authorName?: string },
): RichMessageNode => ({
  type: 'quote',
  children,
  ...metadata,
});

const image = (src: string): RichMessageNode => ({
  type: 'image',
  src,
});

const video = (src: string, autoplay = false): RichMessageNode => ({
  type: 'video',
  src,
  autoplay,
});

const list = (
  ordered: boolean,
  ...items: RichMessageNode[][]
): RichMessageNode => ({
  type: 'list',
  ordered,
  items,
});

const table = (...rows: RichMessageNode[][][]): RichMessageNode => ({
  type: 'table',
  rows,
});

const item = (...nodes: RichMessageNode[]) => nodes;
const cell = (...nodes: RichMessageNode[]) => nodes;
const row = (...cells: RichMessageNode[][]) => cells;

describe('Posts | RichMessageService', () => {
  let service: RichMessageService;

  beforeEach(() => {
    service = new RichMessageService();
  });

  it('parses simple formatting and line breaks', () => {
    expect(service.parse('[b]hello[/b]\nworld')).toEqual(
      doc(container('bold', text('hello')), lineBreak(), text('world')),
    );
  });

  it('parses quotes with metadata and nested formatting', () => {
    expect(
      service.parse(
        '[quote=219289,1249894846,"Ameisenfutter"][b]foo[/b][/quote]',
      ),
    ).toEqual(
      doc(
        quote([container('bold', text('foo'))], {
          threadId: '219289',
          postId: '1249894846',
          authorName: 'Ameisenfutter',
        }),
      ),
    );
  });

  it('keeps mod tags as plain text for standard users', () => {
    expect(service.parse('[mod]hello world[/mod]')).toEqual(
      doc(text('[mod]hello world[/mod]')),
    );
  });

  it('parses url tags with nested image content', () => {
    expect(
      service.parse('[url][img]https://cdn.bsky.app/image.jpeg[/img][/url]'),
    ).toEqual(
      doc(
        link(
          'https://cdn.bsky.app/image.jpeg',
          image('https://cdn.bsky.app/image.jpeg'),
        ),
      ),
    );
  });

  it('parses lists, tables and leaf nodes', () => {
    expect(
      service.parse(
        '[list=1][*]Foo[*][table]Bar[||][code]baz[/code][/table][*][video play]https://i.imgur.com/test.mp4[/video][/list]',
        {
          groupId: '2',
        },
      ),
    ).toEqual(
      doc(
        list(
          true,
          item(text('Foo')),
          item(table(row(cell(text('Bar')), cell(code('baz'))))),
          item(video('https://i.imgur.com/test.mp4', true)),
        ),
      ),
    );
  });

  describe('adapted potber-client cases', () => {
    it('matches simple tags: bold', () => {
      expect(service.parse('[b]hello world[/b]')).toEqual(
        doc(container('bold', text('hello world'))),
      );
    });

    it('matches simple tags: italic', () => {
      expect(service.parse('[i]hello world[/i]')).toEqual(
        doc(container('italic', text('hello world'))),
      );
    });

    it('matches simple tags: strike', () => {
      expect(service.parse('[s]hello world[/s]')).toEqual(
        doc(container('strike', text('hello world'))),
      );
    });

    it('matches simple tags: underline', () => {
      expect(service.parse('[u]hello world[/u]')).toEqual(
        doc(container('underline', text('hello world'))),
      );
    });

    it('matches simple tags: preformatted', () => {
      expect(service.parse('[m]hello world[/m]')).toEqual(
        doc(container('preformatted', text('hello world'))),
      );
    });

    it('matches simple tags: trigger', () => {
      expect(service.parse('[trigger]hello world[/trigger]')).toEqual(
        doc(container('trigger', text('hello world'))),
      );
    });

    it('matches simple tags: spoiler', () => {
      expect(service.parse('[spoiler]hello world[/spoiler]')).toEqual(
        doc(container('spoiler', text('hello world'))),
      );
    });

    it('matches privileged tags: keep mod as text for standard users', () => {
      expect(service.parse('[mod]hello world[/mod]')).toEqual(
        doc(text('[mod]hello world[/mod]')),
      );
    });

    it('matches privileged tags: parse mod for privileged users', () => {
      expect(service.parse('[mod]hello world[/mod]', { groupId: '2' })).toEqual(
        doc(container('moderator', text('hello world'))),
      );
    });

    it('matches code tags: basic code block', () => {
      expect(service.parse('[code]hello world[/code]')).toEqual(
        doc(code('hello world')),
      );
    });

    it('matches code tags: raw html content', () => {
      expect(
        service.parse(`[code]<div class="foo">bar</bar><input/>
    <foo>blablubb[/code]`),
      ).toEqual(
        doc(
          code(`<div class="foo">bar</bar><input/>
    <foo>blablubb`),
        ),
      );
    });

    it('matches code tags: preserve inner bbcode and whitespace', () => {
      expect(
        service.parse(`Ich trage ein:
    [code]
    [video] [URL]https://www.youtube.com/watch?v=5fFpMnPC3Sk[/URL][/video]
    [/code]`),
      ).toEqual(
        doc(
          text('Ich trage ein:'),
          lineBreak(),
          text('    '),
          code(`
    [video] [URL]https://www.youtube.com/watch?v=5fFpMnPC3Sk[/URL][/video]
    `),
        ),
      );
    });

    it('matches tex tags', () => {
      expect(service.parse('[tex]hello world[/tex]')).toEqual(
        doc(tex('hello world')),
      );
    });

    it('matches url tags: explicit href with multiline label', () => {
      expect(
        service.parse(`[url=https://www.t-online.de/nachrichten/deutschland/innenpolitik/id_100219588/afd-parteitag-26-jaehrige-kaiser-will-21-jahre-berufserfahrung-haben.html]Erstaunen auf dem Parteitag
    26-jährige AfD-Frau: Habe 21 Jahre Berufserfahrung[/url]`),
      ).toEqual(
        doc(
          link(
            'https://www.t-online.de/nachrichten/deutschland/innenpolitik/id_100219588/afd-parteitag-26-jaehrige-kaiser-will-21-jahre-berufserfahrung-haben.html',
            text('Erstaunen auf dem Parteitag'),
            lineBreak(),
            text('    26-jährige AfD-Frau: Habe 21 Jahre Berufserfahrung'),
          ),
        ),
      );
    });

    it('matches url tags: uppercase tag without backend forum replacement', () => {
      expect(
        service.parse(
          '[URL]https://forum.mods.de/bb//thread.php?TID=219311&PID=1250001764[/URL]',
        ),
      ).toEqual(
        doc(
          link(
            'https://forum.mods.de/bb//thread.php?TID=219311&PID=1250001764',
            text(
              'https://forum.mods.de/bb//thread.php?TID=219311&PID=1250001764',
            ),
          ),
        ),
      );
    });

    it('matches url tags: simple explicit href', () => {
      expect(service.parse('[url=foo.com]Foo[/url]')).toEqual(
        doc(link('foo.com', text('Foo'))),
      );
    });

    it('matches url tags: keep encoded colon in explicit href', () => {
      expect(
        service.parse(`[b][i]Du willst doch mein Passwort![/i][/b]
    Passwörter werden natürlich nicht gespeichert. Weil der Quellcode offen ist, lässt sich das [url=https&#58;//github.com/spuxx-dev/potber-client/blob/develop/app/controllers/login.ts#L30]hier[/url] (Client) und [url=https://github.com/spuxx-dev/potber-api/blob/develop/src/auth/auth.service.ts#L19]hier[/url] (API) auch nachprüfen.`),
      ).toEqual(
        doc(
          container(
            'bold',
            container('italic', text('Du willst doch mein Passwort!')),
          ),
          lineBreak(),
          text(
            '    Passwörter werden natürlich nicht gespeichert. Weil der Quellcode offen ist, lässt sich das ',
          ),
          link(
            'https&#58;//github.com/spuxx-dev/potber-client/blob/develop/app/controllers/login.ts#L30',
            text('hier'),
          ),
          text(' (Client) und '),
          link(
            'https://github.com/spuxx-dev/potber-api/blob/develop/src/auth/auth.service.ts#L19',
            text('hier'),
          ),
          text(' (API) auch nachprüfen.'),
        ),
      );
    });

    it('matches url tags: nested image payload', () => {
      expect(
        service.parse('[url][img]https://cdn.bsky.app/image.jpeg[/img][/url]'),
      ).toEqual(
        doc(
          link(
            'https://cdn.bsky.app/image.jpeg',
            image('https://cdn.bsky.app/image.jpeg'),
          ),
        ),
      );
    });

    it('matches list tags: basic unordered list', () => {
      expect(service.parse(`[list][*]Foo\r\n[*]Bar\r\n[/list]`)).toEqual(
        doc(list(false, item(text('Foo')), item(text('Bar')))),
      );
    });

    it('matches list tags: ordered list', () => {
      expect(service.parse('[list=1][*]Ordered[*]List[/list]')).toEqual(
        doc(list(true, item(text('Ordered')), item(text('List')))),
      );
    });

    it('matches list tags: preserve surrounding text', () => {
      expect(
        service.parse('List with newline\n[list]\n[*] Foo\n[*] Bar\n[/list]'),
      ).toEqual(
        doc(
          text('List with newline'),
          lineBreak(),
          list(false, item(text('Foo')), item(text('Bar'))),
        ),
      );
    });

    it('matches list tags: preserve raw html items', () => {
      expect(
        service.parse(
          '<b>3.2 Links</b>\n' +
            '[list][*] <a href="https://api.potber.de" target="_blank">potber-api</a>' +
            '[*] <a href="https://test-api.potber.de" target="_blank">potber-api (Testumgebung)</a> - Neue Features können hier getestet werden (obacht, instabil!)' +
            '[*] <a href="https://github.com/spuxx-dev/potber-api/blob/develop/README.md" target="_blank">Dokumentation</a>' +
            '[*] <a href="https://github.com/spuxx-dev/potber-api/blob/develop/CHANGELOG.md" target="_blank">Changelog</a>' +
            '[*] <a href="https://github.com/spuxx-dev/potber-api/issues" target="_blank">GitHub Issues</a> - Bugs & Feature requests' +
            '[*]<a href="https://github.com/spuxx-dev/potber-api" target="_blank">GitHub Repository</a>' +
            '[*] <a href="https://hub.docker.com/repository/docker/spuxx/potber-api/general" target="_blank"> DockerHub Repository</a>' +
            '[/list]',
        ),
      ).toEqual(
        doc(
          text('<b>3.2 Links</b>'),
          lineBreak(),
          list(
            false,
            item(
              text(
                '<a href="https://api.potber.de" target="_blank">potber-api</a>',
              ),
            ),
            item(
              text(
                '<a href="https://test-api.potber.de" target="_blank">potber-api (Testumgebung)</a> - Neue Features können hier getestet werden (obacht, instabil!)',
              ),
            ),
            item(
              text(
                '<a href="https://github.com/spuxx-dev/potber-api/blob/develop/README.md" target="_blank">Dokumentation</a>',
              ),
            ),
            item(
              text(
                '<a href="https://github.com/spuxx-dev/potber-api/blob/develop/CHANGELOG.md" target="_blank">Changelog</a>',
              ),
            ),
            item(
              text(
                '<a href="https://github.com/spuxx-dev/potber-api/issues" target="_blank">GitHub Issues</a> - Bugs & Feature requests',
              ),
            ),
            item(
              text(
                '<a href="https://github.com/spuxx-dev/potber-api" target="_blank">GitHub Repository</a>',
              ),
            ),
            item(
              text(
                '<a href="https://hub.docker.com/repository/docker/spuxx/potber-api/general" target="_blank"> DockerHub Repository</a>',
              ),
            ),
          ),
        ),
      );
    });

    it('matches table tags: basic table', () => {
      expect(service.parse('[table]hello world[/table]')).toEqual(
        doc(table(row(cell(text('hello world'))))),
      );
    });

    it('matches table tags: rows and columns', () => {
      expect(
        service.parse('[table border=0]Hello[||]World[--]Foo[||]Bar[/table]'),
      ).toEqual(
        doc(
          table(
            row(cell(text('Hello')), cell(text('World'))),
            row(cell(text('Foo')), cell(text('Bar'))),
          ),
        ),
      );
    });

    it('matches table tags: preserve raw html cell content', () => {
      expect(
        service.parse(`[table]

    Ameisenfutter [||] JS & Web-Kram (<a href="https://github.com/spuxx-dev" target="_blank">GitHub</a>)

    [--]

    anoX* [||] so ziemlich alles (und ABAP, lel)

    [--]

    Atomsk [||] TSQL, DAX, C#

    [/table]`),
      ).toEqual(
        doc(
          table(
            row(
              cell(text('Ameisenfutter')),
              cell(
                text(
                  'JS & Web-Kram (<a href="https://github.com/spuxx-dev" target="_blank">GitHub</a>)',
                ),
              ),
            ),
            row(
              cell(text('anoX*')),
              cell(text('so ziemlich alles (und ABAP, lel)')),
            ),
            row(cell(text('Atomsk')), cell(text('TSQL, DAX, C#'))),
          ),
        ),
      );
    });

    it('matches quote tags: basic quote', () => {
      expect(service.parse('[quote]hello world[/quote]')).toEqual(
        doc(quote([text('hello world')])),
      );
    });

    it('matches quote tags: preserve author names with brackets', () => {
      expect(
        service.parse(`[quote=219289,1249882746,"[DtS]theSameButcher"]<b>

    Gibt es eigentlich auch schon Statistiken wieviele User, Posts via potber erstellt wurden?

    </b>[/quote]

    Ne, ich sammle solche Daten absichtlich nicht. Das könnte ich easy tun, aber:`),
      ).toEqual(
        doc(
          quote(
            [
              text('<b>'),
              lineBreak(),
              lineBreak(),
              text(
                '    Gibt es eigentlich auch schon Statistiken wieviele User, Posts via potber erstellt wurden?',
              ),
              lineBreak(),
              lineBreak(),
              text('    </b>'),
            ],
            {
              threadId: '219289',
              postId: '1249882746',
              authorName: '[DtS]theSameButcher',
            },
          ),
          lineBreak(),
          lineBreak(),
          text(
            '    Ne, ich sammle solche Daten absichtlich nicht. Das könnte ich easy tun, aber:',
          ),
        ),
      );
    });

    it('matches quote tags: nested quotes', () => {
      expect(
        service.parse(`[quote=219289,1249894846,"Ameisenfutter"]<b>
    [quote=219289,1249894747,"audax"]<b>
    Feature Wunsch: Pausieren von Videos wenn man weiter scrollt, bis sie nicht mehr als 30% sichtbar sind.
    </b>[/quote]

    Puh. Mach mal issue auf github :D
    </b>[/quote]

    Wird gemacht! Anschließend kannst du es ganz nach hinten ins Backlog schieben weil Viewports Krieg sind.`),
      ).toEqual(
        doc(
          quote(
            [
              text('<b>'),
              lineBreak(),
              text('    '),
              quote(
                [
                  text('<b>'),
                  lineBreak(),
                  text(
                    '    Feature Wunsch: Pausieren von Videos wenn man weiter scrollt, bis sie nicht mehr als 30% sichtbar sind.',
                  ),
                  lineBreak(),
                  text('    </b>'),
                ],
                {
                  threadId: '219289',
                  postId: '1249894747',
                  authorName: 'audax',
                },
              ),
              lineBreak(),
              lineBreak(),
              text('    Puh. Mach mal issue auf github :D'),
              lineBreak(),
              text('    </b>'),
            ],
            {
              threadId: '219289',
              postId: '1249894846',
              authorName: 'Ameisenfutter',
            },
          ),
          lineBreak(),
          lineBreak(),
          text(
            '    Wird gemacht! Anschließend kannst du es ganz nach hinten ins Backlog schieben weil Viewports Krieg sind.',
          ),
        ),
      );
    });

    it('matches img tags: preserve text and normalize line breaks', () => {
      expect(
        service.parse(
          'du meinst der gierige goblin, der sich eine yacht leisten will, hat nichts mit dem kotick zu tun?\r\n\r\n[img]https://i.imgur.com/AmFYJIk.png[/img]',
        ),
      ).toEqual(
        doc(
          text(
            'du meinst der gierige goblin, der sich eine yacht leisten will, hat nichts mit dem kotick zu tun?',
          ),
          lineBreak(),
          lineBreak(),
          image('https://i.imgur.com/AmFYJIk.png'),
        ),
      );
    });

    it('matches img tags: mixed with video content', () => {
      expect(
        service.parse(`[video]https://www.youtube.com/watch?v=kRzgCylePjk[/video]

    [img]https://i.imgur.com/7j15tXU.jpeg[/img]`),
      ).toEqual(
        doc(
          video('https://www.youtube.com/watch?v=kRzgCylePjk'),
          lineBreak(),
          lineBreak(),
          text('    '),
          image('https://i.imgur.com/7j15tXU.jpeg'),
        ),
      );
    });

    it('matches video tags: youtube embed candidate', () => {
      expect(
        service.parse(
          '[video]https://www.youtube.com/watch?v=--y3Rw3a4Zs[/video]',
        ),
      ).toEqual(doc(video('https://www.youtube.com/watch?v=--y3Rw3a4Zs')));
    });

    it('matches video tags: autoplay flag', () => {
      expect(
        service.parse('[video play]https://i.imgur.com/PWI3g0N.mp4[/video]'),
      ).toEqual(doc(video('https://i.imgur.com/PWI3g0N.mp4', true)));
    });

    it('matches video tags: multiple videos with surrounding text', () => {
      expect(
        service.parse(`[video]https://i.imgur.com/3L4B6FD.mp4[/video]
    Funny? Impressive?
    Both!

    [video]https://i.imgur.com/hryNUcS.mp4[/video]
    [video]https://i.imgur.com/MvdqRZa.mp4[/video]
    The difference a year makes.`),
      ).toEqual(
        doc(
          video('https://i.imgur.com/3L4B6FD.mp4'),
          lineBreak(),
          text('    Funny? Impressive?'),
          lineBreak(),
          text('    Both!'),
          lineBreak(),
          lineBreak(),
          text('    '),
          video('https://i.imgur.com/hryNUcS.mp4'),
          lineBreak(),
          text('    '),
          video('https://i.imgur.com/MvdqRZa.mp4'),
          lineBreak(),
          text('    The difference a year makes.'),
        ),
      );
    });

    it('matches plain text: do not sanitize on the backend', () => {
      expect(service.parse('<oh nein! Irgendweg.gif>')).toEqual(
        doc(text('<oh nein! Irgendweg.gif>')),
      );
    });
  });
});
