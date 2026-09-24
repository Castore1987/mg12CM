import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import type { InquiryLog, PostMetric } from "../types.js";

const METRICS_PATH = path.join(DATA_DIR, "metrics.json");
const INQUIRIES_PATH = path.join(DATA_DIR, "inquiries.json");

function readJsonArray<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];
  return JSON.parse(raw) as T[];
}

function writeJsonArray<T>(filePath: string, data: T[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadMetrics(): PostMetric[] {
  return readJsonArray<PostMetric>(METRICS_PATH);
}

export function saveMetrics(metrics: PostMetric[]): void {
  writeJsonArray(METRICS_PATH, metrics);
}

export function addMetric(metric: PostMetric): void {
  const metrics = loadMetrics();
  const idx = metrics.findIndex((m) => m.postId === metric.postId);
  if (idx >= 0) metrics[idx] = metric;
  else metrics.push(metric);
  saveMetrics(metrics);
}

export function loadInquiries(): InquiryLog[] {
  return readJsonArray<InquiryLog>(INQUIRIES_PATH);
}

export function saveInquiries(inquiries: InquiryLog[]): void {
  writeJsonArray(INQUIRIES_PATH, inquiries);
}

export function logInquiry(productId: string | null): void {
  const inquiries = loadInquiries();
  const existing = inquiries.find((i) => i.productId === productId);
  if (existing) existing.count += 1;
  else inquiries.push({ productId, count: 1 });
  saveInquiries(inquiries);
}
