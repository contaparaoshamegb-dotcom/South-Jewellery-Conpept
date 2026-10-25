import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = ["Anéis", "Colares", "Brincos", "Pulseiras", "Outros"];

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  material: string;
  image_url: string | null;
  featured: boolean;
  available: boolean;
};

export type Settings = { brand_name: string; whatsapp: string; tagline: string };

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Product[];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as Settings;
  },
});

export const imageSrc = (path: string | null) =>
  path ? `/api/public/img/${path.split("/").map(encodeURIComponent).join("/")}` : null;

export const formatPrice = (p: number | null) =>
  p == null ? "Sob consulta" : p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const whatsappLink = (number: string, productName?: string) => {
  const digits = number.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const text = productName
    ? `Olá! Tenho interesse na peça "${productName}" do catálogo.`
    : "Olá! Vi o catálogo e gostaria de mais informações.";
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
};
