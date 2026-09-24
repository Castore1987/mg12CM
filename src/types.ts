export interface ProductFaq {
  q: string;
  a: string;
}

export interface PriceTiers {
  wholesale: number;
  retail: number;
  wholesaleOver50: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sports: string[];
  tagline: string;
  description: string;
  keyFeatures: string[];
  benefits: string[];
  idealFor: string;
  usage: string;
  size: string;
  currency: string;
  price: PriceTiers;
  url: string;
  images: string[];
  faqs: ProductFaq[];
  status: string;
}

export interface ContactChannels {
  whatsapp: string;
  email: string;
  instagramHandle: string;
  city: string;
}

export interface ProductCatalog {
  brand: string;
  updatedAt: string;
  currency: string;
  wholesaleMinOrder: number;
  contact: ContactChannels;
  products: Product[];
}

export interface ProductSuggestion {
  id: string;
  name: string;
  rationale: string;
  sports: string[];
}

export interface RealPostExample {
  shortcode: string;
  producto: string;
  caption: string;
}

export interface BrandVoice {
  brand: string;
  mission: string;
  toneDescriptors: string[];
  voiceDo: string[];
  voiceDont: string[];
  emojiStyle: string;
  baseHashtags: string[];
  hashtagsBySport: Record<string, string[]>;
  ctaStyle: string[];
  realPostExamples?: RealPostExample[];
}

export type ContentPillar =
  | "product_spotlight"
  | "tip_tutorial"
  | "testimonial_social_proof"
  | "engagement_question"
  | "behind_the_scenes"
  | "ugc_repost";

export interface PostBrief {
  date: string;
  pillar: ContentPillar;
  productId: string | null;
  sport: string | null;
  briefNotes: string;
}

export interface GeneratedPost extends PostBrief {
  caption: string;
  hashtags: string[];
  visualBrief: string;
  reelScript: string;
  status: "draft" | "approved" | "published";
  scheduledFor: string | null;
  publishedAt: string | null;
  igMediaId: string | null;
}

export interface PostMetric {
  postId: string;
  publishedAt: string;
  pillar: ContentPillar;
  productId: string | null;
  sport: string | null;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

export interface InquiryLog {
  productId: string | null;
  count: number;
}

export interface BestTimeSlot {
  weekday: number; // 0 = domingo ... 6 = sabado
  hourBlockStart: number; // 0-23
  hourBlockEnd: number;
  avgEngagementRate: number;
  sampleSize: number;
  source: "historico" | "default_industria";
}

export interface AdSuggestion {
  type: "boost_post" | "targeted_awareness" | "underperforming_content" | "high_demand_product";
  title: string;
  rationale: string;
  relatedPostId?: string;
  relatedProductId?: string;
  suggestedAudience?: string;
  suggestedBudgetHint?: string;
  priority: "alta" | "media" | "baja";
}

export type GrowthGoal = "seguidores" | "engagement" | "ventas" | "contenido";

export interface GrowthTactic {
  id: string;
  type: "sorteo" | "promocion" | "colaboracion" | "referido" | "desafio_ugc" | "contenido";
  title: string;
  description: string;
  requirements: string;
  effort: "bajo" | "medio" | "alto";
  cost: "bajo" | "medio" | "alto";
  goals: GrowthGoal[];
}
