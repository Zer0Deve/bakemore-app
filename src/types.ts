export type Product = {
  id: string
  name: string
  category: string
  description: string
  price: number
  rating: string
  image: string
  badge?: string
  occasions: string[]
  styles: string[]
  flavours: string[]
  delivery: string[]
  dietary: string[]
  weight: string
  compareAt?: number
}

export type CartLine = { productId: string; quantity: number }

export type Order = {
  id: string
  createdAt: string
  items: CartLine[]
  total: number
  status: 'Confirmed'
}
