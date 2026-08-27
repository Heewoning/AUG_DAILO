export default {
  async fetch(request, env) {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request)
    }
    return new Response('DAILO assets are unavailable.', { status: 503 })
  },
}
