import axios, { type AxiosInstance } from "axios";
import { config, requireInstagramCredentials } from "../config.js";

export interface PublishImagePostParams {
  imageUrl: string;
  caption: string;
}

export interface PublishResult {
  igMediaId: string;
  permalink?: string;
}

export interface MediaInsight {
  mediaId: string;
  timestamp: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saved: number;
  shares: number;
}

export interface CommentSummary {
  id: string;
  text: string;
  username: string;
  timestamp: string;
}

/**
 * Cliente minimo sobre la Instagram Graph API (via Meta Graph API).
 * Requiere una cuenta de Instagram Business/Creator vinculada a una Pagina
 * de Facebook, con un access token de larga duracion. Ver README para el
 * detalle de permisos y setup.
 *
 * Nota: la Graph API publica contenido a partir de una imagen/video ya
 * alojado en una URL publica (no sube archivos binarios directamente), por
 * eso `imageUrl` debe apuntar a un recurso accesible desde internet.
 */
export class InstagramGraphClient {
  private http: AxiosInstance;
  private businessAccountId: string;

  constructor() {
    const { accessToken, businessAccountId } = requireInstagramCredentials();
    this.businessAccountId = businessAccountId;
    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${config.ig.graphApiVersion}`,
      params: { access_token: accessToken },
    });
  }

  async publishImagePost({ imageUrl, caption }: PublishImagePostParams): Promise<PublishResult> {
    const containerRes = await this.http.post(`/${this.businessAccountId}/media`, null, {
      params: { image_url: imageUrl, caption },
    });
    const creationId = containerRes.data.id as string;

    const publishRes = await this.http.post(`/${this.businessAccountId}/media_publish`, null, {
      params: { creation_id: creationId },
    });
    const igMediaId = publishRes.data.id as string;

    const permalinkRes = await this.http
      .get(`/${igMediaId}`, { params: { fields: "permalink" } })
      .catch(() => null);

    return { igMediaId, permalink: permalinkRes?.data?.permalink };
  }

  async getMediaInsights(mediaId: string): Promise<MediaInsight> {
    const [mediaRes, insightsRes] = await Promise.all([
      this.http.get(`/${mediaId}`, {
        params: { fields: "timestamp,like_count,comments_count" },
      }),
      this.http.get(`/${mediaId}/insights`, {
        params: { metric: "reach,impressions,saved,shares" },
      }),
    ]);

    const metricsByName: Record<string, number> = {};
    for (const entry of insightsRes.data.data ?? []) {
      metricsByName[entry.name] = entry.values?.[0]?.value ?? 0;
    }

    return {
      mediaId,
      timestamp: mediaRes.data.timestamp,
      reach: metricsByName.reach ?? 0,
      impressions: metricsByName.impressions ?? 0,
      likes: mediaRes.data.like_count ?? 0,
      comments: mediaRes.data.comments_count ?? 0,
      saved: metricsByName.saved ?? 0,
      shares: metricsByName.shares ?? 0,
    };
  }

  async listRecentMedia(limit = 25): Promise<{ id: string; timestamp: string; caption?: string }[]> {
    const res = await this.http.get(`/${this.businessAccountId}/media`, {
      params: { fields: "id,timestamp,caption", limit },
    });
    return res.data.data ?? [];
  }

  async listComments(mediaId: string): Promise<CommentSummary[]> {
    const res = await this.http.get(`/${mediaId}/comments`, {
      params: { fields: "id,text,username,timestamp" },
    });
    return res.data.data ?? [];
  }

  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    const res = await this.http.post(`/${commentId}/replies`, null, {
      params: { message },
    });
    return res.data;
  }
}
