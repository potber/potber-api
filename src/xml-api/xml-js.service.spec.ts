import { XmlJsService } from './xml-js.service';

describe('XmlJsService', () => {
  let service: XmlJsService;

  beforeEach(() => {
    service = new XmlJsService();
  });

  it('should ignore the XML declaration and expose the root element', () => {
    const document = service.parseXml(
      `<?xml version="1.0" encoding="utf-8" ?>
      <thread id="219289">
        <title><![CDATA[Foo]]></title>
      </thread>`,
    );

    expect(document.elements?.[0]).toMatchObject({
      type: 'element',
      name: 'thread',
      attributes: {
        id: '219289',
      },
    });
  });

  it('should return CDATA content through getElementCdata', () => {
    const document = service.parseXml(
      `<thread><title><![CDATA[Foo]]></title></thread>`,
    );

    expect(service.getElementCdata('title', document.elements?.[0])).toBe(
      'Foo',
    );
  });

  it('should preserve empty CDATA content instead of treating it as missing', () => {
    const document = service.parseXml(
      `<thread><content><![CDATA[]]></content></thread>`,
    );
    const thread = document.elements?.[0];
    const content = service.getElement('content', thread);

    expect(service.getElementCdata('content', thread)).toBe('');
    expect(service.getElement('cdata', content)).toMatchObject({
      type: 'cdata',
      cdata: '',
    });
  });
});
