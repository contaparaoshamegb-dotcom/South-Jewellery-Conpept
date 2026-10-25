import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORIES,
  formatPrice,
  imageSrc,
  productsQuery,
  settingsQuery,
  whatsappLink,
  type Product,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo — Jóias impressas em 3D" },
      { name: "description", content: "Conheça nossas jóias autorais desenhadas e impressas em 3D. Peça pelo WhatsApp." },
      { property: "og:title", content: "Catálogo — Jóias impressas em 3D" },
      { property: "og:description", content: "Jóias autorais desenhadas e impressas em 3D. Peça pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [cat, setCat] = useState("Todas");
  const [open, setOpen] = useState<Product | null>(null);
  const brand = settings?.brand_name ?? "Ateliê 3D";
  const wa = settings?.whatsapp ?? "";

  const cats = useMemo(
    () => ["Todas", ...CATEGORIES.filter((c) => products.some((p) => p.category === c))],
    [products],
  );
  const list = cat === "Todas" ? products : products.filter((p) => p.category === cat);

  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-display text-2xl tracking-wide">{brand}</span>
        {wa && (
          <a href={whatsappLink(wa)} target="_blank" rel="noreferrer" className="eyebrow hover:opacity-80">
            Contato
          </a>
        )}
      </header>

      <section className="relative flex min-h-[88vh] items-end overflow-hidden md:items-center">
        <img src={hero} alt="Anel dourado impresso em 3D" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent md:bg-gradient-to-r" />
        <div className="relative max-w-xl px-6 pb-16 md:px-12 md:pb-0 fade-up">
          <p className="eyebrow mb-5">Design digital · Acabamento artesanal</p>
          <h1 className="text-5xl leading-[1.05] md:text-7xl">
            Jóias que nascem <em className="text-gold-gradient">camada por camada</em>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">{settings?.tagline}</p>
          <Button asChild variant="line" size="lg" className="mt-8">
            <a href="#colecao">Ver coleção</a>
          </Button>
        </div>
      </section>

      <section id="colecao" className="px-6 py-20 md:px-12">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3">Coleção</p>
            <h2 className="text-4xl md:text-5xl">Peças disponíveis</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors",
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="py-20 text-center font-display text-2xl text-muted-foreground">
            Novas peças em breve.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 md:gap-x-8">
            {list.map((p) => (
              <button key={p.id} onClick={() => setOpen(p)} className="group text-left">
                <div className="relative aspect-[4/5] overflow-hidden bg-card">
                  {imageSrc(p.image_url) && (
                    <img src={imageSrc(p.image_url)!} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                  {!p.available && (
                    <span className="absolute left-3 top-3 bg-background/80 px-2 py-1 text-[0.65rem] uppercase tracking-widest">Esgotado</span>
                  )}
                </div>
                <p className="mt-4 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{p.category}</p>
                <h3 className="mt-1 text-xl">{p.name}</h3>
                <p className="mt-1 text-sm text-primary">{formatPrice(p.price)}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t px-6 py-10 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground md:px-12">
        {brand} · Feito sob encomenda
      </footer>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden border-border bg-card p-0 md:grid md:grid-cols-2">
          {open && (
            <>
              <div className="aspect-square bg-muted md:aspect-auto">
                {imageSrc(open.image_url) && <img src={imageSrc(open.image_url)!} alt={open.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-col p-8">
                <p className="eyebrow">{open.category}</p>
                <DialogTitle className="mt-3 font-display text-4xl font-normal">{open.name}</DialogTitle>
                <p className="mt-2 text-lg text-primary">{formatPrice(open.price)}</p>
                {open.material && <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Material: {open.material}</p>}
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{open.description}</p>
                <div className="mt-auto pt-8">
                  {wa ? (
                    <Button asChild variant="gold" size="lg" className="w-full">
                      <a href={whatsappLink(wa, open.name)} target="_blank" rel="noreferrer">
                        <MessageCircle /> Pedir pelo WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">WhatsApp ainda não configurado.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
