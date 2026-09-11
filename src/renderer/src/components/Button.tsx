import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export default function Button({ variant = 'primary', className = '', ...rest }: ButtonProps): JSX.Element {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')
  return <button className={classes} {...rest} />
}
