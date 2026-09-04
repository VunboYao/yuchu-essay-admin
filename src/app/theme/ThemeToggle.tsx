import { Switch } from 'antd'
import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { mode, toggle } = useTheme()

  return (
    <Switch
      checked={mode === 'dark'}
      onChange={toggle}
      checkedChildren="🌙"
      unCheckedChildren="☀️"
      title={mode === 'dark' ? '切换为浅色' : '切换为暗色'}
    />
  )
}
