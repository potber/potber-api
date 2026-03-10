export interface RichMessageDocument {
  version: 1;
  nodes: RichMessageNode[];
}

export type RichMessageNode =
  | RichMessageTextNode
  | RichMessageLineBreakNode
  | RichMessageContainerNode
  | RichMessageCodeNode
  | RichMessageTexNode
  | RichMessageLinkNode
  | RichMessageQuoteNode
  | RichMessageImageNode
  | RichMessageVideoNode
  | RichMessageListNode
  | RichMessageTableNode;

export interface RichMessageTextNode {
  type: 'text';
  value: string;
}

export interface RichMessageLineBreakNode {
  type: 'lineBreak';
}

export interface RichMessageContainerNode {
  type:
    | 'bold'
    | 'italic'
    | 'strike'
    | 'underline'
    | 'preformatted'
    | 'trigger'
    | 'spoiler'
    | 'moderator';
  children: RichMessageNode[];
}

export interface RichMessageCodeNode {
  type: 'code';
  value: string;
}

export interface RichMessageTexNode {
  type: 'tex';
  value: string;
}

export interface RichMessageLinkNode {
  type: 'link';
  href: string;
  children: RichMessageNode[];
}

export interface RichMessageQuoteNode {
  type: 'quote';
  children: RichMessageNode[];
  threadId?: string;
  postId?: string;
  authorName?: string;
}

export interface RichMessageImageNode {
  type: 'image';
  src: string;
}

export interface RichMessageVideoNode {
  type: 'video';
  src: string;
  autoplay: boolean;
}

export interface RichMessageListNode {
  type: 'list';
  ordered: boolean;
  items: RichMessageNode[][];
}

export interface RichMessageTableNode {
  type: 'table';
  rows: RichMessageNode[][][];
}
