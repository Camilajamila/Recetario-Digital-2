import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const app = express()
const port = Number(process.env.PORT) || 3001
const dataFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'recipes.json')

app.use(express.json({ limit: '1mb' }))

async function readRecipes() {
  const content = await readFile(dataFile, 'utf8')
  return JSON.parse(content)
}

let writeQueue = Promise.resolve()

function updateRecipes(mutator) {
  const operation = writeQueue.then(async () => {
    const recipes = await readRecipes()
    const result = mutator(recipes)
    if (result?.write !== false) {
      const temporaryFile = `${dataFile}.${randomUUID()}.tmp`
      await writeFile(temporaryFile, `${JSON.stringify(recipes, null, 2)}\n`, 'utf8')
      await rename(temporaryFile, dataFile)
    }
    return result?.value
  })
  writeQueue = operation.then(() => undefined, () => undefined)
  return operation
}

function validateRecipe(body) {
  const errors = []
  if (typeof body?.title !== 'string' || !body.title.trim() || body.title.length > 120) {
    errors.push('El título es obligatorio y debe tener como máximo 120 caracteres.')
  }
  if (typeof body?.description !== 'string' || body.description.length > 240) {
    errors.push('La descripción debe tener como máximo 240 caracteres.')
  }
  if (typeof body?.category !== 'string' || !['Desayuno', 'Almuerzo', 'Cena', 'Postres', 'Snacks'].includes(body.category)) {
    errors.push('Selecciona una categoría válida.')
  }
  if (!Number.isInteger(body?.prepMinutes) || body.prepMinutes < 1 || body.prepMinutes > 1440) {
    errors.push('El tiempo debe ser un número entre 1 y 1440 minutos.')
  }
  if (typeof body?.imageUrl !== 'string' || body.imageUrl.length > 2048 || (body.imageUrl && !/^https?:\/\//i.test(body.imageUrl))) {
    errors.push('La URL de imagen debe ser HTTP o HTTPS y tener como máximo 2048 caracteres.')
  }
  for (const field of ['ingredients', 'steps']) {
    if (!Array.isArray(body?.[field]) || body[field].length < 1 || body[field].length > 50
      || body[field].some((item) => typeof item !== 'string' || !item.trim() || item.length > 500)) {
      errors.push(`${field === 'ingredients' ? 'Los ingredientes' : 'Los pasos'} deben incluir entre 1 y 50 elementos válidos.`)
    }
  }
  return errors
}

function normalizeRecipe(body, existing = {}) {
  return {
    ...existing,
    title: body.title.trim(),
    description: body.description.trim(),
    category: body.category,
    prepMinutes: body.prepMinutes,
    imageUrl: body.imageUrl.trim(),
    ingredients: body.ingredients.map((item) => item.trim()),
    steps: body.steps.map((item) => item.trim()),
  }
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.get('/api/recipes', async (request, response, next) => {
  try {
    let recipes = await readRecipes()
    const query = String(request.query.search || '').trim().toLocaleLowerCase('es')
    const category = String(request.query.category || '')
    const ingredient = String(request.query.ingredient || '').trim().toLocaleLowerCase('es')
    if (query) {
      recipes = recipes.filter((recipe) => [recipe.title, recipe.description, ...recipe.ingredients]
        .some((value) => value.toLocaleLowerCase('es').includes(query)))
    }
    if (category && category !== 'Todas') recipes = recipes.filter((recipe) => recipe.category === category)
    if (ingredient) recipes = recipes.filter((recipe) => recipe.ingredients
      .some((value) => value.toLocaleLowerCase('es').includes(ingredient)))
    response.json(recipes)
  } catch (error) {
    next(error)
  }
})

app.get('/api/recipes/:id', async (request, response, next) => {
  try {
    const recipes = await readRecipes()
    const recipe = recipes.find((item) => item.id === request.params.id)
    if (!recipe) return response.status(404).json({ error: 'No encontramos esa receta.' })
    response.json(recipe)
  } catch (error) {
    next(error)
  }
})

app.post('/api/recipes', async (request, response, next) => {
  const errors = validateRecipe(request.body)
  if (errors.length) return response.status(400).json({ error: errors.join(' ') })
  try {
    const recipe = await updateRecipes((recipes) => {
      const created = { id: randomUUID(), ...normalizeRecipe(request.body), createdAt: new Date().toISOString() }
      recipes.unshift(created)
      return { value: created }
    })
    response.status(201).json(recipe)
  } catch (error) {
    next(error)
  }
})

app.put('/api/recipes/:id', async (request, response, next) => {
  const errors = validateRecipe(request.body)
  if (errors.length) return response.status(400).json({ error: errors.join(' ') })
  try {
    const recipe = await updateRecipes((recipes) => {
      const index = recipes.findIndex((item) => item.id === request.params.id)
      if (index === -1) return { write: false, value: null }
      recipes[index] = {
        ...normalizeRecipe(request.body, recipes[index]),
        updatedAt: new Date().toISOString(),
      }
      return { value: recipes[index] }
    })
    if (!recipe) return response.status(404).json({ error: 'No encontramos esa receta.' })
    response.json(recipe)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/recipes/:id', async (request, response, next) => {
  try {
    const deleted = await updateRecipes((recipes) => {
      const index = recipes.findIndex((item) => item.id === request.params.id)
      if (index === -1) return { write: false, value: false }
      recipes.splice(index, 1)
      return { value: true }
    })
    if (!deleted) return response.status(404).json({ error: 'No encontramos esa receta.' })
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'Ruta de API no encontrada.' }))

app.use((error, _request, response, _next) => {
  console.error(error)
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'El cuerpo de la solicitud no contiene JSON válido.' })
  }
  response.status(500).json({ error: 'Ocurrió un error interno. Inténtalo de nuevo.' })
})

await mkdir(dirname(dataFile), { recursive: true })
app.listen(port, () => console.log(`API del recetario lista en http://localhost:${port}`))
