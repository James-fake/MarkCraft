/**
 * Extended Token type aliases for marked lexer output.
 * Re-exports from the `marked` library's Tokens namespace for convenience.
 */
import type { Token, Tokens } from 'marked'

export type HeadingToken = Tokens.Heading
export type ParagraphToken = Tokens.Paragraph
export type CodeToken = Tokens.Code
export type BlockquoteToken = Tokens.Blockquote
export type ListToken = Tokens.List
export type ListItemToken = Tokens.ListItem
export type TableToken = Tokens.Table
export type TableCellToken = Tokens.TableCell

/**
 * Token that may carry inline text and nested tokens.
 * Used as a fallback type when accessing `.text` or `.tokens` on generic tokens.
 */
export interface InlineToken {
  type: string
  raw: string
  text?: string
  tokens?: Token[]
  [key: string]: unknown
}
