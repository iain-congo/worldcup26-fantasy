// Morning cron — same logic as daily.js, separate path so Vercel
// registers both schedules (Hobby plan won't run two crons on the same path)
export { default, config } from './daily.js'
