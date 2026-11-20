import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import {
  ArrowRight,
  CakeSlice,
  Check,
  Clock3,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { products } from './data/products'
import ProductCatalog from './components/ProductCatalog'
import { loadAccount, saveAccountCart, saveAccountOrder } from './lib/account'
import { auth, firebaseConfigured, googleProvider } from './lib/firebase'
import type { CartLine, Order, Product } from './types'

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const GUEST_ORDERS_KEY = 'bakemore.guest-orders'
const GUEST_CART_KEY = 'bakemore.guest-cart'

function readGuestCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '[]') as CartLine[]
  } catch {
    return []
  }
}

function readGuestOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) ?? '[]') as Order[]
  } catch {
    return []
  }
}

function mergeCart(first: CartLine[], second: CartLine[]) {
  const quantities = new Map<string, number>()
  for (const line of [...first, ...second]) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity)
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }))
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!firebaseConfigured)
  const [accountReady, setAccountReady] = useState(false)
  const [cart, setCart] = useState<CartLine[]>(readGuestCart)
  const [orders, setOrders] = useState<Order[]>(readGuestOrders)
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState<'cart' | 'account' | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    let active = true
    if (!user) {
      setAccountReady(false)
      setOrders(readGuestOrders())
      return
    }

    setAccountReady(false)
    const load = async () => {
      try {
        const account = await loadAccount(user)
        const guestCart = readGuestCart()
        const mergedCart = mergeCart(account.cart, guestCart)
        const guestOrders = readGuestOrders()
        const existingIds = new Set(account.orders.map((order) => order.id))
        const newGuestOrders = guestOrders.filter((order) => !existingIds.has(order.id))

        await Promise.all(newGuestOrders.map((order) => saveAccountOrder(user.uid, order)))
        if (guestCart.length) localStorage.setItem(GUEST_CART_KEY, '[]')
        if (guestOrders.length) localStorage.setItem(GUEST_ORDERS_KEY, '[]')
        await saveAccountCart(user.uid, mergedCart)
        if (!active) return
        setCart(mergedCart)
        setOrders([...account.orders, ...newGuestOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
        setAccountReady(true)
      } catch (error) {
        console.error('Unable to load your Bake More account.', error)
        if (active) {
          setNotice('We could not load your saved account data. Check your Firebase setup and try again.')
          setAccountReady(false)
        }
      }
    }
    void load()
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0)
  const subtotal = cart.reduce((total, line) => {
    const product = products.find((item) => item.id === line.productId)
    return total + (product?.price ?? 0) * line.quantity
  }, 0)

  function persistCart(nextCart: CartLine[]) {
    setCart(nextCart)
    if (!user || !accountReady) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextCart))
    } else if (accountReady) {
      void saveAccountCart(user.uid, nextCart).catch((error: unknown) => {
        console.error('Unable to save your cart.', error)
        setNotice('Your cart could not sync. Please check your connection and try again.')
      })
    }
  }

  function addToCart(product: Product) {
    const existing = cart.find((line) => line.productId === product.id)
    const next = existing
      ? cart.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...cart, { productId: product.id, quantity: 1 }]
    persistCart(next)
    setNotice(`${product.name} added to your bag`)
  }

  function changeQuantity(productId: string, delta: number) {
    const next = cart
      .map((line) => line.productId === productId ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0)
    persistCart(next)
  }

  async function handleGoogleSignIn() {
    if (!auth || !firebaseConfigured) {
      setNotice('Google sign-in needs Firebase web config. Add the values from .env.example to your deployment secrets.')
      return
    }
    setBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Google sign-in failed.', error)
      setNotice('Google sign-in did not finish. Check your Firebase authorized domains and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    if (!auth) return
    try {
      await signOut(auth)
      setPanel(null)
      setNotice('You have signed out.')
    } catch (error) {
      console.error('Sign-out failed.', error)
      setNotice('We could not sign you out. Please try again.')
    }
  }

  async function handleCheckout() {
    if (!cart.length || busy) return
    setBusy(true)
    const order: Order = {
      id: `BM-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      items: cart,
      total: subtotal,
      status: 'Confirmed',
    }
    try {
      if (user) {
        if (!accountReady) throw new Error('Your saved account is still loading.')
        await saveAccountOrder(user.uid, order)
        await saveAccountCart(user.uid, [])
      } else {
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify([order, ...readGuestOrders()]))
        localStorage.setItem(GUEST_CART_KEY, '[]')
      }
      setOrders((current) => [order, ...current])
      setCart([])
      setPanel(null)
      setNotice(`Order ${order.id} confirmed. This is a demo checkout; no payment was taken.`)
    } catch (error) {
      console.error('Unable to place your order.', error)
      setNotice('We could not save your order. Your cart is unchanged; please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!authReady) {
    return <div className="grid min-h-screen place-items-center text-sm text-stone-500">Opening your bakery…</div>
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink px-4 py-2 text-center text-[11px] font-semibold tracking-[.15em] text-white sm:text-xs">
        A LITTLE JOY, DELIVERED FRESH <span className="mx-2 text-amber-200">✳</span> FREE DELIVERY ON ORDERS OVER ₹999
      </div>
      <header className="sticky top-0 z-30 border-b border-[#eee2d9] bg-cream/95 backdrop-blur">
        <div className="page-shell flex h-[76px] items-center justify-between gap-5">
          <a href="#" className="flex shrink-0 items-center gap-2.5 text-ink no-underline" aria-label="Bake More home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-berry text-white"><CakeSlice size={21} /></span>
            <span className="leading-none">
              <span className="serif block text-[24px] font-semibold tracking-[-.05em]">bake more</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.25em] text-caramel">little moments, sweeter</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-stone-600 md:flex">
            <a className="transition hover:text-berry" href="#browse">Explore cakes</a>
            <a className="transition hover:text-berry" href="#story">Our little story</a>
            <a className="transition hover:text-berry" href="#promise">The Bake More promise</a>
          </nav>

          <div className="flex items-center gap-2">
            <label className="hidden h-10 items-center gap-2 rounded-full border border-[#e9ded4] bg-white px-3 text-stone-400 lg:flex">
              <Search size={16} />
              <input aria-label="Search cakes" value={search} onChange={(event) => { setSearch(event.target.value); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }) }} placeholder="Find your sweet thing" className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-stone-400" />
            </label>
            <button onClick={() => setPanel('account')} aria-label="Your profile" className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-blush">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" /> : <UserRound size={20} />}
            </button>
            <button onClick={() => setPanel('cart')} aria-label={`Shopping bag, ${cartCount} items`} className="relative grid h-10 w-10 place-items-center rounded-full bg-ink text-white transition hover:bg-berry">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-berry px-1 text-[10px] font-bold text-white">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="page-shell pt-6 sm:pt-8">
          <div className="relative min-h-[440px] overflow-hidden rounded-[26px] bg-[#eee1d4] sm:min-h-[490px]">
            <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=2000&q=90" alt="A freshly decorated celebration cake" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#281d18]/80 via-[#281d18]/40 to-transparent" />
            <div className="relative flex min-h-[440px] max-w-[620px] flex-col items-start justify-center px-7 py-12 text-white sm:min-h-[490px] sm:px-14">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.2em] backdrop-blur-sm"><Sparkles size={13} /> Baked for your best days</span>
              <h1 className="serif max-w-[570px] text-[44px] font-medium leading-[1.05] tracking-[-.04em] sm:text-[64px]">A little more <em className="font-medium text-[#f5c5b7]">cake.</em><br />A lot more joy.</h1>
              <p className="mt-5 max-w-[390px] text-sm leading-6 text-white/85 sm:text-base">For the big milestones, the tiny wins, and the Tuesdays that deserve a treat.</p>
              <a href="#browse" className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-[13px] font-bold text-ink transition hover:bg-[#f9e9df]">Find your cake <ArrowRight size={16} /></a>
              <div className="absolute bottom-7 left-7 flex items-center gap-2 text-[10px] tracking-wide text-white/80 sm:left-14"><Clock3 size={14} /> Made fresh, delivered with love</div>
            </div>
            <div className="absolute bottom-7 right-7 hidden rounded-2xl bg-white/90 p-3 pr-5 shadow-lg backdrop-blur sm:flex sm:items-center sm:gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f7e7df] text-berry"><Heart size={18} fill="currentColor" /></div>
              <div><p className="text-[11px] font-bold">Made to make someone smile</p><p className="mt-0.5 text-[10px] text-stone-500">Every single time.</p></div>
            </div>
          </div>
        </section>

        <section id="story" className="page-shell grid gap-8 py-12 sm:grid-cols-[1fr_auto] sm:items-center sm:py-16">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-berry">A slice of something lovely</p>
            <h2 className="serif max-w-[660px] text-3xl leading-tight tracking-[-.025em] sm:text-[40px]">Thoughtful cakes for <span className="italic text-berry">beautifully ordinary</span> days.</h2>
          </div>
          <p className="max-w-[360px] text-sm leading-6 text-stone-500">Small-batch bakes, joyful flavours, and the kind of cake that makes everyone ask for one more slice.</p>
        </section>

        <ProductCatalog search={search} onSearchChange={setSearch} onAdd={addToCart} />

        <section id="promise" className="page-shell grid gap-5 py-12 sm:grid-cols-3 sm:py-16">
          {[
            { icon: <Sparkles size={18} />, title: 'Made with the good stuff', text: 'Real ingredients, joyful recipes, and a little extra love in every layer.' },
            { icon: <Clock3 size={18} />, title: 'Fresh from our oven', text: 'Baked to order, so your cake arrives as lovely as the moment deserves.' },
            { icon: <Heart size={18} />, title: 'Here for your moments', text: 'From “just because” to “I do”—there’s a Bake More for that.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-[#f0e5dc] bg-white p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[#f8e9e3] text-berry">{item.icon}</div>
              <h3 className="serif text-[19px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-stone-500">{item.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="bg-ink py-9 text-white">
        <div className="page-shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="serif text-2xl">bake more</span>
            <p className="mt-1 text-[10px] text-white/60">Little moments, sweeter.</p>
          </div>
          <p className="text-[10px] text-white/55">© {new Date().getFullYear()} Bake More. Made with a little extra love.</p>
        </div>
      </footer>

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-center text-xs font-medium text-white shadow-xl">{notice}</div>}

      {panel && (
        <div className="modal-backdrop fixed inset-0 z-40 flex justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null) }}>
          {panel === 'cart' ? (
            <aside aria-label="Shopping bag" className="flex h-full w-full max-w-[450px] flex-col bg-cream shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#eee2d9] px-6 py-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-berry">Your picks</p><h2 className="serif mt-1 text-2xl">Your bag <span className="text-base text-stone-400">({cartCount})</span></h2></div>
                <button onClick={() => setPanel(null)} aria-label="Close bag" className="grid h-9 w-9 place-items-center rounded-full hover:bg-blush"><X size={19} /></button>
              </div>
              {cart.length ? (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {cart.map((line) => {
                      const product = products.find((item) => item.id === line.productId)
                      if (!product) return null
                      return <div key={line.productId} className="flex gap-4 rounded-2xl bg-white p-3">
                        <img src={product.image} alt="" className="h-[88px] w-[88px] rounded-xl object-cover" />
                        <div className="flex flex-1 flex-col justify-between py-1">
                          <div><h3 className="serif text-[17px] font-semibold">{product.name}</h3><p className="mt-1 text-xs text-stone-500">{money.format(product.price)} each</p></div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 rounded-full bg-[#f8f2ec] px-2 py-1">
                              <button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`} className="grid h-6 w-6 place-items-center"><Minus size={13} /></button><span className="text-xs font-semibold">{line.quantity}</span><button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`} className="grid h-6 w-6 place-items-center"><Plus size={13} /></button>
                            </div>
                            <span className="text-sm font-bold">{money.format(product.price * line.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    })}
                    <div className="flex items-center gap-2 rounded-xl bg-[#f4ece5] p-3 text-[11px] text-stone-600"><PackageCheck size={16} className="shrink-0 text-berry" /> Demo orders are saved to your account, but no payment is processed.</div>
                  </div>
                  <div className="border-t border-[#eee2d9] bg-white p-6">
                    <div className="mb-4 flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><strong>{money.format(subtotal)}</strong></div>
                    <button onClick={() => void handleCheckout()} disabled={busy || (user !== null && !accountReady)} className="flex w-full items-center justify-center gap-2 rounded-full bg-berry py-4 text-sm font-bold text-white transition hover:bg-[#7c2d40] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Saving your order…' : 'Place demo order'} <ArrowRight size={16} /></button>
                    <p className="mt-3 text-center text-[10px] text-stone-400">No payment details required · {user ? 'Saved to your profile' : 'Order saved on this device'}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[#f8e9e3] text-berry"><ShoppingBag size={24} /></span>
                  <h3 className="serif mt-5 text-2xl">Your bag is taking a breather</h3>
                  <p className="mt-2 text-sm text-stone-500">Add a cake to get the good times rolling.</p>
                  <button onClick={() => { setPanel(null); document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' }) }} className="mt-6 rounded-full bg-ink px-6 py-3 text-xs font-bold text-white">Explore cakes</button>
                </div>
              )}
            </aside>
          ) : (
            <aside aria-label="Your profile" className="flex h-full w-full max-w-[450px] flex-col bg-cream shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#eee2d9] px-6 py-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-berry">Your little corner</p><h2 className="serif mt-1 text-2xl">Your profile</h2></div>
                <button onClick={() => setPanel(null)} aria-label="Close profile" className="grid h-9 w-9 place-items-center rounded-full hover:bg-blush"><X size={19} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {user ? (
                  <>
                    <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f8e9e3] text-berry"><UserRound size={23} /></span>}
                      <div className="min-w-0"><h3 className="serif truncate text-xl font-semibold">{user.displayName || 'Hello, sweet tooth'}</h3><p className="mt-1 truncate text-xs text-stone-500">{user.email}</p></div>
                    </div>
                    <div className="mt-8 flex items-center justify-between"><h3 className="serif text-xl">Order history</h3><span className="rounded-full bg-[#f4e5df] px-2.5 py-1 text-[10px] font-bold text-berry">{orders.length} orders</span></div>
                    {orders.length ? <div className="mt-4 space-y-3">
                      {orders.map((order) => <div key={order.id} className="rounded-2xl bg-white p-4">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold">{order.id}</p><p className="mt-1 text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#e8f4eb] px-2 py-1 text-[9px] font-bold text-[#3d7851]"><Check size={11} /> {order.status}</span></div>
                        <div className="mt-3 flex justify-between border-t border-[#f2ece6] pt-3 text-[11px]"><span className="text-stone-500">{order.items.reduce((sum, line) => sum + line.quantity, 0)} cake(s)</span><strong>{money.format(order.total)}</strong></div>
                      </div>)}
                    </div> : <div className="mt-4 rounded-2xl bg-white px-5 py-8 text-center"><p className="serif text-lg">Your next celebration starts here</p><p className="mt-1 text-xs text-stone-500">Orders you place will show up right here.</p></div>}
                    <button onClick={() => void handleSignOut()} className="mt-7 w-full rounded-full border border-[#e4d7cc] py-3 text-xs font-bold text-stone-600 hover:border-berry hover:text-berry">Sign out</button>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-white p-6 text-center">
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f8e9e3] text-berry"><UserRound size={24} /></span>
                      <h3 className="serif mt-4 text-2xl">Good things, remembered.</h3>
                      <p className="mt-2 text-xs leading-5 text-stone-500">Sign in to keep your cart, profile, and order history with you whenever you come back.</p>
                      <button onClick={() => void handleGoogleSignIn()} disabled={busy || !firebaseConfigured} className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-ink py-3.5 text-xs font-bold text-white transition hover:bg-berry disabled:cursor-not-allowed disabled:opacity-55">
                        <GoogleMark /> {busy ? 'Opening Google…' : 'Continue with Google'}
                      </button>
                      {!firebaseConfigured && <p className="mt-3 text-left text-[10px] leading-4 text-stone-500">Google sign-in is ready to connect. Add your Firebase web app values to <code className="rounded bg-[#f4ece5] px-1">.env</code> (or GitHub Actions secrets) to enable it.</p>}
                    </div>
                    {orders.length > 0 && <div className="mt-5 rounded-2xl border border-[#eee2d9] p-4"><p className="text-xs font-bold">Guest orders on this device</p><p className="mt-1 text-[11px] text-stone-500">{orders.length} order(s). Sign in to attach them to your profile.</p></div>}
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  )
}

function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(2 2) scale(.92)" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.2 7.13-17.58Z" transform="translate(1 1) scale(.94)" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z" transform="translate(2 2) scale(.92)" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.64-5.93c-2.13 1.43-4.86 2.27-8.26 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(2 2) scale(.92)" />
  </svg>
}

export default App
