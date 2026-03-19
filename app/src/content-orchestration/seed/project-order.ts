// src/content-orchestration/seed/project-order.ts
import { seededShuffle } from './index';

export type Keyed = { key: string };

const FIXED_ORDER = ['agentic-tools', 'kirkland', 'dynamic', 'game'] as const;

export function orderProjectsTopTwoSeeded<T extends Keyed>(
  projects: readonly T[],
  seed: number,
): T[] {
  const byKey = new Map(projects.map(p => [p.key, p] as const));

  const top = FIXED_ORDER.map(k => byKey.get(k)).filter(Boolean) as T[];

  const topSet = new Set(FIXED_ORDER as readonly string[]);
  const rest = projects.filter(p => !topSet.has(p.key));
  const restShuffled = seededShuffle(rest, seed);

  return [...top, ...restShuffled];
}
