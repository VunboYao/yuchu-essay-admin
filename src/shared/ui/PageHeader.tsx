import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  extra?: ReactNode
  /** 查询条件。传入后与标题组成「标题 + 筛选」模块；不传则只展示标题区 */
  children?: ReactNode
}

export default function PageHeader({ title, description, extra, children }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.top}>
        <div className={styles.main}>
          <h1 className={styles.title}>{title}</h1>
          {description ? <div className={styles.description}>{description}</div> : null}
        </div>
        {extra ? <div className={styles.extra}>{extra}</div> : null}
      </div>
      {children ? (
        <div className={styles.filters} role="search">
          {children}
        </div>
      ) : null}
    </header>
  )
}
