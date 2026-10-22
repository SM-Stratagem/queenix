/**
 * Server-side data access for the public site (SSR via convex/nextjs).
 * Inside docker the browser URL (LAN IP) isn't the best route; the server
 * talks to the backend directly when CONVEX_SELF_HOSTED_URL is set.
 */
import 'server-only';
import { cache } from 'react';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { api } from '@queenix/convex';

const url = () => process.env.CONVEX_SELF_HOSTED_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

export function q<F extends FunctionReference<'query'>>(fn: F, args: FunctionArgs<F>): Promise<FunctionReturnType<F>> {
  return fetchQuery(fn, args, { url: url() });
}

export function m<F extends FunctionReference<'mutation'>>(fn: F, args: FunctionArgs<F>): Promise<FunctionReturnType<F>> {
  return fetchMutation(fn, args, { url: url() });
}

export const site = api.queries.site;

/** Section copy, deduped per request (layout + metadata + page all read it). */
export const getSections = cache(() => q(site.getSections, {}));

/** Current time rounded to the minute (stable query args, fewer cache misses). */
export const nowMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

export type Sections = FunctionReturnType<typeof api.queries.site.getSections>;
export type ClassItem = FunctionReturnType<typeof api.queries.site.listSchedule>[number];
export type Plan = FunctionReturnType<typeof api.queries.site.listPlans>[number];
export type Trainer = FunctionReturnType<typeof api.queries.site.listTrainers>[number];
export type PostCard = FunctionReturnType<typeof api.queries.site.listPosts>[number];
export type Media = FunctionReturnType<typeof api.queries.site.listMedia>[number];

export const SITE_URL = (process.env.SITE_URL ?? process.env.AUTH_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
