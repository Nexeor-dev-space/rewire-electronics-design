import Image from "next/image";
import Link from "next/link";

export function DealTile({ title, imageUrl, href }: { title: string; imageUrl: string | null; href: string }) {
  return (
    <article className="group/card relative flex h-full w-full flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.04] bg-plate">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, (max-width: 1536px) 22vw, 18vw"
            className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.04]"
            unoptimized
          />
        )}
      </div>
      <h3 className="mt-4 text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
        <Link href={href} className="after:absolute after:inset-0 after:content-['']">
          {title}
        </Link>
      </h3>
    </article>
  );
}
