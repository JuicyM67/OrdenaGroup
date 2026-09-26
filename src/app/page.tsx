import { brand } from "@/config/brand";

export default function Home() {
  return (
    <main>
      <h1 className="font-display">{brand.name}</h1>
      <p>{brand.tagline}</p>
    </main>
  );
}
