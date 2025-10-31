import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Fairy Tales | Fairy Tale Platform",
  description: "Explore our collection of enchanting fairy tales. Discover magical stories from around the world, filter by tags, and find your next favorite tale.",
  keywords: ["browse fairy tales", "story collection", "magical stories", "fantasy tales", "children stories"],
  openGraph: {
    title: "Browse Fairy Tales | Fairy Tale Platform",
    description: "Explore our collection of enchanting fairy tales from around the world.",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Browse Fairy Tales | Fairy Tale Platform",
    description: "Explore our collection of enchanting fairy tales from around the world.",
  },
};

import Link from "next/link";
import BrowseClient from "./Client";

export default function BrowseStories() {
  return <BrowseClient />;
}