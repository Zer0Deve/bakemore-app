import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'
import type { CartLine, Order } from '../types'

const profileRef = (uid: string) => {
  if (!db) throw new Error('Firebase is not configured.')
  return doc(db, 'users', uid)
}

export async function loadAccount(user: User) {
  const profileSnapshot = await getDoc(profileRef(user.uid))
  const orderSnapshot = await getDocs(collection(profileRef(user.uid), 'orders'))
  const profile = profileSnapshot.data()
  const orders = orderSnapshot.docs
    .map((item) => item.data() as Order)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  await setDoc(profileRef(user.uid), {
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    updatedAt: new Date().toISOString(),
  }, { merge: true })

  return {
    cart: (profile?.cart ?? []) as CartLine[],
    orders,
  }
}

export async function saveAccountCart(uid: string, cart: CartLine[]) {
  await setDoc(profileRef(uid), { cart }, { merge: true })
}

export async function saveAccountOrder(uid: string, order: Order) {
  await setDoc(doc(collection(profileRef(uid), 'orders'), order.id), order)
}
