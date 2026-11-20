import type { Product } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=720&q=85`

export const products: Product[] = [
  {
    id: 'berry-cloud',
    name: 'Berry Cloud Cake',
    category: 'Celebration',
    description: 'Vanilla sponge · fresh berries · whipped cream',
    price: 1199,
    rating: '4.9',
    image: image('photo-1578985545062-69928b1d9587'),
    badge: 'Bestseller',
  },
  {
    id: 'choco-dream',
    name: 'Midnight Chocolate',
    category: 'Chocolate',
    description: 'Dark chocolate ganache · cocoa crumb',
    price: 999,
    rating: '4.8',
    image: image('photo-1606890737304-57a1ca8a5b62'),
    badge: 'Rich & fudgy',
  },
  {
    id: 'rose-pistachio',
    name: 'Rose & Pistachio',
    category: 'Celebration',
    description: 'Pistachio sponge · rose buttercream',
    price: 1399,
    rating: '4.9',
    image: image('photo-1563729784474-d77dbb933a9e'),
  },
  {
    id: 'confetti-day',
    name: 'Confetti Birthday',
    category: 'Birthday',
    description: 'Birthday vanilla · rainbow sprinkles',
    price: 899,
    rating: '4.7',
    image: image('photo-1571115177098-24ec42ed204d'),
    badge: 'Party favourite',
  },
  {
    id: 'caramel-kiss',
    name: 'Salted Caramel Kiss',
    category: 'Chocolate',
    description: 'Silky caramel · chocolate sponge · sea salt',
    price: 1099,
    rating: '4.8',
    image: image('photo-1588195538326-c5b1e9f80a1b'),
  },
  {
    id: 'little-luxe',
    name: 'Little Luxe Bento',
    category: 'Birthday',
    description: 'A little cake for a lovely little moment',
    price: 649,
    rating: '4.9',
    image: image('photo-1551024506-0afc1a7f8e56'),
    badge: 'Made for two',
  },
  {
    id: 'lemon-garden',
    name: 'Lemon Garden',
    category: 'Celebration',
    description: 'Bright lemon curd · soft vanilla layers',
    price: 1249,
    rating: '4.8',
    image: image('photo-1519915028121-7d3463d20b13'),
  },
  {
    id: 'classic-truffle',
    name: 'Classic Truffle',
    category: 'Chocolate',
    description: 'A timeless chocolate cake, made to share',
    price: 799,
    rating: '4.9',
    image: image('photo-1578985545062-69928b1d9587'),
  },
]

export const categories = ['All cakes', 'Birthday', 'Chocolate', 'Celebration']
