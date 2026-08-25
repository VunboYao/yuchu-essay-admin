import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  extra?: ReactNode
  children?: ReactNode
}

export default function PageHeader({ title, description, extra, children }: PageHeaderProps) {
  const actions = extra ?? children

  return (
    <header className={styles.root}>
      <div className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <div className={styles.description}>{description}</div> : null}
      </div>
      {actions ? <div className={styles.extra}>{actions}</div> : null}
    </header>
  )
}
