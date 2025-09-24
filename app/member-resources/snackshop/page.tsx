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
            const response = await fetch('/api/snackshop', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Debug: Log the image URLs to see what we're getting
                console.log('Products loaded from API:', data.products.map(p => ({ name: p.name, image_url: p.image_url })));
                setProducts(data.products);
            } else {
                throw new Error('Failed to load products');
            }
        } catch (error) {
            console.error('Error loading products from API:', error);
            setError('Failed to load products from API. Loading fallback data...');
            
            // Fallback to mock data with CORRECT image paths
            loadMockProducts();
        } finally {
            setLoading(false);
        }
    };

    const loadMockProducts = () => {
        // Mock products with the ORIGINAL working image paths
        const mockProducts: Product[] = [
            // Beverages
            {
                id: '1',
                name: 'Celsius Energy Drink',
                description: 'Sparkling fitness drink for energy and metabolism',
                price: 2.50,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/celsius.avif',
                in_stock: true,
                stock_quantity: 25,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Chocolate Milk',
                description: 'Rich and creamy chocolate milk',
                price: 1.75,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/chocolate-milk.avif',
                in_stock: true,
                stock_quantity: 20,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '3',
                name: 'IZZE Sparkling Juice',
                description: 'All natural sparkling fruit juice',
                price: 2.25,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/izze.avif',
                in_stock: true,
                stock_quantity: 15,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '4',
                name: 'Naked Smoothie',
                description: 'Fresh fruit and vegetable smoothie blend',
                price: 3.50,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/naked.avif',
                in_stock: true,
                stock_quantity: 12,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '5',
                name: 'Premium Soda',
                description: 'Craft soda with natural ingredients',
                price: 2.00,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/soda.avif',
                in_stock: true,
                stock_quantity: 18,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '6',
                name: 'Herbal Tea',
                description: 'Premium loose leaf herbal tea blend',
                price: 1.50,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/tea.avif',
                in_stock: true,
                stock_quantity: 30,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '7',
                name: 'Spring Water',
                description: 'Pure natural spring water',
                price: 1.25,
                category: 'beverages',
                image_url: '/images/snackshop/drinks/water.avif',
                in_stock: true,
                stock_quantity: 40,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },

            // Snacks
            {
                id: '8',
                name: 'CLIF Energy Bar',
                description: 'Organic energy bar for sustained energy',
                price: 2.75,
                category: 'snacks',
                image_url: '/images/snackshop/snacks/cliff.avif',
                in_stock: true,
                stock_quantity: 20,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '9',
                name: 'KIND Nut Bar',
                description: 'Whole nut and fruit bar, gluten-free',
                price: 2.50,
                category: 'snacks',
                image_url: '/images/snackshop/snacks/kind.avif',
                in_stock: true,
                stock_quantity: 25,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '10',
                name: 'Nature Valley Granola Bar',
                description: 'Crunchy granola bar with real ingredients',
                price: 1.75,
                category: 'snacks',
                image_url: '/images/snackshop/snacks/nature-valley.avif',
                in_stock: true,
                stock_quantity: 30,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '11',
                name: 'Trail Mix',
                description: 'Premium nut and dried fruit trail mix',
                price: 3.25,
                category: 'snacks',
                image_url: '/images/snackshop/snacks/trail-mix.avif',
                in_stock: true,
                stock_quantity: 15,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },

            // Meals (Soups)
            {
                id: '12',
                name: 'Cereal Bowl',
                description: 'Fresh cereal with your choice of milk',
                price: 3.50,
                category: 'meals',
                image_url: '/images/snackshop/soup/cereal.avif',
                in_stock: true,
                stock_quantity: 10,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '13',
                name: 'Instant Oatmeal',
                description: 'Hearty oatmeal with toppings',
                price: 2.75,
                category: 'meals',
                image_url: '/images/snackshop/soup/oatmeal.avif',
                in_stock: true,
                stock_quantity: 12,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '14',
                name: 'Quaker Instant Meal',
                description: 'Quick and nutritious instant meal',
                price: 3.00,
                category: 'meals',
                image_url: '/images/snackshop/soup/quaker.avif',
                in_stock: true,
                stock_quantity: 8,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '15',
                name: 'Instant Ramen',
                description: 'Premium instant ramen noodles',
                price: 2.25,
                category: 'meals',
                image_url: '/images/snackshop/soup/ramen.avif',
                in_stock: true,
                stock_quantity: 15,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '16',
                name: 'Sweet Corn Cup',
                description: 'Fresh sweet corn cup with butter',
                price: 2.50,
                category: 'meals',
                image_url: '/images/snackshop/soup/sweet-corn.avif',
                in_stock: true,
                stock_quantity: 10,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        // Debug: Log the mock products being loaded
        console.log('Loading mock products with image paths:', mockProducts.map(p => ({ name: p.name, image_url: p.image_url })));
        setProducts(mockProducts);
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

    const handleSubmitOrder = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (cart.length === 0) {
            setError('Your cart is empty');
            return;
        }

        // Validate form
        if (!orderForm.customer_name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!orderForm.customer_email.trim()) {
            setError('Please enter your email');
            return;
        }

        if (!orderForm.office_number.trim()) {
            setError('Please enter your office/desk number');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
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
                total_amount: getCartTotal()
            };

            const response = await fetch('/api/snackshop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to place order');
            }

            if (result.success) {
                // Clear cart and show success
                setCart([]);
                setSuccess(result.message);
                setShowCheckout(false);

                // Reset form
                setOrderForm({
                    customer_name: '',
                    customer_email: '',
                    office_number: '',
                    delivery_notes: '',
                    payment_method: 'card'
                });

                // Clear success message after 10 seconds
                setTimeout(() => setSuccess(null), 10000);
            } else {
                throw new Error(result.error || 'Order failed');
            }

        } catch (error: any) {
            console.error('Error submitting order:', error);
            setError(error.message || 'Failed to place order. Please try again.');
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
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${selectedCategory === category.value
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
                                    {/* Product Image - BACK TO ORIGINAL SIMPLE APPROACH */}
                                    <div className="h-52 bg-gray-100 relative overflow-hidden">
                                        {/* Debug: Show image URL in development */}
                                        {process.env.NODE_ENV === 'development' && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate z-10">
                                                {product.image_url}
                                            </div>
                                        )}
                                        
                                        {product.image_url && product.image_url.trim() !== '' ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-contain p-3 hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                onError={(e) => {
                                                    console.log('Image failed to load:', product.image_url);
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <div className="text-center text-gray-400">
                                                    {getCategoryIcon(product.category)}
                                                    <p className="text-xs mt-2 px-2">{product.name}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <span className="bg-white/90 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                {getCategoryIcon(product.category)}
                                                <span className="capitalize">{product.category}</span>
                                            </span>
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

            {/* Rest of the component remains the same as your original... */}
            {/* Checkout Modal and other sections */}
            
            <Footer />
        </div>
    );
}