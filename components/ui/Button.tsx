import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'rounded-md px-4 py-2 font-medium'
  const v = variant === 'primary' ? 'bg-teal-400 text-white hover:opacity-95' : 'bg-transparent border'
  return <button className={`${base} ${v} ${className}`} {...rest} />
}
