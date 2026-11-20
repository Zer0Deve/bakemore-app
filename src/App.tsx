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
    return <div className="loading-state">Opening your bakery…</div>
  }

  return (
    <div className="app-shell">
      {/* Announcement strip sits above the sticky navigation. */}
      <div className="announcement">
        A LITTLE JOY, DELIVERED FRESH <span className="announcement-mark">✳</span> FREE DELIVERY ON ORDERS OVER ₹999
      </div>
      <header className="site-header">
        <div className="page-shell header-inner">
          <a href="#" className="brand" aria-label="Bake More home">
            <span className="brand-icon"><CakeSlice size={21} /></span>
            <span className="brand-copy">
              <span className="brand-name">bake more</span>
              <span className="brand-tagline">little moments, sweeter</span>
            </span>
          </a>

          <nav className="site-nav">
            <a href="#browse">Find by moment</a>
            <a href="#catalog">Browse cakes</a>
            <a href="#promise">The Bake More promise</a>
          </nav>

          <div className="header-actions">
            <label className="header-search">
              <Search size={16} />
              <input aria-label="Search cakes" value={search} onChange={(event) => { setSearch(event.target.value); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }) }} placeholder="Find your sweet thing" />
            </label>
            <button onClick={() => setPanel('account')} aria-label="Your profile" className="icon-button">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="profile-avatar" /> : <UserRound size={20} />}
            </button>
            <button onClick={() => setPanel('cart')} aria-label={`Shopping bag, ${cartCount} items`} className="bag-button">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="bag-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Full-bleed cake photography is isolated from its text and callout overlays. */}
        <section className="page-shell hero-section">
          <div className="hero-card">
            <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=2000&q=90" alt="A freshly decorated celebration cake" className="hero-image" />
            <div className="hero-shade" />
            <div className="hero-copy">
              <span className="hero-eyebrow"><Sparkles size={13} /> Baked for your best days</span>
              <h1 className="hero-title">A little more <em>cake.</em><br />A lot more joy.</h1>
              <p className="hero-description">For the big milestones, the tiny wins, and the Tuesdays that deserve a treat.</p>
              <a href="#browse" className="hero-cta">Find your cake <ArrowRight size={16} /></a>
              <div className="hero-delivery"><Clock3 size={14} /> Made fresh, delivered with love</div>
            </div>
            <div className="hero-note">
              <div className="hero-note-icon"><Heart size={18} fill="currentColor" /></div>
              <div><p className="hero-note-title">Made to make someone smile</p><p className="hero-note-caption">Every single time.</p></div>
            </div>
          </div>
        </section>

        {/* Catalog contains the category menus, product filters, and cake cards. */}
        <ProductCatalog search={search} onSearchChange={setSearch} onAdd={addToCart} />

        {/* Short promise cards close the shopping experience before the footer. */}
        <section id="promise" className="page-shell promise-section">
          {[
            { icon: <Sparkles size={18} />, title: 'Made with the good stuff', text: 'Real ingredients, joyful recipes, and a little extra love in every layer.' },
            { icon: <Clock3 size={18} />, title: 'Fresh from our oven', text: 'Baked to order, so your cake arrives as lovely as the moment deserves.' },
            { icon: <Heart size={18} />, title: 'Here for your moments', text: 'From “just because” to “I do”—there’s a Bake More for that.' },
          ].map((item) => (
            <div key={item.title} className="promise-card">
              <div className="promise-icon">{item.icon}</div>
              <h3 className="promise-title">{item.title}</h3>
              <p className="promise-copy">{item.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <div>
            <span className="footer-brand">bake more</span>
            <p className="footer-tagline">Little moments, sweeter.</p>
          </div>
          <p className="footer-copyright">© {new Date().getFullYear()} Bake More. Made with a little extra love.</p>
        </div>
      </footer>

      {notice && <div role="status" className="toast-notice">{notice}</div>}

      {panel && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null) }}>
          {panel === 'cart' ? (
            <aside aria-label="Shopping bag" className="drawer">
              <div className="drawer-header">
                <div><p className="drawer-eyebrow">Your picks</p><h2 className="drawer-title">Your bag <span className="drawer-count">({cartCount})</span></h2></div>
                <button onClick={() => setPanel(null)} aria-label="Close bag" className="drawer-close"><X size={19} /></button>
              </div>
              {cart.length ? (
                <>
                  <div className="cart-items">
                    {cart.map((line) => {
                      const product = products.find((item) => item.id === line.productId)
                      if (!product) return null
                      return <div key={line.productId} className="cart-item">
                        <img src={product.image} alt="" className="cart-item-image" />
                        <div className="cart-item-details">
                          <div><h3 className="cart-item-name">{product.name}</h3><p className="cart-item-unit-price">{money.format(product.price)} each</p></div>
                          <div className="cart-item-bottom">
                            <div className="quantity-controls">
                              <button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`} className="quantity-button"><Minus size={13} /></button><span className="quantity-value">{line.quantity}</span><button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`} className="quantity-button"><Plus size={13} /></button>
                            </div>
                            <span className="cart-item-total">{money.format(product.price * line.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    })}
                    <div className="demo-checkout-note"><PackageCheck size={16} className="demo-checkout-icon" /> Demo orders are saved to your account, but no payment is processed.</div>
                  </div>
                  <div className="cart-summary">
                    <div className="subtotal-row"><span className="subtotal-label">Subtotal</span><strong>{money.format(subtotal)}</strong></div>
                    <button onClick={() => void handleCheckout()} disabled={busy || (user !== null && !accountReady)} className="checkout-button">{busy ? 'Saving your order…' : 'Place demo order'} <ArrowRight size={16} /></button>
                    <p className="checkout-caption">No payment details required · {user ? 'Saved to your profile' : 'Order saved on this device'}</p>
                  </div>
                </>
              ) : (
                <div className="empty-cart">
                  <span className="empty-cart-icon"><ShoppingBag size={24} /></span>
                  <h3 className="empty-cart-title">Your bag is taking a breather</h3>
                  <p className="empty-cart-copy">Add a cake to get the good times rolling.</p>
                  <button onClick={() => { setPanel(null); document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' }) }} className="dark-button">Explore cakes</button>
                </div>
              )}
            </aside>
          ) : (
            <aside aria-label="Your profile" className="drawer">
              <div className="drawer-header">
                <div><p className="drawer-eyebrow">Your little corner</p><h2 className="drawer-title">Your profile</h2></div>
                <button onClick={() => setPanel(null)} aria-label="Close profile" className="drawer-close"><X size={19} /></button>
              </div>
              <div className="drawer-scroll">
                {user ? (
                  <>
                    <div className="profile-card">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="profile-avatar-large" /> : <span className="account-placeholder"><UserRound size={23} /></span>}
                      <div className="profile-copy"><h3 className="profile-name">{user.displayName || 'Hello, sweet tooth'}</h3><p className="profile-email">{user.email}</p></div>
                    </div>
                    <div className="order-heading"><h3 className="order-heading-title">Order history</h3><span className="order-count">{orders.length} orders</span></div>
                    {orders.length ? <div className="order-list">
                      {orders.map((order) => <div key={order.id} className="order-card">
                        <div className="order-top"><div><p className="order-number">{order.id}</p><p className="order-date">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><span className="order-status"><Check size={11} /> {order.status}</span></div>
                        <div className="order-total-row"><span className="order-items-count">{order.items.reduce((sum, line) => sum + line.quantity, 0)} cake(s)</span><strong>{money.format(order.total)}</strong></div>
                      </div>)}
                    </div> : <div className="empty-orders"><p className="empty-orders-title">Your next celebration starts here</p><p className="empty-orders-copy">Orders you place will show up right here.</p></div>}
                    <button onClick={() => void handleSignOut()} className="signout-button">Sign out</button>
                  </>
                ) : (
                  <>
                    <div className="signin-card">
                      <span className="account-placeholder signin-placeholder"><UserRound size={24} /></span>
                      <h3 className="signin-title">Good things, remembered.</h3>
                      <p className="signin-copy">Sign in to keep your cart, profile, and order history with you whenever you come back.</p>
                      <button onClick={() => void handleGoogleSignIn()} disabled={busy || !firebaseConfigured} className="google-button">
                        <GoogleMark /> {busy ? 'Opening Google…' : 'Continue with Google'}
                      </button>
                      {!firebaseConfigured && <p className="firebase-help">Google sign-in is ready to connect. Add your Firebase web app values to <code>.env</code> (or GitHub Actions secrets) to enable it.</p>}
                    </div>
                    {orders.length > 0 && <div className="guest-order-note"><p className="guest-order-title">Guest orders on this device</p><p className="guest-order-copy">{orders.length} order(s). Sign in to attach them to your profile.</p></div>}
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
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="google-logo">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(2 2) scale(.92)" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.2 7.13-17.58Z" transform="translate(1 1) scale(.94)" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z" transform="translate(2 2) scale(.92)" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.64-5.93c-2.13 1.43-4.86 2.27-8.26 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(2 2) scale(.92)" />
  </svg>
}

export default App
