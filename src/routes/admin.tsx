import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, formatPrice, imageSrc, productsQuery, settingsQuery, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel — Catálogo de Jóias 3D" },
      { name: "description", content: "Gerencie as peças do catálogo." },
      { property: "og:title", content: "Painel — Catálogo de Jóias 3D" },
      { property: "og:description", content: "Gerencie as peças do catálogo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Status = "loading" | "out" | "notadmin" | "admin";

function AdminPage() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setStatus("out");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setStatus(roles?.some((r) => r.role === "admin") ? "admin" : "notadmin");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (status === "loading") return <Shell><p className="text-muted-foreground">Carregando…</p></Shell>;
  if (status === "out") return <Shell><AuthForm /></Shell>;
  if (status === "notadmin")
    return (
      <Shell>
        <p className="text-muted-foreground">Esta conta não tem acesso ao painel.</p>
        <Button variant="line" className="mt-6" onClick={() => supabase.auth.signOut()}>Sair</Button>
      </Shell>
    );
  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-3">Painel</p>
        {children}
      </div>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (mode === "up" && !res.data.session) toast.success("Confira seu e-mail para confirmar a conta.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="mb-6 text-4xl">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
      <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button variant="gold" size="lg" className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
        {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const remove = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    if (p.image_url) await supabase.storage.from("jewelry").remove([p.image_url]);
    qc.invalidateQueries({ queryKey: ["products"] });
    toast.success("Peça excluída");
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Painel</p>
          <h1 className="text-4xl">Suas peças</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/">Ver catálogo</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
          <Button variant="gold" onClick={() => setEditing({ category: "Anéis", available: true, featured: false })}><Plus /> Nova peça</Button>
        </div>
      </div>

      <SettingsForm />

      <div className="mt-10 divide-y border-y">
        {products.length === 0 && <p className="py-10 text-center text-muted-foreground">Nenhuma peça ainda. Clique em "Nova peça".</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 py-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden bg-card">
              {imageSrc(p.image_url) && <img src={imageSrc(p.image_url)!} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.category} · {formatPrice(p.price)}{!p.available && " · Esgotado"}{p.featured && " · Destaque"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Editar"><Pencil /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Excluir"><Trash2 /></Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-card">
          <DialogTitle className="font-display text-3xl font-normal">{editing?.id ? "Editar peça" : "Nova peça"}</DialogTitle>
          {editing && <ProductForm initial={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsForm() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [s, setS] = useState({ brand_name: "", whatsapp: "", tagline: "" });
  useEffect(() => { if (data) setS(data); }, [data]);

  const save = async () => {
    const { error } = await supabase.from("site_settings").update(s).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Informações salvas");
  };

  return (
    <div className="grid gap-4 border bg-card p-6 md:grid-cols-3">
      <div className="space-y-2"><Label>Nome da marca</Label><Input value={s.brand_name} onChange={(e) => setS({ ...s, brand_name: e.target.value })} /></div>
      <div className="space-y-2"><Label>WhatsApp (com DDD)</Label><Input placeholder="(11) 99999-9999" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></div>
      <div className="space-y-2"><Label>Frase de apresentação</Label><Input value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></div>
      <div className="md:col-span-3"><Button variant="line" size="sm" onClick={save}>Salvar informações</Button></div>
    </div>
  );
}

function ProductForm({ initial, onDone }: { initial: Partial<Product>; onDone: () => void }) {
  const [p, setP] = useState<Partial<Product>>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [priceText, setPriceText] = useState(initial.price != null ? String(initial.price) : "");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let image_url = p.image_url ?? null;
    if (file) {
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("jewelry").upload(path, file, { contentType: file.type });
      if (error) { setBusy(false); toast.error(error.message); return; }
      if (p.image_url) await supabase.storage.from("jewelry").remove([p.image_url]);
      image_url = path;
    }
    const price = priceText.trim() ? Number(priceText.replace(",", ".")) : null;
    const row = {
      name: p.name ?? "",
      description: p.description ?? "",
      category: p.category ?? "Anéis",
      material: p.material ?? "",
      price,
      image_url,
      featured: !!p.featured,
      available: p.available ?? true,
    };
    const { error } = p.id
      ? await supabase.from("products").update(row).eq("id", p.id)
      : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Peça salva");
    onDone();
  };

  const preview = file ? URL.createObjectURL(file) : imageSrc(p.image_url ?? null);

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label>Foto</Label>
        {preview && <img src={preview} alt="" className="aspect-square w-32 object-cover" />}
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-2"><Label>Nome</Label><Input required value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label>Preço (R$)</Label><Input inputMode="decimal" placeholder="Vazio = sob consulta" value={priceText} onChange={(e) => setPriceText(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>Material</Label><Input placeholder="Ex: Prata 925, resina banhada a ouro" value={p.material ?? ""} onChange={(e) => setP({ ...p, material: e.target.value })} /></div>
      <div className="space-y-2"><Label>Descrição</Label><Textarea rows={4} value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
      <div className="flex gap-8">
        <label className="flex items-center gap-2 text-sm"><Switch checked={p.available ?? true} onCheckedChange={(v) => setP({ ...p, available: v })} /> Disponível</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!p.featured} onCheckedChange={(v) => setP({ ...p, featured: v })} /> Destaque</label>
      </div>
      <Button variant="gold" size="lg" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar peça"}</Button>
    </form>
  );
}
