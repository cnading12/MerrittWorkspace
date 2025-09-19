"use client";

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Coffee, Cookie, Zap, Filter, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Footer from '@/components/Footer';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'beverages' | 'snacks' | 'meals' | 'supplies';
  image_url: string;
  in_stock: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface OrderForm {
  customer_name: string;
  customer_email: string;
  office_number: string;
  delivery_notes: string;
  payment_method: 'card' | 'account_credit';
}

export default function SnackshopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [orderForm, setOrderForm] = useState<OrderForm>({
    customer_name: '',
    customer_email: '',
    office_number: '',
    delivery_notes: '',
    payment_method: 'card'
  });

  useEffect(() => {
    loadProducts();
    loadCartFromStorage();
  }, []);

  useEffect(() => {
    saveCartToStorage();
  }, [cart]);

  const loadProducts = async () => {
    try {
      setError(null);
      // In a real implementation, this would fetch from your Supabase products table
      // For now, using mock data that represents typical coworking snackshop items
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Premium Coffee Blend',
          description: 'Fresh ground coffee from local Denver roasters',
          price: 2.50,
          category: 'beverages',
          image_url: '/images/coffee.jpg',
          in_stock: true,
          stock_quantity: 25,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Green Tea',
          description: 'Organic green tea bags',
          price: 1.75,
          category: 'beverages',
          image_url: '/images/green-tea.jpg',
          in_stock: true,
          stock_quantity: 20,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Energy Drink',
          description: 'Natural energy boost for productive afternoons',
          price: 3.00,
          category: 'beverages',
          image_url: '/images/energy-drink.jpg',
          in_stock: true,
          stock_quantity: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Mixed Nuts',
          description: 'Healthy protein-packed snack mix',
          price: 4.50,
          category: 'snacks',
          image_url: '/images/nuts.jpg',
          in_stock: true,
          stock_quantity: 12,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Protein Bar',
          description: 'Chocolate chip protein bar - perfect for pre/post workout',
          price: 3.25,
          category: 'snacks',
          image_url: '/images/protein-bar.jpg',
          in_stock: true,
          stock_quantity: 18,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '6',
          name: 'Fresh Bagel with Cream Cheese',
          description: 'Everything bagel with premium cream cheese',
          price: 5.00,
          category: 'meals',
          image_url: '/images/bagel.jpg',
          in_stock: true,
          stock_quantity: 8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '7',
          name: 'Greek Yogurt Parfait',
          description: 'Greek yogurt with granola and fresh berries',
          price: 6.50,
          category: 'meals',
          image_url: '/images/yogurt-parfait.jpg',
          in_stock: true,
          stock_quantity: 6,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '8',
          name: 'Office Supplies Kit',
          description: 'Pens, sticky notes, and paper clips',
          price: 12.00,
          category: 'supplies',
          image_url: '/images/office-supplies.jpg',
          in_stock: true,
          stock_quantity: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromStorage = () => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('merritt-snackshop-cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error loading cart from storage:', error);
        }
      }
    }
  };

  const saveCartToStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('merritt-snackshop-cart', JSON.stringify(cart));
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setError(`Only ${product.stock_quantity} ${product.name} available in stock`);
        setTimeout(() => setError(null), 3000);
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock_quantity) {
      setError(`Only ${product.stock_quantity} ${product.name} available in stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && product.in_stock;
  });

  const categories = [
    { value: 'all', label: 'All Items', icon: ShoppingCart },
    { value: 'beverages', label: 'Beverages', icon: Coffee },
    { value: 'snacks', label: 'Snacks', icon: Cookie },
    { value: 'meals', label: 'Meals', icon: Coffee },
    { value: 'supplies', label: 'Supplies', icon: Zap }
  ];

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // In production, this would integrate with Supabase and payment processing
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        })),
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        office_number: orderForm.office_number,
        delivery_notes: orderForm.delivery_notes,
        payment_method: orderForm.payment_method,
        total_amount: getCartTotal(),
        status: 'pending'
      };

      // Mock API call - replace with actual implementation
      console.log('Submitting order:', orderData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear cart and show success
      setCart([]);
      setSuccess('Order placed successfully! You will receive a confirmation email shortly.');
      setShowCheckout(false);
      
      // Reset form
      setOrderForm({
        customer_name: '',
        customer_email: '',
        office_number: '',
        delivery_notes: '',
        payment_method: 'card'
      });

    } catch (error) {
      console.error('Error submitting order:', error);
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'beverages': return <Coffee className="w-4 h-4" />;
      case 'snacks': return <Cookie className="w-4 h-4" />;
      case 'meals': return <Coffee className="w-4 h-4" />;
      case 'supplies': return <Zap className="w-4 h-4" />;
      default: return <ShoppingCart className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-burnt-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading snackshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Merritt Snackshop
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Fuel your productivity with fresh coffee, healthy snacks, and convenient meals. 
              Order online and we'll deliver right to your office or desk.
            </p>
            {cart.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowCheckout(true)}
                  className="bg-burnt-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-burnt-orange-700 transition flex items-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  View Cart ({getCartItemCount()} items) - ${getCartTotal().toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-4 mt-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      selectedCategory === category.value
                        ? 'bg-burnt-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {category.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500 w-full md:w-64"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                  {/* Product Image */}
                  <div className="h-48 bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {getCategoryIcon(product.category)}
                      <span className="ml-2 text-gray-600 font-medium capitalize">{product.category}</span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="bg-burnt-orange-100 text-burnt-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        {product.stock_quantity} left
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-burnt-orange-600">
                        ${product.price.toFixed(2)}
                      </span>
                      
                      {cart.find(item => item.id === product.id) ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, cart.find(item => item.id === product.id)!.quantity - 1)}
                            className="p-1 rounded-full hover:bg-gray-100 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {cart.find(item => item.id === product.id)?.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, cart.find(item => item.id === product.id)!.quantity + 1)}
                            className="p-1 rounded-full hover:bg-gray-100 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="bg-burnt-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-burnt-orange-700 transition flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Cart Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Your Order</h3>
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded-full hover:bg-gray-200 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 rounded-full hover:bg-gray-200 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-20 text-right font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-burnt-orange-50 rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total: </span>
                    <span className="text-burnt-orange-600">${getCartTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Order Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={orderForm.customer_name}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={orderForm.customer_email}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Office/Desk Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Office 12 or Desk A4"
                      value={orderForm.office_number}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, office_number: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={orderForm.payment_method}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, payment_method: e.target.value as 'card' | 'account_credit' }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    >
                      <option value="card">Credit Card</option>
                      <option value="account_credit">Account Credit</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Notes</label>
                  <textarea
                    rows={3}
                    value={orderForm.delivery_notes}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, delivery_notes: e.target.value }))}
                    placeholder="Any special delivery instructions..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-burnt-orange-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-burnt-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Placing Order...
                    </>
                  ) : (
                    `Place Order - $${getCartTotal().toFixed(2)}`
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How Snackshop Delivery Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Browse & Order</h3>
              <p className="text-gray-600">Add items to your cart and complete your order online</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Confirm Payment</h3>
              <p className="text-gray-600">Secure payment via credit card or workspace account credit</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. We Prepare</h3>
              <p className="text-gray-600">Fresh items prepared and packaged for delivery</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">4. Direct Delivery</h3>
              <p className="text-gray-600">Delivered directly to your office or desk within 15 minutes</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}