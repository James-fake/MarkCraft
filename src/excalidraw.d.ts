// 因 @excalidraw/excalidraw 安装过程中类型声明文件（.d.ts）不完整（残留 .DELETE 文件），
// 此处声明模块为 any，避免 tsc 报 TS7016。运行时 main.js 完整可用。
declare module '@excalidraw/excalidraw'
