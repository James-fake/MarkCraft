import { useMemo, useRef } from 'react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockWithView from '../extensions/CodeBlockWithView'
import Link from '@tiptap/extension-link'
import ImageNode from '../extensions/ImageNode'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Typography from '@tiptap/extension-typography'
import { TableKit } from '@tiptap/extension-table'
import TableTabNavigation from '../extensions/TableTabNavigation'
import ClearMarksOnEnter from '../extensions/ClearMarksOnEnter'
import InlineCodeHighlight from '../extensions/InlineCodeHighlight'
import TaskListInputRule from '../extensions/TaskListInputRule'
import LinkInputRule from '../extensions/LinkInputRule'
import MathInlineAutoConvert from '../extensions/MathInline'
import MathInlineNode from '../extensions/MathInlineNode'
import MathBlock from '../extensions/MathBlock'
import MermaidBlock from '../extensions/MermaidBlock'
import PlantUmlBlock from '../extensions/PlantUmlBlock'
import FootnoteReference from '../extensions/FootnoteReference'
import FootnoteInputRule from '../extensions/FootnoteInputRule'
import FootnoteTooltip from '../extensions/FootnoteTooltip'
import WikiLink from '../extensions/WikiLink'
import BlockReference from '../extensions/BlockReference'
import EmbedContent from '../extensions/EmbedContent'
import CalloutNode from '../extensions/CalloutNode'
import CommentMark from '../extensions/CommentMark'
import MarkdownInlineInputRules from '../extensions/MarkdownInlineInputRules'
import BlockInputRules from '../extensions/BlockInputRules'
import ImageInputRule from '../extensions/ImageInputRule'
import ListInputRules from '../extensions/ListInputRules'
import SmartBackspace from '../extensions/SmartBackspace'
import SearchExtension from '../extensions/SearchExtension'
import LintExtension from '../extensions/LintExtension'
import { createUndoRedoExtension } from '../extensions/UndoRedoShortcuts'
import UnifiedShortcuts from '../extensions/UnifiedShortcuts'
import HeadingId from '../extensions/HeadingId'
import HeadingIdAssign from '../extensions/HeadingIdAssign'
import LivePreviewExtension from '../extensions/LivePreviewExtension'
import LivePreviewHeading from '../extensions/LivePreviewHeading'
import LivePreviewBlockquote from '../extensions/LivePreviewBlockquote'
import TransitionExtension from '../extensions/TransitionExtension'
import CodeBlockSmartIndent from '../extensions/CodeBlockSmartIndent'
import TocNode from '../extensions/TocNode'
import HighlightMark from '../../shared/utils/HighlightMark'
import SubscriptMark from '../extensions/SubscriptMark'
import SuperscriptMark from '../extensions/SuperscriptMark'
import AbbreviationMark from '../extensions/AbbreviationMark'
import RawHtmlBlock from '../extensions/RawHtmlBlock'
import MediaEmbed from '../extensions/MediaEmbed'
import IframeNode from '../extensions/IframeNode'
import PdfEmbed from '../extensions/PdfEmbed'
import { DefinitionList, DefinitionItem, DefinitionTerm, DefinitionDescription } from '../extensions/DefinitionList'
import type { Translations } from '@src/types/translations'
import type { Extensions } from '@tiptap/core'
import { useSettings } from '@stores/SettingsStore'

export interface UseTiptapExtensionsParams {
  t: Translations
  livePreview?: boolean
  undoFnRef: React.MutableRefObject<() => void>
  redoFnRef: React.MutableRefObject<() => void>
}

export function useTiptapExtensions({ t, livePreview, undoFnRef, redoFnRef }: UseTiptapExtensionsParams): Extensions {
  const undoRedoExtension = useRef(createUndoRedoExtension(
    () => undoFnRef.current(),
    () => redoFnRef.current(),
  ))
  const { settings: appSettings } = useSettings()

  return useMemo(() => {
    return [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
      }),
      CodeBlockWithView.configure({ tabSize: appSettings.tabSize }),
      CodeBlockSmartIndent,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link' },
      }),
      ImageNode,
      Placeholder.configure({
        placeholder: t.editor.placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'tiptap-task-item' },
      }),
      Underline,
      HighlightMark,
      Typography.configure({
        emDash: false,
      }),
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: { class: 'markcraft-table' },
        },
      }),
      TableTabNavigation,
      ClearMarksOnEnter,
      InlineCodeHighlight,
      TaskListInputRule,
      LinkInputRule,
      MathInlineAutoConvert,
      MathInlineNode,
      MathBlock,
      MermaidBlock,
      PlantUmlBlock,
      TocNode,
      FootnoteReference,
      FootnoteInputRule,
      FootnoteTooltip,
      SubscriptMark,
      SuperscriptMark,
      WikiLink,
      BlockReference,
      EmbedContent,
      CalloutNode,
      CommentMark,
      AbbreviationMark,
      RawHtmlBlock,
      MediaEmbed,
      IframeNode,
      PdfEmbed,
      DefinitionList,
      DefinitionItem,
      DefinitionTerm,
      DefinitionDescription,
      MarkdownInlineInputRules,
      BlockInputRules.configure({ codeBlockDefaultLang: appSettings.codeBlockDefaultLang }),
      ImageInputRule,
      ListInputRules,
      SmartBackspace,
      SearchExtension,
      LintExtension,
      undoRedoExtension.current,
      UnifiedShortcuts,
      HeadingId,
      HeadingIdAssign,
      LivePreviewHeading,
      LivePreviewBlockquote,
      // Live Preview 始终注册，通过 enabled 选项控制初始状态
      // 运行时切换由 setLivePreviewEnabled command 处理
      LivePreviewExtension.configure({ enabled: !!livePreview }),
      TransitionExtension,
    ]
  }, [t, appSettings.codeBlockDefaultLang, appSettings.tabSize])
}
