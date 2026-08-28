import type {
  DiffBlockLabels,
  JsonTreeLabels,
  MarkdownLabels,
  ReadBlockLabels,
  SearchBlockLabels,
  TerminalBlockLabels,
  WebBlockLabels,
} from '@deepseek-ai/dsh-client-ui-primitives';

export const markdownLabels: MarkdownLabels = {
  code: { copyLabel: '复制', copiedLabel: '已复制' },
  footnotes: '脚注',
};

const foldLabels = {
  copy: '复制',
  copied: '已复制',
  collapseAria: '收起完整内容',
  expandAria: (hidden: number) => `展开另外 ${hidden} 行`,
  collapse: '收起',
  expand: (hidden: number) => `展开 ${hidden} 行`,
};

export const readBlockLabels: ReadBlockLabels = {
  ...foldLabels,
  window: (shown, total) => `显示 ${shown} / 共 ${total} 行`,
};

export const terminalBlockLabels: TerminalBlockLabels = {
  ...foldLabels,
  signal: signal => `信号 ${signal}`,
  exitCode: exitCode => `退出码 ${exitCode}`,
  running: '运行中',
  failed: '失败',
  done: '完成',
  noOutput: '没有输出',
};

export const diffBlockLabels: DiffBlockLabels = {
  ...foldLabels,
  files: count => `${count} 个文件`,
};

export const searchBlockLabels: SearchBlockLabels = {
  ...foldLabels,
  pathsSummary: (shown, total, truncated) => truncated ? `显示 ${shown} / 共 ${total} 个路径` : `${total} 个路径`,
  matchesSummary: (shown, total, files, truncated) => truncated ? `显示 ${shown} / 共 ${total} 条匹配，${files} 个文件` : `${total} 条匹配，${files} 个文件`,
  noResults: '没有结果',
};

export const webBlockLabels: WebBlockLabels = {
  noResults: '没有结果',
  sourcesTruncated: '来源列表已截断',
  http: 'HTTP',
  contentTruncated: '内容已截断',
  markdown: markdownLabels,
};

export const jsonTreeLabels: JsonTreeLabels = {
  copyValue: '复制值',
  copyJson: '复制 JSON',
  copyPath: '复制路径',
  copyPrettyJson: '复制格式化 JSON',
  copyCompactJson: '复制紧凑 JSON',
  copied: '已复制',
  copyFailed: '复制失败',
  collapseNode: '收起节点',
  expandNode: '展开节点',
  copyButtonTitle: action => action,
};

export const truncatedJsonLabel = (total: number): string => `内容过长，已截断（共 ${total} 个字符）`;
