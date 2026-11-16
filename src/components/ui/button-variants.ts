import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-input font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-blue text-white hover:bg-navy',
        secondary: 'border border-line bg-paper text-navy hover:border-blue hover:text-blue',
        tertiary: 'text-blue hover:bg-blue-100',
        destructive: 'bg-red text-white hover:bg-red/90',
        inverse: 'bg-white text-navy hover:bg-sky',
        ghostInverse: 'border border-white/30 text-white hover:bg-white/10',
      },
      size: {
        sm: 'h-8 px-3 text-caption',
        md: 'h-10 px-4 text-body',
        lg: 'h-12 px-6 text-body-lg',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
