import { useMemo, useState } from 'react'
import { ArrowDown, ChevronDown, Heart, Plus, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { browseSections, deliveryOptions, products, type CatalogFacet } from '../data/products'
import type { Product } from '../types'

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const fallbackImage = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=720&q=85'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  onAdd: (product: Product) => void
}

function ProductCatalog({ search, onSearchChange, onAdd }: Props) {
  const [activeFacet, setActiveFacet] = useState<{ facet: CatalogFacet; value: string } | null>(null)
  const [delivery, setDelivery] = useState('')
  const [priceRange, setPriceRange] = useState('any')
  const [egglessOnly, setEgglessOnly] = useState(false)
  const [sort, setSort] = useState('recommended')
  const [showAll, setShowAll] = useState(false)
  const [saved, setSaved] = useState<string[]>([])

  const matchingProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesFacet = !activeFacet || product[activeFacet.facet].includes(activeFacet.value)
      const matchesDelivery = !delivery || product.delivery.includes(delivery)
      const matchesPrice = priceRange === 'any'
        || (priceRange === 'under-750' && product.price < 750)
        || (priceRange === '750-1200' && product.price >= 750 && product.price <= 1200)
        || (priceRange === 'over-1200' && product.price > 1200)
      const matchesDiet = !egglessOnly || product.dietary.includes('Eggless')
      const matchesSearch = !query || [
        product.name,
        product.category,
        product.description,
        ...product.occasions,
        ...product.styles,
        ...product.flavours,
        ...product.dietary,
      ].join(' ').toLowerCase().includes(query)
      return matchesFacet && matchesDelivery && matchesPrice && matchesDiet && matchesSearch
    })

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'price-low': return a.price - b.price
        case 'price-high': return b.price - a.price
        case 'top-rated': return Number(b.rating) - Number(a.rating)
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })
  }, [activeFacet, delivery, egglessOnly, priceRange, search, sort])

  const hasFilters = Boolean(activeFacet || delivery || priceRange !== 'any' || egglessOnly || search)
  const displayedProducts = showAll ? matchingProducts : matchingProducts.slice(0, 9)

  function chooseFacet(facet: CatalogFacet, value: string) {
    setActiveFacet((current) => current?.facet === facet && current.value === value ? null : { facet, value })
    setShowAll(true)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearFilters() {
    setActiveFacet(null)
    setDelivery('')
    setPriceRange('any')
    setEgglessOnly(false)
    onSearchChange('')
    setShowAll(false)
  }

  return (
    <>
      {/* Browse menus filter the same catalog without duplicating product logic. */}
      <section id="browse" className="page-shell browse-section">
        <div>
          <h2 className="browse-heading">A cake for every kind of day</h2>
        </div>

        <nav aria-label="Browse cakes by category" className="browse-nav">
          {browseSections.map((section) => (
            <details key={section.facet} className="browse-menu">
              <summary className="browse-trigger">
                {section.facet === 'occasions' ? 'Find a cake for the moment' : section.facet === 'styles' ? 'Cake style' : 'Flavour'}
                <ChevronDown size={14} className="browse-chevron" />
              </summary>
              <div className="browse-options">
                {section.items.map((item) => {
                  const selected = activeFacet?.facet === section.facet && activeFacet.value === item.name
                  return (
                    <button
                      key={item.name}
                      onClick={(event) => {
                        chooseFacet(section.facet, item.name)
                        event.currentTarget.closest('details')?.removeAttribute('open')
                      }}
                      aria-pressed={selected}
                      data-selected={selected}
                      className="browse-option"
                    >
                      <img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage }} className="browse-thumbnail" />
                      <span className="browse-option-label">{item.name}</span>
                    </button>
                  )
                })}
              </div>
            </details>
          ))}
        </nav>
      </section>

      {/* Product listing and refinements live in this independently styled section. */}
      <section id="catalog" className="catalog-section">
        <div className="page-shell catalog-inner">
          <div className="catalog-heading-row">
            <div>
              <p className="catalog-eyebrow">Fresh from the Bake More kitchen</p>
              <h2 className="catalog-title">The cake shelf</h2>
            </div>
            <span className="catalog-count">{matchingProducts.length} cakes to explore</span>
          </div>

          <label className="catalog-search">
            <Search size={16} />
            <input aria-label="Search cakes" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search cakes and flavours" />
          </label>

          <div className="refine-bar">
            <div className="refine-title"><SlidersHorizontal size={15} className="refine-title-icon" /> Refine your picks</div>
            <div className="refine-controls">
              <select aria-label="Filter by delivery" value={delivery} onChange={(event) => { setDelivery(event.target.value); setShowAll(false) }} className="refine-select">
                <option value="">Any delivery</option>
                {deliveryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select aria-label="Filter by price" value={priceRange} onChange={(event) => { setPriceRange(event.target.value); setShowAll(false) }} className="refine-select">
                <option value="any">Any price</option>
                <option value="under-750">Under ₹750</option>
                <option value="750-1200">₹750 – ₹1,200</option>
                <option value="over-1200">Over ₹1,200</option>
              </select>
              <select aria-label="Sort cakes" value={sort} onChange={(event) => setSort(event.target.value)} className="refine-select">
                <option value="recommended">Recommended</option>
                <option value="top-rated">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div className="catalog-layout">
            <aside className="filter-sidebar">
              <div className="filter-sidebar-top">
                <h3 className="filter-sidebar-heading">Narrow it down</h3>
                {hasFilters && <button onClick={clearFilters} className="clear-filters">Clear all</button>}
              </div>
              {browseSections.map((section) => (
                <fieldset key={section.facet} className="filter-group">
                  <legend className="filter-group-title">{section.title.replace('Find a cake for the moment', 'Occasion').replace('Choose your cake style', 'Cake style').replace('Pick a flavour to love', 'Flavour')}</legend>
                  <div className="filter-chips">
                    {section.items.map((item) => {
                      const selected = activeFacet?.facet === section.facet && activeFacet.value === item.name
                      return <button key={item.name} onClick={() => chooseFacet(section.facet, item.name)} aria-pressed={selected} data-selected={selected} className="filter-chip">{item.name}</button>
                    })}
                  </div>
                </fieldset>
              ))}
              <fieldset className="filter-group">
                <legend className="filter-group-title">Dietary</legend>
                <label className="dietary-option">
                  <input type="checkbox" checked={egglessOnly} onChange={(event) => { setEgglessOnly(event.target.checked); setShowAll(false) }} />
                  Eggless
                </label>
              </fieldset>
              {hasFilters && (
                <button onClick={clearFilters} className="reset-filters"><X size={12} /> Reset filters</button>
              )}
            </aside>

            <div className="catalog-results">
              {activeFacet && (
                <div className="active-filter">
                  <span>Showing <strong>{activeFacet.value}</strong> cakes</span>
                  <button onClick={() => setActiveFacet(null)} aria-label="Clear category filter" className="active-filter-clear"><X size={14} /></button>
                </div>
              )}
              {displayedProducts.length ? (
                <div className="product-grid">
                  {displayedProducts.map((product) => (
                    <article key={product.id} className="product-card">
                      <div className="product-image-wrap">
                        <img src={product.image} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage }} className="product-image" />
                        {product.badge && <span className="product-badge">{product.badge}</span>}
                        {product.compareAt && <span className="product-discount">{Math.round((1 - product.price / product.compareAt) * 100)}% less</span>}
                        <button onClick={() => setSaved((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} aria-label={`${saved.includes(product.id) ? 'Remove' : 'Save'} ${product.name}`} data-saved={saved.includes(product.id)} className="favorite-button"><Heart size={16} fill={saved.includes(product.id) ? 'currentColor' : 'none'} /></button>
                      </div>
                      <div className="product-details">
                        <div className="product-meta">
                          <span className="product-category">{product.category}</span>
                          <span className="product-rating"><Star size={11} fill="#d58b39" stroke="#d58b39" /> {product.rating}</span>
                        </div>
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-description">{product.description}</p>
                        <div className="product-tags">
                          {product.dietary.includes('Eggless') && <span className="product-tag-dietary">Eggless</span>}
                          <span className="product-tag">{product.weight}</span>
                          <span className="product-tag">{product.delivery[0]}</span>
                        </div>
                        <div className="product-footer">
                          <span className="product-price">
                            {money.format(product.price)}
                            {product.compareAt && <del className="product-compare-price">{money.format(product.compareAt)}</del>}
                          </span>
                          <button onClick={() => onAdd(product)} className="add-to-cart-button"><Plus size={13} /> Add</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-results">
                  <p className="empty-results-title">No cakes in this slice of the shelf</p>
                  <p className="empty-results-copy">Try another flavour or clear a filter to see more.</p>
                  <button onClick={clearFilters} className="empty-results-button">Show all cakes</button>
                </div>
              )}
              {matchingProducts.length > 9 && (
                <div className="load-more-row">
                  <button onClick={() => setShowAll((value) => !value)} className="load-more-button">{showAll ? 'Show fewer cakes' : 'Load more cakes'} <ArrowDown size={14} data-expanded={showAll} className="load-more-icon" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default ProductCatalog
