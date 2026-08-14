import { Layout, Menu, Typography } from 'antd'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { MENU_GROUPS } from '@/app/layouts/menu'
import styles from './AdminLayout.module.css'

const { Header, Sider, Content } = Layout

function pageTitle(matches: ReturnType<typeof useMatches>) {
  let title = ''
  for (const match of matches) {
    const handle = match.handle as { title?: string } | undefined
    if (handle?.title) title = handle.title
  }
  return title
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  // 获取页面标题: 从路由元信息中获取, 而不是从menu.ts中获取
  const title = pageTitle(useMatches())
  const today = new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const menuItems = MENU_GROUPS.map((group) => ({
    type: 'group' as const,
    key: group.title,
    label: group.title,
    children: group.items.map((item) => ({
      key: item.path,
      label: item.title,
    })),
  }))

  return (
    <Layout className={styles.root}>
      {/* 左侧菜单 */}
      <Sider width={240} theme="dark">
        <div className={styles.logo}>
          <span className={styles.logoTitle}>作文小程序</span>
          <span className={styles.logoSub}>内容运营后台</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerMeta}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {title}
            </Typography.Title>
            <span className={styles.headerDate}>{today}</span>
          </div>
          <span className={styles.user}>管理员</span>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
