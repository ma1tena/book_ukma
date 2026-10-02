/** Кольори й шрифти — з брендбука НаУКМА */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#062159", dark: "#03122E", mid: "#1D2D63" },
        blue: { DEFAULT: "#0D52BF", deep: "#0A3D8F", soft: "#9EBAE5" },
        mist: { DEFAULT: "#DEE8FF", 50: "#F7FAFF", 100: "#EBF2FF", 200: "#CFDBF2" },
        slate: { DEFAULT: "#384D7A", 200: "#CCD4DE", 300: "#9CA6BD" },
        amber: { DEFAULT: "#DE9945" },
        coral: { DEFAULT: "#DE5E3D" },
        gold: { DEFAULT: "#AD8B3A" },
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
