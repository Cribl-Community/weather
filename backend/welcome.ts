/**
 * Invoked from the app UI to return the Cribl Apps welcome message.
 */
export async function onRequest(_request: Request, _context: { appId: string }): Promise<Response> {
  const message = 'Welcome to cribl Apps';
  console.log('[welcome] running', { message, at: new Date().toISOString() });
  return new Response(JSON.stringify({ message }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
