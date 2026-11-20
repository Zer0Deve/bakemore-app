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
      <section id="browse" className="page-shell py-4 sm:py-6">
        <div className="mb-4 max-w-[650px]">
          <h2 className="serif text-3xl tracking-[-.025em] sm:text-[40px]">A cake for every kind of day</h2>
        </div>

        <nav aria-label="Browse cakes by category" className="flex flex-wrap gap-2">
          {browseSections.map((section) => (
            <details key={section.facet} className="group relative">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[#e7dcd3] bg-white px-4 text-xs font-semibold text-stone-700 transition hover:border-berry hover:text-berry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry">
                {section.facet === 'occasions' ? 'Find a cake for the moment' : section.facet === 'styles' ? 'Cake style' : 'Flavour'}
                <ChevronDown size={14} className="transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 top-full z-20 mt-2 grid w-[min(580px,calc(100vw-2rem))] grid-cols-2 gap-2 rounded-2xl border border-[#eee2d9] bg-white p-3 shadow-[0_16px_40px_rgba(54,39,30,.14)] sm:grid-cols-3">
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
                      className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry ${selected ? 'border-berry bg-[#fbf2ee]' : 'border-transparent hover:bg-[#faf6f2]'}`}
                    >
                      <img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage }} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      <span className="truncate text-xs font-semibold text-ink">{item.name}</span>
                    </button>
                  )
                })}
              </div>
            </details>
          ))}
        </nav>
      </section>

      <section id="catalog" className="scroll-mt-24 bg-[#f8f2ec] py-8 sm:py-10">
        <div className="page-shell">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-berry">Fresh from the Bake More kitchen</p>
              <h2 className="serif text-3xl tracking-[-.025em] sm:text-[40px]">The cake shelf</h2>
            </div>
            <span className="text-xs text-stone-500">{matchingProducts.length} cakes to explore</span>
          </div>

          <label className="mb-5 flex h-11 items-center gap-2 rounded-full border border-[#e9ded4] bg-white px-4 text-stone-400 lg:hidden">
            <Search size={16} />
            <input aria-label="Search cakes" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search cakes and flavours" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-stone-400" />
          </label>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eee2d9] bg-white p-3 sm:px-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink"><SlidersHorizontal size={15} className="text-berry" /> Refine your picks</div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Filter by delivery" value={delivery} onChange={(event) => { setDelivery(event.target.value); setShowAll(false) }} className="h-9 rounded-full border border-[#eadfd6] bg-white px-3 text-[11px] text-stone-600 outline-none focus:border-berry">
                <option value="">Any delivery</option>
                {deliveryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select aria-label="Filter by price" value={priceRange} onChange={(event) => { setPriceRange(event.target.value); setShowAll(false) }} className="h-9 rounded-full border border-[#eadfd6] bg-white px-3 text-[11px] text-stone-600 outline-none focus:border-berry">
                <option value="any">Any price</option>
                <option value="under-750">Under ₹750</option>
                <option value="750-1200">₹750 – ₹1,200</option>
                <option value="over-1200">Over ₹1,200</option>
              </select>
              <select aria-label="Sort cakes" value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-full border border-[#eadfd6] bg-white px-3 text-[11px] text-stone-600 outline-none focus:border-berry">
                <option value="recommended">Recommended</option>
                <option value="top-rated">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[210px_1fr]">
            <aside className="h-fit rounded-2xl border border-[#eee2d9] bg-white p-4 lg:sticky lg:top-28">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="serif text-lg font-semibold">Narrow it down</h3>
                {hasFilters && <button onClick={clearFilters} className="text-[10px] font-semibold text-berry hover:underline">Clear all</button>}
              </div>
              {browseSections.map((section) => (
                <fieldset key={section.facet} className="border-t border-[#f1e9e2] py-3">
                  <legend className="pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">{section.title.replace('Find a cake for the moment', 'Occasion').replace('Choose your cake style', 'Cake style').replace('Pick a flavour to love', 'Flavour')}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {section.items.map((item) => {
                      const selected = activeFacet?.facet === section.facet && activeFacet.value === item.name
                      return <button key={item.name} onClick={() => chooseFacet(section.facet, item.name)} aria-pressed={selected} className={`rounded-full px-2.5 py-1.5 text-[10px] transition ${selected ? 'bg-berry text-white' : 'bg-[#f8f2ec] text-stone-600 hover:bg-[#f1e2db]'}`}>{item.name}</button>
                    })}
                  </div>
                </fieldset>
              ))}
              <fieldset className="border-t border-[#f1e9e2] py-3">
                <legend className="pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">Dietary</legend>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600">
                  <input type="checkbox" checked={egglessOnly} onChange={(event) => { setEgglessOnly(event.target.checked); setShowAll(false) }} className="accent-berry" />
                  Eggless
                </label>
              </fieldset>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-berry hover:underline"><X size={12} /> Reset filters</button>
              )}
            </aside>

            <div>
              {activeFacet && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-[#f2e5dd] px-4 py-3 text-xs">
                  <span>Showing <strong>{activeFacet.value}</strong> cakes</span>
                  <button onClick={() => setActiveFacet(null)} aria-label="Clear category filter" className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/70"><X size={14} /></button>
                </div>
              )}
              {displayedProducts.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {displayedProducts.map((product) => (
                    <article key={product.id} className="group overflow-hidden rounded-[18px] bg-white transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(74,49,38,.10)]">
                      <div className="relative aspect-[1.14/1] overflow-hidden bg-[#eee5dd]">
                        <img src={product.image} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        {product.badge && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold text-berry shadow-sm">{product.badge}</span>}
                        {product.compareAt && <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-2.5 py-1 text-[9px] font-bold text-white">{Math.round((1 - product.price / product.compareAt) * 100)}% less</span>}
                        <button onClick={() => setSaved((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} aria-label={`${saved.includes(product.id) ? 'Remove' : 'Save'} ${product.name}`} className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 transition ${saved.includes(product.id) ? 'text-berry' : 'text-stone-500 hover:text-berry'}`}><Heart size={16} fill={saved.includes(product.id) ? 'currentColor' : 'none'} /></button>
                      </div>
                      <div className="p-3.5 sm:p-4">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate text-[9px] font-bold uppercase tracking-[.14em] text-caramel">{product.category}</span>
                          <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-stone-500"><Star size={11} fill="#d58b39" stroke="#d58b39" /> {product.rating}</span>
                        </div>
                        <h3 className="serif min-h-[25px] text-[17px] font-semibold leading-tight sm:text-[20px]">{product.name}</h3>
                        <p className="mt-1.5 min-h-[30px] text-[10px] leading-4 text-stone-500 sm:text-[11px]">{product.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {product.dietary.includes('Eggless') && <span className="rounded-full bg-[#edf4eb] px-2 py-1 text-[9px] font-medium text-[#47714a]">Eggless</span>}
                          <span className="rounded-full bg-[#f7f0e9] px-2 py-1 text-[9px] font-medium text-stone-500">{product.weight}</span>
                          <span className="rounded-full bg-[#f7f0e9] px-2 py-1 text-[9px] font-medium text-stone-500">{product.delivery[0]}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-1">
                          <span className="flex flex-wrap items-baseline gap-1.5 text-sm font-bold">
                            {money.format(product.price)}
                            {product.compareAt && <del className="text-[10px] font-normal text-stone-400">{money.format(product.compareAt)}</del>}
                          </span>
                          <button onClick={() => onAdd(product)} className="inline-flex items-center gap-1.5 rounded-full bg-[#f8eee8] px-3 py-2 text-[10px] font-bold text-berry transition hover:bg-berry hover:text-white sm:px-4 sm:text-[11px]"><Plus size={13} /> Add</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white px-6 py-14 text-center">
                  <p className="serif text-xl">No cakes in this slice of the shelf</p>
                  <p className="mt-2 text-sm text-stone-500">Try another flavour or clear a filter to see more.</p>
                  <button onClick={clearFilters} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-white">Show all cakes</button>
                </div>
              )}
              {matchingProducts.length > 9 && (
                <div className="mt-8 text-center">
                  <button onClick={() => setShowAll((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-[#d9c9bd] bg-white px-6 py-3 text-xs font-bold transition hover:border-berry hover:text-berry">{showAll ? 'Show fewer cakes' : 'Load more cakes'} <ArrowDown size={14} className={showAll ? 'rotate-180' : ''} /></button>
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
