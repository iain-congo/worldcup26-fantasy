import { Redis } from '@upstash/redis'

let _kv
export function getKV() {
  if (!_kv) {
    _kv = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
  return _kv
}
