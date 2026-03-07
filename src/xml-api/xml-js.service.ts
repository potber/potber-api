import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface Element {
  type?: 'document' | 'element' | 'cdata' | 'text';
  name?: string;
  attributes?: Record<string, string>;
  elements?: Element[];
  cdata?: string;
  text?: string;
}

type OrderedXmlNode = {
  [key: string]:
    | OrderedXmlNode[]
    | Record<string, string>
    | string
    | undefined;
};

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  cdataPropName: 'cdata',
  textNodeName: 'text',
  ignoreDeclaration: true,
  ignorePiTags: true,
});

/**
 * The XmlJsService provides tools to transform the forum's XML objects into JavaScript objects
 * and retrieve certain properties.
 */
@Injectable()
export class XmlJsService {
  /**
   * Parses an XML text to an XmlJs element.
   * @param text The text.
   * @returns The XmlJs element.
   */
  parseXml(text: string): Element {
    const orderedNodes = parser.parse(text) as OrderedXmlNode[];
    return {
      type: 'document',
      elements: orderedNodes
        .map((node) => this.normalizeNode(node))
        .filter((node): node is Element => Boolean(node)),
    };
  }

  /**
   * Get a child element by its name.
   * @param elementName The child element's name.
   * @param element The parent element.
   * @returns The child element or undefined.
   */
  getElement(elementName: string, parentElement: Element) {
    if (parentElement.elements) {
      return parentElement.elements.find(
        (element) =>
          element.name === elementName || element.type === elementName,
      );
    }
    return undefined;
  }

  /**
   * Gets a child element by its name and retrievs its CDATA content.
   * @param elementName The child element's name.
   * @param parentElement The parent element.
   * @returns The child element's CDATA content or undefined.
   */
  getElementCdata(elementName: string, parentElement: Element) {
    const element = this.getElement(elementName, parentElement);
    if (element?.elements) {
      const cdataElement = this.getElement('cdata', element);
      if (cdataElement) return cdataElement.cdata;
    }
    return undefined;
  }

  /**
   * Get an element's attribute by its name.
   * @param attributeName The attribute's name.
   * @param element The parent element.
   * @returns The attribute or undefined.
   */
  getAttribute(attributeName: string, element: Element) {
    if (element?.attributes && element.attributes[attributeName]) {
      return element.attributes[attributeName] as string;
    }
    return undefined;
  }

  private normalizeNode(node: OrderedXmlNode): Element | undefined {
    const [nodeName] = Object.keys(node).filter((key) => key !== ':@');
    if (!nodeName) return undefined;

    if (nodeName === 'text') {
      const text = node.text;
      return typeof text === 'string' ? { type: 'text', text } : undefined;
    }

    if (nodeName === 'cdata') {
      return {
        type: 'cdata',
        cdata: this.extractTextValue(node.cdata),
      };
    }

    const childNodes = node[nodeName];
    const attributes = node[':@'];
    const normalizedChildren = Array.isArray(childNodes)
      ? childNodes
          .map((child) => this.normalizeNode(child))
          .filter((child): child is Element => Boolean(child))
      : undefined;

    return {
      type: 'element',
      name: nodeName,
      attributes:
        attributes && !Array.isArray(attributes)
          ? (attributes as Record<string, string>)
          : undefined,
      elements:
        normalizedChildren && normalizedChildren.length > 0
          ? normalizedChildren
          : undefined,
    };
  }

  private extractTextValue(
    value: OrderedXmlNode[] | Record<string, string> | string | undefined,
  ): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry.text === 'string') return entry.text;
          return '';
        })
        .join('');
    }
    return '';
  }
}
