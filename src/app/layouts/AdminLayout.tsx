import { Layout, Menu, Typography, App, Popconfirm, Button } from 'antd'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { MENU_GROUPS } from '@/app/layouts/menu'
import styles from './AdminLayout.module.css'
import { useAuthStore } from '@/features/auth/auth-store'

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
  const role = useAuthStore((state) => state.adminInfo?.role)
  const username = useAuthStore((state) => state.adminInfo?.username)
  const logout = useAuthStore((state) => state.clear)
  const { message } = App.useApp()

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

  const onLogout = () => {
    logout({ skipRedirect: true })
    message.success('退出登录成功')
  }

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
          <div className={styles.user}>
            {username}[{role}]
            <Popconfirm
              title="退出登录"
              description="确定要退出登录吗？"
              onConfirm={onLogout}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" style={{ marginLeft: 10 }}>
                退出登录
              </Button>
            </Popconfirm>
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
