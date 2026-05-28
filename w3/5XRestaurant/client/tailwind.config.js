import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"*.{js,ts,jsx,tsx,mdx}",
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				'highlight-300': '#9e2ca8',
				'highlight-200': '#952268',
				'highlight-100': '#c06c84',
				'primary-200': '#ffd700',
				'primary-100': '#F1C40F',
				'primary-50': '#ffe680',
				'primary-orange': '#e67e22',
				'primary-red': '#e74c3c',
				'base-100': '#1C1C1C',
				price: {
					DEFAULT: '#E60023',
					light: '#FF4D6D',
					dark: '#B3001A'
				},
				success: {
					DEFAULT: '#16A34A',
					light: '#4ADE80',
					dark: '#166534'
				},
				warning: {
					DEFAULT: '#F59E0B',
					light: '#FCD34D',
					dark: '#B45309'
				},
				error: {
					DEFAULT: '#DC2626',
					light: '#F87171',
					dark: '#991B1B'
				},
				background: 'hsl(var(--background))',
				baseColor: 'hsl(var(--base-color))',
				highlight: 'hsl(var(--highlight))',
				highlight_2: 'hsl(var(--highlight-2))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				gradient: {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				gradient: 'gradient 8s ease infinite',
			}
		}
	},
	plugins: [tailwindcssAnimate, function ({ addBase, theme }) {
		addBase({
			':root': {
				'--primary-50': theme('colors.primary-50'),
				'--primary-100': theme('colors.primary-100'),
				'--primary-200': theme('colors.primary-200'),
				'--primary-orange': theme('colors.primary-orange'),
				'--primary-red': theme('colors.primary-red'),
			},
		});
	},],
}