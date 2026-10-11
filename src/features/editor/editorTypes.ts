/**
 * 编辑器两模式（源码 CM6 / 所见即所得 Tiptap）共用的 UI 类型。
 *
 * 原先 WordCountMode 同时散落在 useEditorState（旧源码编辑器，已删除）与
 * useCM6Stats 中；此处作为单一来源，避免重复定义与跨引擎的类型耦合。
 */

/** 字数统计显示模式（两模式状态栏共用） */
export type WordCountMode = 'text' | 'standard'
