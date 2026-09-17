// L1 core/tags —— Markdown #标签抽取（纯函数，无 UI / 无状态）。
//
// Phase 2（2026-09-17）自 features/tags/tagExtractor.ts **原样下沉**
// （仅改目录，内容未作任何改写）：
// stores/TagIndexStore 需要标签抽取，而它原寄居业务模块 → 状态层反向引用业务层。
// 下沉后 features/tags 目录随之清空删除。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 2.4。
// 标签正则：匹配 #标签名，支持中文、英文、数字、斜杠（嵌套）
// 不匹配标题 # 和颜色码 #fff 等
// 标签名可以以英文字母或中文字符开头
const TAG_REGEX = /(?:^|\s)#([a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5\/]*)/g;

/**
 * 从 Markdown 内容中提取所有 #标签，支持嵌套标签 #父/子。
 * 要求 # 前面是行首或空白，且标签名以字母或中文开头（避开颜色码 #fff 等）。
 */
export function extractTags(content: string): string[] {
  const tags: Set<string> = new Set();
  let match: RegExpExecArray | null;
  while ((match = TAG_REGEX.exec(content)) !== null) {
    const tag = match[1];
    if (tag && tag.length > 0) {
      // 去除尾部斜杠，规范化标签路径（#项目/ 视为 #项目）
      const cleaned = tag.replace(/\/+$/, '');
      if (cleaned.length > 0) {
        tags.add(cleaned);
      }
    }
  }
  return Array.from(tags);
}

/** 嵌套标签树节点 */
export interface TagNode {
  /** 标签名（不含路径前缀） */
  name: string;
  /** 完整路径如 "项目/前端" */
  fullPath: string;
  /** 直接关联的文件数 */
  count: number;
  /** 子标签节点 */
  children: Map<string, TagNode>;
}

/**
 * 构建嵌套标签树结构。
 * @param tags tagName -> Set<fileId> 映射
 * @returns 根节点（root.name 为空字符串，root.children 为顶层标签）
 */
export function buildTagTree(tags: Map<string, Set<string>>): TagNode {
  const root: TagNode = {
    name: '',
    fullPath: '',
    count: 0,
    children: new Map<string, TagNode>(),
  };

  for (const [fullPath, fileIds] of tags) {
    const parts = fullPath.split('/');
    let currentNode = root;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      let child = currentNode.children.get(part);
      if (!child) {
        child = {
          name: part,
          fullPath: accumulatedPath,
          count: 0,
          children: new Map<string, TagNode>(),
        };
        currentNode.children.set(part, child);
      }
      currentNode = child;

      // 叶子节点：记录直接关联的文件数
      if (i === parts.length - 1) {
        currentNode.count = fileIds.size;
      }
    }
  }

  return root;
}
