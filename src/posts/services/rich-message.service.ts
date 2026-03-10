import { Injectable } from '@nestjs/common';
import {
  RichMessageContainerNode,
  RichMessageDocument,
  RichMessageLinkNode,
  RichMessageListNode,
  RichMessageNode,
  RichMessageQuoteNode,
  RichMessageTableNode,
  RichMessageVideoNode,
} from '../types/rich-message';

interface ParseOptions {
  groupId?: string;
}

interface ResolvedParseOptions {
  groupId: string;
}

interface TagToken {
  start: number;
  end: number;
  raw: string;
  name: string;
  closing: boolean;
  tail: string;
}

interface ParsedTagResult {
  nextIndex: number;
  nodes: RichMessageNode[];
}

const STANDARD_USER_GROUP_ID = '3';
const URL_REGEX = /\b([a-zA-Z]+:\/\/[^\s\[]+|www\.[^\s\[]+)\b/i;
const QUOTE_METADATA_REGEX = /^(\d*),(\d*),"(.*)"$/s;

@Injectable()
export class RichMessageService {
  parse(input: string, options?: ParseOptions): RichMessageDocument {
    const normalizedInput = input
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n');
    return {
      version: 1,
      nodes: this.parseNodes(normalizedInput, {
        groupId: options?.groupId ?? STANDARD_USER_GROUP_ID,
      }),
    };
  }

  private parseNodes(
    input: string,
    options: ResolvedParseOptions,
  ): RichMessageNode[] {
    const nodes: RichMessageNode[] = [];
    let cursor = 0;
    let textStart = 0;

    while (cursor < input.length) {
      if (input[cursor] !== '[') {
        cursor += 1;
        continue;
      }

      const token = this.readTagToken(input, cursor);
      if (!token) {
        cursor += 1;
        continue;
      }

      this.appendText(nodes, input.slice(textStart, cursor));
      const parsed = this.parseTag(input, token, options);

      if (parsed) {
        for (const node of parsed.nodes) {
          this.appendNode(nodes, node);
        }
        cursor = parsed.nextIndex;
      } else {
        this.appendText(nodes, token.raw);
        cursor = token.end;
      }

      textStart = cursor;
    }

    this.appendText(nodes, input.slice(textStart));
    return nodes;
  }

  private parseTag(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
  ): ParsedTagResult | null {
    if (token.closing) return null;

    switch (token.name) {
      case 'b':
        return this.parseContainerNode(input, token, options, 'bold');
      case 'i':
        return this.parseContainerNode(input, token, options, 'italic');
      case 's':
        return this.parseContainerNode(input, token, options, 'strike');
      case 'u':
        return this.parseContainerNode(input, token, options, 'underline');
      case 'm':
        return this.parseContainerNode(input, token, options, 'preformatted');
      case 'trigger':
        return this.parseContainerNode(input, token, options, 'trigger');
      case 'spoiler':
        return this.parseContainerNode(input, token, options, 'spoiler');
      case 'mod':
        if (options.groupId === STANDARD_USER_GROUP_ID) return null;
        return this.parseContainerNode(input, token, options, 'moderator');
      case 'quote':
        return this.parseQuoteNode(input, token, options);
      case 'url':
        return this.parseUrlNode(input, token, options);
      case 'img':
        return this.parseImageNode(input, token);
      case 'video':
        return this.parseVideoNode(input, token);
      case 'code':
        return this.parseCodeNode(input, token);
      case 'tex':
        return this.parseTexNode(input, token);
      case 'list':
        return this.parseListNode(input, token, options);
      case 'table':
        return this.parseTableNode(input, token, options);
      default:
        return null;
    }
  }

  private parseContainerNode(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
    type: RichMessageContainerNode['type'],
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const children = this.parseNodes(
      input.slice(token.end, closeToken.start),
      options,
    );
    return {
      nextIndex: closeToken.end,
      nodes: [{ type, children }],
    };
  }

  private parseQuoteNode(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const children = this.parseNodes(
      input.slice(token.end, closeToken.start),
      options,
    );
    const node: RichMessageQuoteNode = {
      type: 'quote',
      children,
    };

    const metadata = token.tail.startsWith('=') ? token.tail.slice(1) : '';
    const matches = metadata.match(QUOTE_METADATA_REGEX);
    if (matches) {
      const [, threadId, postId, authorName] = matches;
      if (threadId) node.threadId = threadId;
      if (postId) node.postId = postId;
      if (authorName) node.authorName = authorName;
    }

    return {
      nextIndex: closeToken.end,
      nodes: [node],
    };
  }

  private parseUrlNode(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const rawContent = input.slice(token.end, closeToken.start);
    const children = this.parseNodes(rawContent, options);
    const href = this.resolveUrlHref(token, rawContent);
    const node: RichMessageLinkNode = {
      type: 'link',
      href,
      children,
    };

    return {
      nextIndex: closeToken.end,
      nodes: [node],
    };
  }

  private parseImageNode(
    input: string,
    token: TagToken,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    return {
      nextIndex: closeToken.end,
      nodes: [
        {
          type: 'image',
          src: input.slice(token.end, closeToken.start),
        },
      ],
    };
  }

  private parseVideoNode(
    input: string,
    token: TagToken,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const node: RichMessageVideoNode = {
      type: 'video',
      src: input.slice(token.end, closeToken.start),
      autoplay: token.tail.toLowerCase().includes('play'),
    };

    return {
      nextIndex: closeToken.end,
      nodes: [node],
    };
  }

  private parseCodeNode(
    input: string,
    token: TagToken,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    return {
      nextIndex: closeToken.end,
      nodes: [
        {
          type: 'code',
          value: input.slice(token.end, closeToken.start),
        },
      ],
    };
  }

  private parseTexNode(input: string, token: TagToken): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const value = input.slice(token.end, closeToken.start);
    if (!value) {
      return {
        nextIndex: closeToken.end,
        nodes: [],
      };
    }

    return {
      nextIndex: closeToken.end,
      nodes: [
        {
          type: 'tex',
          value,
        },
      ],
    };
  }

  private parseListNode(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const items = this.splitListItems(
      input.slice(token.end, closeToken.start),
      options,
    );
    const node: RichMessageListNode = {
      type: 'list',
      ordered: token.tail.trim().startsWith('=1'),
      items,
    };

    return {
      nextIndex: closeToken.end,
      nodes: [node],
    };
  }

  private parseTableNode(
    input: string,
    token: TagToken,
    options: ResolvedParseOptions,
  ): ParsedTagResult | null {
    const closeToken = this.findMatchingCloseTag(input, token);
    if (!closeToken) return null;

    const rows = this.splitTableRows(
      input.slice(token.end, closeToken.start),
      options,
    );
    const node: RichMessageTableNode = {
      type: 'table',
      rows,
    };

    return {
      nextIndex: closeToken.end,
      nodes: [node],
    };
  }

  private splitListItems(
    input: string,
    options: ResolvedParseOptions,
  ): RichMessageNode[][] {
    const items: string[] = [];
    let current = '';
    let sawMarker = false;
    let cursor = 0;

    while (cursor < input.length) {
      if (input[cursor] !== '[') {
        current += input[cursor];
        cursor += 1;
        continue;
      }

      const token = this.readTagToken(input, cursor);
      if (!token) {
        current += input[cursor];
        cursor += 1;
        continue;
      }

      if (!token.closing && token.name === '*') {
        if (sawMarker) {
          items.push(current.trim());
        }
        sawMarker = true;
        current = '';
        cursor = token.end;
        continue;
      }

      const closeToken = token.closing
        ? null
        : this.findMatchingCloseTag(input, token);
      if (closeToken) {
        current += input.slice(token.start, closeToken.end);
        cursor = closeToken.end;
        continue;
      }

      current += token.raw;
      cursor = token.end;
    }

    if (!sawMarker) {
      return [this.parseNodes(input.trim(), options)];
    }

    items.push(current.trim());
    return items.map((item) => this.parseNodes(item, options));
  }

  private splitTableRows(
    input: string,
    options: ResolvedParseOptions,
  ): RichMessageNode[][][] {
    return this.splitTopLevelSegments(input, '--').map((row) =>
      this.splitTopLevelSegments(row, '||').map((cell) =>
        this.parseNodes(cell.trim(), options),
      ),
    );
  }

  private splitTopLevelSegments(input: string, marker: string): string[] {
    const segments: string[] = [];
    let current = '';
    let cursor = 0;

    while (cursor < input.length) {
      if (input[cursor] !== '[') {
        current += input[cursor];
        cursor += 1;
        continue;
      }

      const token = this.readTagToken(input, cursor);
      if (!token) {
        current += input[cursor];
        cursor += 1;
        continue;
      }

      if (!token.closing && token.name === marker) {
        segments.push(current.trim());
        current = '';
        cursor = token.end;
        continue;
      }

      const closeToken = token.closing
        ? null
        : this.findMatchingCloseTag(input, token);
      if (closeToken) {
        current += input.slice(token.start, closeToken.end);
        cursor = closeToken.end;
        continue;
      }

      current += token.raw;
      cursor = token.end;
    }

    segments.push(current.trim());
    return segments;
  }

  private resolveUrlHref(token: TagToken, rawContent: string): string {
    if (token.tail.startsWith('=')) {
      return token.tail.slice(1);
    }

    const match = rawContent.replace('&#58;', ':').match(URL_REGEX);
    if (match?.[1]) return match[1];
    return rawContent;
  }

  private findMatchingCloseTag(
    input: string,
    openingTag: TagToken,
  ): TagToken | null {
    let depth = 1;
    let cursor = openingTag.end;

    while (cursor < input.length) {
      const nextBracket = input.indexOf('[', cursor);
      if (nextBracket === -1) return null;

      const token = this.readTagToken(input, nextBracket);
      if (!token) {
        cursor = nextBracket + 1;
        continue;
      }

      if (token.name === openingTag.name) {
        if (token.closing) {
          depth -= 1;
          if (depth === 0) return token;
        } else {
          depth += 1;
        }
      }

      cursor = token.end;
    }

    return null;
  }

  private readTagToken(input: string, start: number): TagToken | null {
    if (input[start] !== '[') return null;

    let cursor = start + 1;
    let quote: '"' | "'" | null = null;

    while (cursor < input.length) {
      const character = input[cursor];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ']') {
        break;
      }
      cursor += 1;
    }

    if (cursor >= input.length || input[cursor] !== ']') return null;

    const raw = input.slice(start, cursor + 1);
    const content = raw.slice(1, -1).trim();
    if (!content) return null;

    if (content.startsWith('/')) {
      return {
        start,
        end: cursor + 1,
        raw,
        name: content.slice(1).trim().toLowerCase(),
        closing: true,
        tail: '',
      };
    }

    const match = content.match(/^([^\s=]+)([\s\S]*)$/);
    if (!match) return null;

    return {
      start,
      end: cursor + 1,
      raw,
      name: match[1].toLowerCase(),
      closing: false,
      tail: match[2] ?? '',
    };
  }

  private appendText(nodes: RichMessageNode[], text: string) {
    if (!text) return;

    const parts = text.split('\n');
    parts.forEach((part, index) => {
      if (part) {
        this.appendNode(nodes, {
          type: 'text',
          value: part,
        });
      }

      if (index < parts.length - 1) {
        nodes.push({ type: 'lineBreak' });
      }
    });
  }

  private appendNode(nodes: RichMessageNode[], node: RichMessageNode) {
    if (node.type !== 'text') {
      nodes.push(node);
      return;
    }

    if (!node.value) return;

    const lastNode = nodes[nodes.length - 1];
    if (lastNode?.type === 'text') {
      lastNode.value += node.value;
      return;
    }

    nodes.push(node);
  }
}
