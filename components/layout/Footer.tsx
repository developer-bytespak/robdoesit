import Link from "next/link";
import { site, nav, bookCta } from "@/data/site";
import { liveSocials } from "@/data/socials";
import { Mic, LogoStack } from "./Logo";

/**
 * Build credit. Set in Manrope rather than the site's metadata mono so it
 * reads as a signature instead of competing with Rob's own footer labels.
 */
// function Credit() {
//   const { name, url } = site.developer;
//   const label = (
//     <>
//       <span className="text-steel-dk">Developed by </span>
//       <span className="font-medium text-ivory/80 transition-colors duration-300 group-hover/credit:text-gold">
//         {name}
//       </span>
//     </>
//   );

//   return (
//     <p className="font-sans text-[0.8125rem] leading-none tracking-[-0.005em]">
//       {url ? (
//         <a
//           href={url}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="group/credit inline-flex items-center gap-1.5"
//         >
//           {label}
//           <span
//             aria-hidden
//             className="translate-x-0 text-gold opacity-0 transition-all duration-300 group-hover/credit:translate-x-0.5 group-hover/credit:opacity-100"
//           >
//             ↗
//           </span>
//         </a>
//       ) : (
//         <span className="group/credit">{label}</span>
//       )}
//     </p>
//   );
// }

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-hairline bg-obsidian">
      <div className="mx-auto max-w-[1800px] px-5 pb-28 pt-20 sm:px-8 sm:pt-28 lg:pb-10">
        <div className="grid gap-14 lg:grid-cols-[1.25fr_1fr]">
          {/* oversized lockup */}
          <div>
            <span className="mb-6 block h-8 w-8 text-gold">
              <Mic />
            </span>
            <LogoStack className="text-[clamp(4rem,13vw,11rem)]" />
          </div>

          {/* columns */}
          <div className="grid gap-10 sm:grid-cols-3 lg:pt-6">
            <nav aria-label="Footer" className="space-y-4">
              <p className="mono text-steel-dk">PAGES</p>
              <ul className="space-y-3">
                {nav.slice(1).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-2 font-sans text-lg text-ivory/85 transition-colors hover:text-gold"
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className="translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-4">
              <p className="mono text-steel-dk">PLATFORMS</p>
              <ul className="space-y-3">
                {liveSocials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 font-sans text-lg text-ivory/85 transition-colors hover:text-gold"
                    >
                      {s.label}
                      <span
                        aria-hidden
                        className="translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                      >
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <p className="mono text-steel-dk">BOOKING</p>
              <Link
                href={bookCta.href}
                data-cursor="LET'S GO"
                className="group inline-flex items-center gap-3 border border-gold/45 px-6 py-4 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold hover:text-obsidian"
              >
                {bookCta.label}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              {site.contact.email && (
                <a
                  href={`mailto:${site.contact.email}`}
                  className="block font-sans text-ivory/70 transition-colors hover:text-gold"
                >
                  {site.contact.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="rule-gold mt-16 opacity-40" />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono text-steel-dk">{site.location}</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:order-last">
            {site.legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="mono text-steel-dk transition-colors hover:text-gold">
                {l.label}
              </Link>
            ))}
            <p className="mono text-steel-dk">
              © {year} {site.legal.entity}
            </p>
          </div>

          {/* <Credit /> */}
        </div>
      </div>
    </footer>
  );
}
