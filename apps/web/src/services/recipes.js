async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`/api/recipes${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('No pudimos conectar con el servidor. Comprueba que la API esté iniciada.')
  }

  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'Ocurrió un error al procesar la solicitud.')
  }

  return data
}

export const recipesApi = {
  list: () => request(''),
  create: (recipe) => request('', { method: 'POST', body: JSON.stringify(recipe) }),
  update: (id, recipe) => request(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(recipe),
  }),
  remove: (id) => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
