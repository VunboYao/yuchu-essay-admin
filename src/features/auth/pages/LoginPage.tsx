import { Controller, useForm } from 'react-hook-form'
import type { LoginSchemaInput, LoginSchemaOutput } from '../schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../schemas'
import { Form, Input, Button } from 'antd'
import styles from './LoginPage.module.css'

export function Component() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaInput, unknown, LoginSchemaOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })
  const onSubmit = async (data: LoginSchemaOutput) => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    console.log(data)
  }

  const isProd = import.meta.env.PROD
  const loginTip = isProd ? '生产环境请使用已设置的管理员密码' : '开发环境默认账号 admin / admin123'
  return (
    <div className={styles.loginPage}>
      <div className={styles.loginPageTitle}>
        <h2>欢迎回来</h2>
        <p>登录以继续管理内容</p>
      </div>
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} disabled={isSubmitting}>
        <Form.Item
          label="用户名"
          required
          validateStatus={errors.username ? 'error' : ''}
          help={errors.username?.message}
        >
          <Controller
            control={control}
            name="username"
            render={({ field }) => <Input {...field} />}
          />
        </Form.Item>
        <Form.Item
          label="密码"
          required
          validateStatus={errors.password ? 'error' : ''}
          help={errors.password?.message}
        >
          <Controller
            control={control}
            name="password"
            render={({ field }) => <Input.Password {...field} />}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isSubmitting}>
            进入后台
          </Button>
        </Form.Item>
      </Form>
      <p className={styles.loginTip}>{loginTip}</p>
    </div>
  )
}
