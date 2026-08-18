import Link from "next/link";

type FlyerCardProps = {
  href: string;
  kind: "lost" | "found";
  title: string;
  location: string;
  date: string;
  summary?: string;
  image?: string | null;
  rewardAmount?: number;
  matchCount?: number;
  matchScore?: number;
};

export default function FlyerCard({
  href,
  kind,
  title,
  location,
  date,
  summary,
  image,
  rewardAmount,
  matchCount,
  matchScore,
}: FlyerCardProps) {
  const accent = kind === "lost" ? "text-pin-red" : "text-pin-green";
  const dateStr = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={href} className="block group">
      <article className="flyer p-4 pt-6 transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[0.3deg]">
        <div className={`text-[11px] font-mono-tag font-semibold tracking-widest ${accent}`}>
          {kind === "lost" ? "LOST" : "FOUND"}
        </div>
        <h3 className="font-display text-xl leading-tight mt-1 mb-2 truncate">{title}</h3>

        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="w-full h-32 object-cover rounded-sm mb-3 border border-ink/10"
          />
        )}

        {summary && <p className="text-sm text-ink/70 line-clamp-2 mb-3">{summary}</p>}

        <dl className="text-xs font-mono-tag text-ink/70 space-y-0.5">
          <div>
            <dt className="inline text-ink/50">
              {kind === "lost" ? "Last seen: " : "Found near: "}
            </dt>
            <dd className="inline">{location}</dd>
          </div>
          <div>
            <dt className="inline text-ink/50">Date: </dt>
            <dd className="inline">{dateStr}</dd>
          </div>
        </dl>

        <div className="tear-strip mt-4 pt-3 flex items-center justify-between">
          {kind === "lost" && rewardAmount ? (
            <span className="tear-tab text-[10px] font-mono-tag bg-highlight text-ink px-1.5 py-1 rounded-sm">
              ₹{rewardAmount}
            </span>
          ) : (
            <span />
          )}

          {typeof matchScore === "number" ? (
            <span className="text-xs font-mono-tag font-semibold text-pin-green">
              {matchScore}% match
            </span>
          ) : typeof matchCount === "number" && matchCount > 0 ? (
            <span className="text-xs font-mono-tag font-semibold text-pin-green">
              {matchCount} possible match{matchCount > 1 ? "es" : ""}
            </span>
          ) : (
            <span className="text-xs font-mono-tag text-ink/40">View details →</span>
          )}
        </div>
      </article>
    </Link>
  );
}
