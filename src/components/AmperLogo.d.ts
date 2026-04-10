import * as React from 'react'

export interface AmperLogoProps {
  variant?: 'dark' | 'light' | 'gold' | 'teal' | 'icon' | 'arabic'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  width?: number
  className?: string
  style?: React.CSSProperties
}

declare const AmperLogo: React.FC<AmperLogoProps>
export default AmperLogo

export const AmperIcon: React.FC<{ size?: number; colors?: any }>
export const AmperLogoFull: React.FC<{ colors: any; width?: number; showTagline?: boolean }>
export const AmperLogoArabic: React.FC<{ colors: any; width?: number }>
export const VARIANTS: Record<string, any>
export const SIZES: Record<string, any>
