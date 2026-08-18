import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="corkboard px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block font-mono-tag text-xs tracking-[0.3em] text-paper/80 bg-ink/30 px-3 py-1 rounded-full mb-6">
            NOW LIVE ON YOUR CAMPUS
          </span>
          <h1 className="font-display text-paper text-5xl md:text-7xl leading-[0.95] drop-shadow-lg">
            Lost something?
            <br />
            <span className="text-highlight">Let AI</span> help you find it.
          </h1>
          <p className="text-paper/85 mt-6 max-w-xl mx-auto text-base md:text-lg">
            Report it, and CampusFind compares descriptions, colors, brands, and
            locations against everything turned in — then tells you, honestly,
            how confident it is.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/lost/new"
              className="flyer inline-flex items-center justify-center px-6 py-4 font-display text-lg text-pin-red hover:text-highlight transition-colors"
            >
              Report Lost Item
            </Link>
            <Link
              href="/found/new"
              className="flyer inline-flex items-center justify-center px-6 py-4 font-display text-lg text-pin-green hover:text-highlight transition-colors"
            >
              Report Found Item
            </Link>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center text-sm">
            <Link href="/lost" className="text-paper/80 underline underline-offset-4 hover:text-highlight">
              Browse Lost Items
            </Link>
            <Link href="/found" className="text-paper/80 underline underline-offset-4 hover:text-highlight">
              Browse Found Items
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        {[
          {
            step: "01",
            title: "Report it",
            body: "Describe what happened — category, color, brand, where and when. Add a photo if you have one.",
          },
          {
            step: "02",
            title: "AI compares",
            body: "Every new report is checked against active listings for matching text, category, color, brand, location, and timing.",
          },
          {
            step: "03",
            title: "You verify, together",
            body: "Matches are suggestions, never verdicts. Owners and finders confirm ownership before anything is handed over.",
          },
        ].map((s) => (
          <div key={s.step} className="border-t-4 border-pin-red pt-4">
            <span className="font-mono-tag text-xs text-ink/40">{s.step}</span>
            <h3 className="font-display text-xl mt-1 mb-2">{s.title}</h3>
            <p className="text-sm text-ink/70">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-ink text-paper px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl mb-4">
            Own words the AI will actually use
          </h2>
          <p className="font-mono-tag text-sm text-paper/70 max-w-2xl mx-auto">
            &ldquo;This item appears to be a possible match with 92% confidence — never
            &lsquo;this definitely belongs to you.&rsquo; Final ownership is always decided
            by people, not the model.&rdquo;
          </p>
        </div>
      </section>
    </div>
  );
}
