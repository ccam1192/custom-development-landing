import { ArrowRight } from 'lucide-react'
import { STRIPE_CHECKOUT_URL } from '../config'

type Variant = 'primary' | 'card' | 'light'

const variantClass: Record<Variant, string> = {
  primary:
    'px-6 py-3.5 rounded-lg bg-primary text-white font-medium shadow-lg shadow-primary/25 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30',
  card:
    'w-full px-6 py-4 rounded-xl bg-primary text-white font-semibold text-lg shadow-lg shadow-primary/25 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30',
  light:
    'px-8 py-4 rounded-xl bg-white text-primary font-semibold text-lg hover:bg-gray-50 shadow-xl',
}

interface CheckoutButtonProps {
  variant?: Variant
  className?: string
}

export default function CheckoutButton({ variant = 'primary', className = '' }: CheckoutButtonProps) {
  return (
    <a
      href={STRIPE_CHECKOUT_URL}
      className={`inline-flex items-center justify-center gap-2 transition-all ${variantClass[variant]} ${className}`}
    >
      Get Started — $500
      <ArrowRight size={variant === 'primary' ? 18 : 20} />
    </a>
  )
}
