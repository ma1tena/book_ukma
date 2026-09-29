/* Обкладинка як на референсі: повна ширина, фото, центрований білий заголовок і кнопка з рамкою.
   Фото: покладіть свій кадр КМЦ у public/images/hero.jpg — до того буде фірмовий градієнт. */
export default function Hero() {
  return (
    <section className="relative h-[380px] w-full overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-blue-deep md:h-[520px]">
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover"
           onError={(e) => (e.currentTarget.style.display = "none")} />
      <div className="absolute inset-0 bg-navy/40" />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="text-3xl font-bold drop-shadow md:text-6xl">Культурно-мистецький центр НаУКМА</h1>
        <p className="mt-4 font-display text-xl font-semibold md:text-2xl">Онлайн-бронювання приміщень</p>
        <a href="#booking"
           className="mt-8 border-2 border-white px-10 py-3 text-lg font-semibold transition hover:bg-white hover:text-navy">
          Забронювати
        </a>
      </div>
    </section>
  );
}
