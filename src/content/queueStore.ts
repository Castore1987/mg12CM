import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import type { GeneratedPost } from "../types.js";

const QUEUE_PATH = path.join(DATA_DIR, "queue.json");

export function loadQueue(): GeneratedPost[] {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  const raw = fs.readFileSync(QUEUE_PATH, "utf-8").trim();
  if (!raw) return [];
  return JSON.parse(raw) as GeneratedPost[];
}

export function saveQueue(queue: GeneratedPost[]): void {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export function enqueuePosts(posts: GeneratedPost[]): void {
  const queue = loadQueue();
  queue.push(...posts);
  saveQueue(queue);
}

export function updatePost(index: number, updates: Partial<GeneratedPost>): void {
  const queue = loadQueue();
  if (!queue[index]) throw new Error(`No existe el post en el indice ${index} de la cola.`);
  queue[index] = { ...queue[index], ...updates };
  saveQueue(queue);
}
