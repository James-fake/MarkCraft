import { Extension } from '@tiptap/core'

/**
 * TableTabNavigation — 表格内 Tab 键导航
 *
 * - 在表格单元格内按 Tab：移动到下一个单元格
 * - 在表格单元格内按 Shift+Tab：移动到上一个单元格
 * - 在表格最后一个单元格按 Tab：自动添加新行并移入
 * - 不在表格内时按 Tab：插入缩进空格
 */
const TableTabNavigation = Extension.create({
  name: 'tableTabNavigation',

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('tableCell') || editor.isActive('tableHeader')) {
          // 尝试移动到下一个单元格，若已在最后一个则新增一行
          if (!editor.commands.goToNextCell()) {
            editor.commands.addRowAfter()
            editor.commands.goToNextCell()
          }
          return true
        }
        // 不在表格内 — 插入缩进空格
        return editor.commands.insertContent('  ')
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('tableCell') || editor.isActive('tableHeader')) {
          return editor.commands.goToPreviousCell()
        }
        return false
      },
    }
  },
})

export default TableTabNavigation
