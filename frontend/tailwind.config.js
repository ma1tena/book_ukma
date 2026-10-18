/** Кольори й шрифти — з брендбука НаУКМА */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#062159", dark: "#03122E", mid: "#1D2D63" },
        blue: { DEFAULT: "#0D52BF", deep: "#0A3D8F", soft: "#9EBAE5" },
        mist: { DEFAULT: "#DEE8FF", 50: "#F7FAFF", 100: "#EBF2FF", 200: "#CFDBF2" },
        // slate-300 — лише для вимкнених елементів і декору; для тексту — slate-400 (5.5:1 на білому)
        slate: { DEFAULT: "#384D7A", 200: "#CCD4DE", 300: "#9CA6BD", 400: "#5E6883" },
        // Межі полів і вільних слотів: 3.5:1 на білому (WCAG 1.4.11 вимагає ≥ 3:1)
        line: "#7D88A3",
        // Другорядний текст у шапці (4.6:1)
        muted: "#71738B",
        amber: { DEFAULT: "#DE9945" },
        coral: { DEFAULT: "#DE5E3D" },
        // gold — лінії, рамки, іконки (3.2:1); gold-dark — текст і фон під білим текстом (4.9:1)
        gold: { DEFAULT: "#AD8B3A", dark: "#8A6D28" },
      },
      fontFamily: {
        // Proba Pro → Helvetica (Mac) → Arial (Windows), як у брендбуці
        sans: ['"Proba Pro"', "Helvetica", "Arial", "sans-serif"],
        // Orchidea Pro Semi Bold — для декоративних заголовків
        display: ['"Orchidea Pro"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
