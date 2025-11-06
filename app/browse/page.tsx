import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Procházet Pohádky | Pohádková Platforma",
  description: "Prozkoumejte naši sbírku kouzelných pohádek. Objevte magické příběhy z celého světa, filtrujte podle štítků a najděte svou další oblíbenou pohádku.",
  keywords: ["procházet pohádky", "sbírka příběhů", "magické příběhy", "fantastické pohádky", "dětské příběhy"],
  openGraph: {
    title: "Procházet Pohádky | Pohádková Platforma",
    description: "Prozkoumejte naši sbírku kouzelných pohádek z celého světa.",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Procházet Pohádky | Pohádková Platforma",
    description: "Prozkoumejte naši sbírku kouzelných pohádek z celého světa.",
  },
};

import Link from "next/link";
import BrowseClient from "./Client";
import Hero from "../../components/Hero";

export default function BrowseStories() {
  return (
    <>
      <Hero
        title="Procházet Pohádky"
        subtitle="Objevujte kouzelné příběhy podle štítků a oblíbenosti."
        height="sm"
      />
      <BrowseClient />
    </>
  );
}