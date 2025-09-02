import { PORTAL_HTML } from './html.js'
import { handleAggregate } from './handlers/aggregate.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/api/search') {
      return handleAggregate(request, env)
    }

    // serve static
    return new Response(PORTAL_HTML, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
