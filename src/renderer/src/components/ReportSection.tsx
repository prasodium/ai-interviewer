import type { ReactNode } from 'react'

interface ReportSectionProps {
  title: string
  items?: string[]
  children?: ReactNode
}

export default function ReportSection({ title, items, children }: ReportSectionProps): JSX.Element | null {
  if ((!items || items.length === 0) && !children) {
    return null
  }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items && (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}
