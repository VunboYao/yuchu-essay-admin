export const MENU_GROUPS = [
  {
    title: '概览',
    items: [{ path: '/dashboard', title: '数据概览' }],
  },
  {
    title: '内容管理',
    items: [
      { path: '/articles', title: '作文专题' },
      { path: '/essays', title: '优秀作文' },
      { path: '/downloads', title: '下载资料' },
    ],
  },
  {
    title: '分类与标签',
    items: [
      { path: '/taxonomy', title: '教材分类' },
      { path: '/tags', title: '标签管理' },
    ],
  },
  {
    title: '运营配置',
    items: [
      { path: '/home-blocks', title: '首页入口' },
      { path: '/ad-slots', title: '广告位' },
      { path: '/official-accounts', title: '公众号导流' },
      { path: '/feedbacks', title: '意见反馈' },
    ],
  },
  {
    title: '系统',
    items: [{ path: '/operation-logs', title: '操作日志' }],
  },
] as const
