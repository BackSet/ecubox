/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                ecubox: {
                    yellow: '#FFDB00', // IKEA Yellow
                    blue: '#0058A3',   // IKEA Blue
                    red: '#DA291C',
                    'yellow-dark': '#E5C500',
                    'blue-dark': '#004F92',
                    'red-dark': '#C01B12',
                    'yellow-light': '#FFF9D6',
                    'blue-light': '#F0F7FF',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
