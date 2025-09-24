"use client";

import { useState } from 'react';
import { ShoppingCart, Coffee, Cookie, Zap, CheckCircle, AlertCircle, Loader2, Plus, Minus, CreditCard } from 'lucide-react';
import Footer from '@/components/Footer';
import Image from 'next/image';

interface OrderForm {
    customer_name: string;
    customer_email: string;
    office_number: string;
    notes: string;
}

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

// Static product data - no database needed
const PRODUCTS = [
    // Beverages
    { id: '1', name: 'Celsius Energy Drink', price: 2.50, category: 'beverages', image: '/images/snackshop/drinks/celsius.avif' },
    { id: '2', name: 'Chocolate Milk', price: 1.75, category: 'beverages', image: '/images/snackshop/drinks/chocolate-milk.avif' },
    { id: '3', name: 'IZZE Sparkling Juice', price: 2.25, category: 'beverages', image: '/images/snackshop/drinks/izze.avif' },
    { id: '4', name: 'Naked Smoothie', price: 3.50, category: 'beverages', image: '/images/snackshop/drinks/naked.avif' },
    { id: '5', name: 'Premium Soda', price: 2.00, category: 'beverages', image: '/images/snackshop/drinks/soda.avif' },
    { id: '6', name: 'Herbal Tea', price: 1.50, category: 'beverages', image: '/images/snackshop/drinks/tea.avif' },
    { id: '7', name: 'Spring Water', price: 1.25, category: 'beverages', image: '/images/snackshop/drinks/water.avif' },
    // Snacks
    { id: '8', name: 'CLIF Energy Bar', price: 2.75, category: 'snacks', image: '/images/snackshop/snacks/cliff.avif' },
    { id: '9', name: 'KIND Nut Bar', price: 2.50, category: 'snacks', image: '/images/snackshop/snacks/kind.avif' },
    { id: '10', name: 'Nature Valley Granola Bar', price: 1.75, category: 'snacks', image: '/images/snackshop/snacks/nature-valley.avif' },
    { id: '11', name: 'Trail Mix', price: 3.25, category: 'snacks', image: '/images/snackshop/snacks/trail-mix.avif' },
    // Meals
    { id: '12', name: 'Cereal Bowl', price: 3.50, category: 'meals', image: '/images/snackshop/soup/cereal.avif' },
    { id: '13', name: 'Instant Oatmeal', price: 2.75, category: 'meals', image: '/images/snackshop/soup/oatmeal.avif' },
    { id: '14', name: 'Quaker Instant Meal', price: 3.00, category: 'meals', image: '/images/snackshop/soup/quaker.avif' },
    { id: '15', name: 'Instant Ramen', price: 2.25, category: 'meals', image: '/images/snackshop/soup/ramen.avif' },
    { id: '16', name: 'Sweet Corn Cup', price: 2.50, category: 'meals', image: '/images/snackshop/soup/sweet-corn.avif' }
];

const CATEGORIES = [
    { value: 'all', label: 'All Items', icon: ShoppingCart },
    { value: 'beverages', label: 'Beverages', icon: Coffee },
    { value: 'snacks', label: 'Snacks', icon: Cookie },
    { value: 'meals', label: 'Meals', icon: Coffee },
];

export default function SimpleSnackshopPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [orderForm, setOrderForm] = useState<OrderForm>({
        customer_name: '',
        customer_email: '',
        office_number: '',
        notes: ''
    });

    const filteredProducts = PRODUCTS.filter(product =>
        selectedCategory === 'all' || product.category === selectedCategory
    );

    const addToCart = (productId: string) => {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        setCart(prev => {
            const existingItem = prev.find(item => item.id === productId);
            if (existingItem) {
                return prev.map(item =>
                    item.id === productId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prev, {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                }];
            }
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const existingItem = prev.find(item => item.id === productId);
            if (existingItem && existingItem.quantity > 1) {
                return prev.map(item =>
                    item.id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            } else {
                return prev.filter(item => item.id !== productId);
            }
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart(prev => prev.filter(item => item.id !== productId));
        } else {
            setCart(prev => {
                const existingItem = prev.find(item => item.id === productId);
                if (existingItem) {
                    return prev.map(item =>
                        item.id === productId
                            ? { ...item, quantity }
                            : item
                    );
                } else {
                    const product = PRODUCTS.find(p => p.id === productId);
                    if (product) {
                        return [...prev, {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            quantity
                        }];
                    }
                    return prev;
                }
            });
        }
    };

    const getItemQuantity = (productId: string): number => {
        const item = cart.find(item => item.id === productId);
        return item ? item.quantity : 0;
    };

    const calculateTotal = (): number => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getCartItemsString = (): string => {
        return cart.map(item => 
            item.quantity > 1 
                ? `${item.name} (x${item.quantity})`
                : item.name
        ).join(', ');
    };

    const getTotalItemCount = (): number => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    const handlePayWithCard = async () => {
        if (cart.length === 0) {
            setError('Please select at least one item');
            return;
        }

        if (!orderForm.customer_name.trim() || !orderForm.customer_email.trim() || !orderForm.office_number.trim()) {
            setError('Please fill in all required fields before proceeding to payment');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            console.log('💳 Initiating card payment...');

            const orderData = {
                cart_items: cart,
                customer_name: orderForm.customer_name.trim(),
                customer_email: orderForm.customer_email.trim().toLowerCase(),
                office_number: orderForm.office_number.trim(),
                notes: orderForm.notes.trim(),
                total_amount: calculateTotal()
            };

            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create payment session');
            }

            console.log('✅ Stripe session created, redirecting...');
            
            // Redirect to Stripe Checkout
            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error: any) {
            console.error('❌ Payment initiation error:', error);
            setError(error.message || 'Failed to initialize payment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'beverages': return <Coffee className="w-4 h-4" />;
            case 'snacks': return <Cookie className="w-4 h-4" />;
            case 'meals': return <Coffee className="w-4 h-4" />;
            default: return <ShoppingCart className="w-4 h-4" />;
        }
    };

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
                            Select your items and quantities from our kitchen. Secure payment processing with immediate pickup!
                        </p>
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
                        <div className="text-green-700 whitespace-pre-line">{success}</div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Products Section */}
                    <div className="lg:col-span-2">
                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {CATEGORIES.map(category => {
                                const IconComponent = category.icon;
                                return (
                                    <button
                                        key={category.value}
                                        onClick={() => setSelectedCategory(category.value)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${selectedCategory === category.value
                                                ? 'bg-burnt-orange-600 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        {category.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProducts.map(product => {
                                const quantity = getItemQuantity(product.id);
                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-white rounded-lg shadow-sm border overflow-hidden transition ${quantity > 0
                                                ? 'border-burnt-orange-500 ring-2 ring-burnt-orange-200'
                                                : 'border-gray-200 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="h-32 bg-gray-100 relative overflow-hidden">
                                            {product.image && (
                                                <Image
                                                    src={product.image}
                                                    alt={product.name}
                                                    fill
                                                    className="object-contain p-2"
                                                    sizes="(max-width: 768px) 50vw, 25vw"
                                                />
                                            )}
                                            <div className="absolute top-2 left-2">
                                                <span className="bg-white/90 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                    {getCategoryIcon(product.category)}
                                                </span>
                                            </div>
                                            {quantity > 0 && (
                                                <div className="absolute top-2 right-2">
                                                    <span className="bg-burnt-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                                                        {quantity}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                                            <p className="text-lg font-bold text-burnt-orange-600 mb-3">${product.price.toFixed(2)}</p>
                                            
                                            {/* Quantity Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => removeFromCart(product.id)}
                                                        disabled={quantity === 0}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-semibold">{quantity}</span>
                                                    <button
                                                        onClick={() => addToCart(product.id)}
                                                        className="w-8 h-8 rounded-full bg-burnt-orange-600 text-white flex items-center justify-center hover:bg-burnt-orange-700"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {quantity > 0 && (
                                                    <span className="text-sm font-medium text-burnt-orange-600">
                                                        ${(product.price * quantity).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Form Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Your Purchase</h2>

                            {/* Cart Items with Quantities */}
                            {cart.length > 0 && (
                                <div className="mb-6 p-4 bg-burnt-orange-50 rounded-lg">
                                    <h3 className="font-medium text-burnt-orange-900 mb-3">Your Cart:</h3>
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center py-1 text-sm text-burnt-orange-800">
                                            <span>{item.name} {item.quantity > 1 && `(x${item.quantity})`}</span>
                                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-burnt-orange-200 mt-2 pt-2">
                                        <div className="flex justify-between items-center font-bold text-burnt-orange-900">
                                            <span>Total:</span>
                                            <span className="text-lg">${calculateTotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={orderForm.customer_name}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={orderForm.customer_email}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                                        placeholder="your.email@company.com"
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
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={orderForm.notes}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Any notes or requests..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
                                    />
                                </div>

                                {/* Payment Options */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                                    <h4 className="font-semibold text-blue-800 mb-3">💳 Pay Now</h4>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => handlePayWithCard()}
                                            disabled={submitting || cart.length === 0}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Pay Securely - {cart.length > 0 ? `${calculateTotal().toFixed(2)}` : '$0.00'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}