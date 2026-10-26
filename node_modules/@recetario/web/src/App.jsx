import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowLeft,
  BookOpen,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  ExternalLink,
  Flame,
  Heart,
  Leaf,
  LoaderCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { recipesApi } from './services/recipes.js'

const categories = ['Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Postres', 'Snacks']

const emptyRecipe = {
  title: '',
  description: '',
  category: 'Almuerzo',
  prepMinutes: 30,
  imageUrl: '',
  ingredients: [''],
  steps: [''],
}

function RecipeImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`image-placeholder ${className}`} aria-label={alt}>
      <Utensils size={28} />
    </div>
  )
}

function RecipeCard({ recipe, onSelect, isFavorite, onFavorite }) {
  return (
    <article className="recipe-card">
      <button className="card-image-button" onClick={() => onSelect(recipe)} aria-label={`Ver ${recipe.title}`}>
        <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="card-image" />
        <span className="category-tag">{recipe.category}</span>
      </button>
      <button
        className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        onClick={() => onFavorite(recipe.id)}
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <button className="card-copy" onClick={() => onSelect(recipe)}>
        <span className="recipe-time"><Clock3 size={14} /> {recipe.prepMinutes} min</span>
        <h3>{recipe.title}</h3>
        <p>{recipe.description || 'Una receta deliciosa para compartir en casa.'}</p>
      </button>
    </article>
  )
}

function RecipeForm({ recipe, onClose, onSave }) {
  const [form, setForm] = useState(() => recipe
    ? { ...recipe, ingredients: [...recipe.ingredients], steps: [...recipe.steps] }
    : { ...emptyRecipe, ingredients: [''], steps: [''] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editing = Boolean(recipe)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateList(field, index, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item),
    }))
  }

  function addListItem(field) {
    setForm((current) => ({ ...current, [field]: [...current[field], ''] }))
  }

  function removeListItem(field, index) {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        prepMinutes: Number(form.prepMinutes),
        ingredients: form.ingredients.filter((item) => item.trim()),
        steps: form.steps.filter((item) => item.trim()),
      })
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">TU RECETARIO</span>
            <h2 id="form-title">{editing ? 'Editar receta' : 'Una nueva favorita'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="recipe-form">
          <label className="field">
            <span>Nombre de la receta *</span>
            <input required maxLength={120} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ej. Pasta cremosa al limón" />
          </label>
          <label className="field">
            <span>Una breve descripción</span>
            <textarea rows="2" maxLength={240} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="¿Qué la hace especial?" />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Categoría</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {categories.slice(1).map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Preparación (minutos) *</span>
              <input required type="number" min="1" max="1440" value={form.prepMinutes} onChange={(event) => updateField('prepMinutes', event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>URL de imagen</span>
            <input type="url" maxLength={2048} value={form.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} placeholder="https://..." />
          </label>
          <div className="field-list">
            <div className="list-heading"><span>Ingredientes *</span><small>Una línea por ingrediente</small></div>
            {form.ingredients.map((ingredient, index) => (
              <div className="repeat-row" key={`ingredient-${index}`}>
                <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                <input required={index === 0} value={ingredient} onChange={(event) => updateList('ingredients', index, event.target.value)} placeholder="Ej. 2 tazas de harina" />
                {form.ingredients.length > 1 && <button type="button" className="remove-row" onClick={() => removeListItem('ingredients', index)} aria-label="Quitar ingrediente"><X size={16} /></button>}
              </div>
            ))}
            <button type="button" className="add-row" onClick={() => addListItem('ingredients')}><Plus size={15} /> Añadir ingrediente</button>
          </div>
          <div className="field-list">
            <div className="list-heading"><span>Preparación *</span><small>Ordena los pasos</small></div>
            {form.steps.map((step, index) => (
              <div className="repeat-row" key={`step-${index}`}>
                <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                <input required={index === 0} value={step} onChange={(event) => updateList('steps', index, event.target.value)} placeholder="Describe este paso..." />
                {form.steps.length > 1 && <button type="button" className="remove-row" onClick={() => removeListItem('steps', index)} aria-label="Quitar paso"><X size={16} /></button>}
              </div>
            ))}
            <button type="button" className="add-row" onClick={() => addListItem('steps')}><Plus size={15} /> Añadir paso</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar receta'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function RecipeDetail({ recipe, onClose, onEdit, onDelete, isFavorite, onFavorite }) {
  return (
    <div className="overlay detail-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="detail-close icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="detail-hero">
          <RecipeImage src={recipe.imageUrl} alt={recipe.title} className="detail-image" />
          <span className="category-tag detail-category">{recipe.category}</span>
        </div>
        <div className="detail-content">
          <div className="detail-title-row">
            <div>
              <span className="recipe-time"><Clock3 size={15} /> {recipe.prepMinutes} minutos</span>
              <h2 id="detail-title">{recipe.title}</h2>
            </div>
            <button className={`favorite-button detail-favorite ${isFavorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(recipe.id)} aria-label="Cambiar favorito">
              <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          {recipe.description && <p className="detail-description">{recipe.description}</p>}
          {recipe.imageSourceUrl && (
            <a className="image-source-link" href={recipe.imageSourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Ver imagen original en Magnific
            </a>
          )}
          <div className="detail-columns">
            <section className="ingredients-section">
              <h3><Leaf size={18} /> Ingredientes</h3>
              <ul className="ingredient-list">
                {recipe.ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`}><span className="ingredient-dot" />{ingredient}</li>)}
              </ul>
            </section>
            <section className="steps-section">
              <h3><ChefHat size={18} /> Preparación</h3>
              <ol className="steps-list">
                {recipe.steps.map((step, index) => <li key={`${step}-${index}`}><span className="step-number">{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}
              </ol>
            </section>
          </div>
          <div className="detail-actions">
            <button className="button button-quiet delete-button" onClick={() => onDelete(recipe)}><Trash2 size={16} /> Eliminar</button>
            <button className="button button-primary" onClick={() => onEdit(recipe)}>Editar receta <ChevronRight size={16} /></button>
          </div>
        </div>
      </article>
    </div>
  )
}

export default function App() {
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('la-cucharita-favorites') || '[]')
    } catch {
      return []
    }
  })
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [editingRecipe, setEditingRecipe] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadRecipes() {
    setLoading(true)
    setError('')
    try {
      setRecipes(await recipesApi.list())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecipes() }, [])

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return recipes.filter((recipe) => {
      const matchesSearch = !query || [recipe.title, recipe.description, ...recipe.ingredients]
        .some((value) => value.toLocaleLowerCase('es').includes(query))
      return matchesSearch
        && (category === 'Todas' || recipe.category === category)
        && (!favoritesOnly || favorites.includes(recipe.id))
    })
  }, [recipes, search, category, favoritesOnly, favorites])

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      localStorage.setItem('la-cucharita-favorites', JSON.stringify(next))
      return next
    })
  }

  async function saveRecipe(payload) {
    const saved = editingRecipe
      ? await recipesApi.update(editingRecipe.id, payload)
      : await recipesApi.create(payload)
    setRecipes((current) => editingRecipe
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current])
    setEditingRecipe(undefined)
    setSelectedRecipe(editingRecipe ? saved : null)
    setNotice(editingRecipe ? 'Receta actualizada' : 'Receta añadida a tu colección')
    window.setTimeout(() => setNotice(''), 3000)
  }

  async function deleteRecipe(recipe) {
    if (!window.confirm(`¿Eliminar "${recipe.title}" de tu recetario?`)) return
    try {
      await recipesApi.remove(recipe.id)
      setRecipes((current) => current.filter((item) => item.id !== recipe.id))
      setFavorites((current) => {
        const next = current.filter((item) => item !== recipe.id)
        localStorage.setItem('la-cucharita-favorites', JSON.stringify(next))
        return next
      })
      setSelectedRecipe(null)
      setNotice('Receta eliminada')
      window.setTimeout(() => setNotice(''), 3000)
    } catch (deleteError) {
      setNotice(deleteError.message)
      window.setTimeout(() => setNotice(''), 4000)
    }
  }

  function openEdit(recipe) {
    setEditingRecipe(recipe)
    setSelectedRecipe(null)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setCategory('Todas'); setFavoritesOnly(false); setSearch('') }}>
          <span className="brand-mark"><Utensils size={19} /></span>
          <span>la cucharita<span className="brand-period">.</span></span>
        </a>
        <nav className="header-nav" aria-label="Navegación principal">
          <a className="nav-link active" href="#recetas"><BookOpen size={16} /> Recetas</a>
          <button className={`nav-link ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly((value) => !value)}><Heart size={16} /> Mis favoritas</button>
        </nav>
        <button className="button button-primary header-cta" onClick={() => { setEditingRecipe(null); setSelectedRecipe(null) }}><Plus size={17} /> Añadir receta</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> UN LUGAR PARA SABOREAR</span>
            <h1>La inspiración<br />está <em>servida.</em></h1>
            <p>Recetas sencillas, momentos inolvidables.<br className="desktop-break" /> Encuentra tu próximo plato favorito.</p>
            <a className="hero-link" href="#recetas">Explorar recetas <ArrowLeft size={16} /></a>
          </div>
          <div className="hero-art">
            <div className="hero-image-wrap">
              <RecipeImage src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1100&q=85" alt="Ensalada fresca y colorida servida en un plato" className="hero-image" />
            </div>
            <div className="hero-sticker"><span>hecho con</span><Heart size={15} fill="currentColor" /><span>amor</span></div>
            <div className="hero-caption"><span className="caption-dot" /> FRESCO, FÁCIL Y DELICIOSO</div>
          </div>
          <span className="hero-decoration decoration-one">✳</span>
          <span className="hero-decoration decoration-two">✳</span>
        </section>

        <section className="collection-section" id="recetas">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><Flame size={14} /> ALGO RICO TE ESPERA</span>
              <h2>{favoritesOnly ? 'Tus favoritas' : 'El menú de hoy'}</h2>
            </div>
            <span className="recipe-count">{filteredRecipes.length} {filteredRecipes.length === 1 ? 'receta' : 'recetas'}</span>
          </div>

          <div className="toolbar">
            <label className="search-box">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca por receta o ingrediente..." aria-label="Buscar recetas o ingredientes" />
              {search && <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
            </label>
            <div className="toolbar-note"><SlidersHorizontal size={16} /> Encuentra algo delicioso</div>
          </div>

          <div className="category-tabs" role="tablist" aria-label="Filtrar recetas por categoría">
            {categories.map((item) => (
              <button key={item} role="tab" aria-selected={category === item} className={`category-tab ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>
                {item === 'Todas' && <ArrowDownUp size={14} />} {item}
              </button>
            ))}
          </div>

          {error && (
            <div className="error-panel" role="alert">
              <div><strong>No pudimos cargar las recetas</strong><p>{error}</p></div>
              <button className="button button-quiet" onClick={loadRecipes}>Reintentar</button>
            </div>
          )}
          {loading ? (
            <div className="loading-state"><LoaderCircle className="spin" size={28} /><span>Preparando algo rico...</span></div>
          ) : !error && filteredRecipes.length ? (
            <div className="recipe-grid">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onSelect={setSelectedRecipe} isFavorite={favorites.includes(recipe.id)} onFavorite={toggleFavorite} />
              ))}
            </div>
          ) : !error ? (
            <div className="empty-state">
              <span className="empty-icon"><Utensils size={25} /></span>
              <h3>{favoritesOnly ? 'Aún no tienes favoritas' : 'No encontramos recetas'}</h3>
              <p>{favoritesOnly ? 'Toca el corazón de una receta y la guardaremos aquí.' : 'Prueba otra búsqueda o añade la primera receta a tu colección.'}</p>
              {!favoritesOnly && <button className="button button-primary" onClick={() => { setEditingRecipe(null); setSelectedRecipe(null) }}><Plus size={17} /> Añadir una receta</button>}
            </div>
          ) : null}
        </section>

        <section className="closing-note">
          <span className="closing-icon"><ChefHat size={19} /></span>
          <p>Las mejores recetas llevan <strong>un poquito de cariño.</strong></p>
          <Leaf size={17} className="closing-leaf" />
        </section>
      </main>

      <footer className="site-footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><Utensils size={16} /></span><span>la cucharita<span className="brand-period">.</span></span></a><span>Hecho con cariño, para compartir. <Heart size={13} fill="currentColor" /></span></footer>

      {notice && <div className="toast" role="status"><Check size={16} /> {notice}</div>}
      {editingRecipe !== undefined && <RecipeForm key={editingRecipe?.id || 'new'} recipe={editingRecipe} onClose={() => setEditingRecipe(undefined)} onSave={saveRecipe} />}
      {selectedRecipe && recipes.some((recipe) => recipe.id === selectedRecipe.id) && (
        <RecipeDetail
          recipe={recipes.find((recipe) => recipe.id === selectedRecipe.id)}
          onClose={() => setSelectedRecipe(null)}
          onEdit={openEdit}
          onDelete={deleteRecipe}
          isFavorite={favorites.includes(selectedRecipe.id)}
          onFavorite={toggleFavorite}
        />
      )}
    </div>
  )
}
