// Single source of truth for the Snackshop catalog.
//
// Both the storefront page (client) and the server-side checkout routes
// import this list. The server uses it to recompute prices from product
// ids so a tampered client payload can't change what a member is charged
// on the one-click path — the client only ever sends ids + quantities.
//
// Pure data only: no server-only imports, safe in both environments.

export type SnackCategory = 'beverages' | 'snacks' | 'meals' | 'supplies';

export interface SnackProduct {
  id: string;
  name: string;
  price: number; // dollars
  category: SnackCategory;
  image?: string;
}

export const SNACK_PRODUCTS: SnackProduct[] = [
  // Beverages
  { id: '1', name: 'Celsius Energy Drink', price: 2.5, category: 'beverages', image: '/images/snackshop/drinks/celsius.avif' },
  { id: '2', name: 'Chocolate Milk', price: 3.0, category: 'beverages', image: '/images/snackshop/drinks/chocolate-milk.webp' },
  { id: '3', name: 'IZZE Sparkling Juice', price: 2.25, category: 'beverages', image: '/images/snackshop/drinks/izze.avif' },
  { id: '4', name: 'Naked Smoothie', price: 3.5, category: 'beverages', image: '/images/snackshop/drinks/naked.avif' },
  { id: '5', name: 'Premium Soda', price: 2.0, category: 'beverages', image: '/images/snackshop/drinks/soda.avif' },
  { id: '6', name: 'Herbal Tea', price: 1.5, category: 'beverages', image: '/images/snackshop/drinks/tea.avif' },
  { id: '7', name: 'Spring Water', price: 3.0, category: 'beverages', image: '/images/snackshop/drinks/Water.webp' },
  // Snacks
  { id: '8', name: 'CLIF Energy Bar', price: 2.75, category: 'snacks', image: '/images/snackshop/snacks/cliff.avif' },
  { id: '9', name: 'KIND Nut Bar', price: 2.5, category: 'snacks', image: '/images/snackshop/snacks/kind.avif' },
  { id: '10', name: 'Nature Valley Granola Bar', price: 1.75, category: 'snacks', image: '/images/snackshop/snacks/nature-valley.avif' },
  { id: '11', name: 'Trail Mix', price: 3.25, category: 'snacks', image: '/images/snackshop/snacks/trail-mix.avif' },
  // Meals
  { id: '12', name: 'Cereal Bowl', price: 3.5, category: 'meals', image: '/images/snackshop/soup/cereal.avif' },
  { id: '13', name: 'Instant Oatmeal', price: 2.75, category: 'meals', image: '/images/snackshop/soup/oatmeal.avif' },
  { id: '14', name: 'Quaker Instant Meal', price: 3.0, category: 'meals', image: '/images/snackshop/soup/quaker.avif' },
  { id: '15', name: 'Instant Ramen', price: 2.25, category: 'meals', image: '/images/snackshop/soup/ramen.avif' },
  { id: '16', name: 'Kraft Mac n Cheese Bowl', price: 2.5, category: 'meals', image: '/images/snackshop/soup/Mac n cheese.jpeg' },
];

const PRODUCTS_BY_ID: Record<string, SnackProduct> = Object.fromEntries(
  SNACK_PRODUCTS.map((p) => [p.id, p]),
);

export function getSnackProduct(id: string): SnackProduct | undefined {
  return PRODUCTS_BY_ID[id];
}

export interface CartLineInput {
  id: string;
  quantity: number;
}

export interface PricedCartItem {
  id: string;
  name: string;
  price: number; // dollars, authoritative
  quantity: number;
}

export interface PricedCart {
  items: PricedCartItem[];
  totalCents: number;
}

/**
 * Recompute a cart from authoritative catalog prices. Accepts the raw cart
 * the client sends (it may include name/price fields, which are ignored)
 * and returns server-trusted line items + total in cents.
 *
 * Throws if the cart is empty, a product id is unknown, or a quantity is
 * not a positive integer — the caller should surface a 400.
 */
export function priceCart(rawItems: Array<{ id?: unknown; quantity?: unknown }>): PricedCart {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const items: PricedCartItem[] = [];
  let totalCents = 0;

  for (const raw of rawItems) {
    const id = String(raw?.id ?? '');
    const product = getSnackProduct(id);
    if (!product) {
      throw new Error(`Unknown product: ${id || '(missing id)'}`);
    }
    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new Error(`Invalid quantity for ${product.name}`);
    }
    const lineCents = Math.round(product.price * 100) * quantity;
    totalCents += lineCents;
    items.push({ id: product.id, name: product.name, price: product.price, quantity });
  }

  return { items, totalCents };
}
