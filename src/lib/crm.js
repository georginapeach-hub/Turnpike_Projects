import { createClient } from '@supabase/supabase-js';
import * as env from '$env/static/public';

const settings = { ...env };
export const shared = Boolean(settings.PUBLIC_SUPABASE_URL && settings.PUBLIC_SUPABASE_ANON_KEY);
export const client = shared ? createClient(settings.PUBLIC_SUPABASE_URL, settings.PUBLIC_SUPABASE_ANON_KEY) : null;

export async function readRecords(kind) {
  const { data, error } = await client.from('crm_records').select('payload').eq('kind', kind);
  if (error) throw error;
  return data.map(row => row.payload);
}

export async function writeRecord(kind, record) {
  const { error } = await client.from('crm_records').upsert({ kind, id: String(record.id), payload: record });
  if (error) throw error;
}

export async function uploadAsset(file) {
  if (!shared) throw new Error('File uploads require the shared CRM. You can save existing HTTPS links in demo mode.');
  const path = `${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await client.storage.from('marketing').upload(path, file);
  if (error) throw error;
  return { path, name: file.name };
}

export async function assetUrl(asset) {
  if (asset.url) return asset.url;
  const { data, error } = await client.storage.from('marketing').createSignedUrl(asset.path, 604800);
  if (error) throw error;
  return data.signedUrl;
}

export function httpsLink(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Use an HTTPS website or asset link.');
  return url.href;
}
