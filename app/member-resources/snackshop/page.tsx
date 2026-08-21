"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Coffee, Cookie, Zap, CheckCircle, AlertCircle, Loader2, Plus, Minus, CreditCard, User, Sparkles } from 'lucide-react';
import Footer from '@/components/Footer';
import Image from 'next/image';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import { supabase } from '@/lib/supabase';
import { SNACK_PRODUCTS } from '@/lib/snackshop/products';

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

// Lightweight view of the signed-in member, loaded from /api/portal/me.
interface MemberLite {
    first_name: string | null;
    last_name: string | null;
    email: string;
    office_number: string | null;
    desk_number: string | null;
}

// Product catalog comes from the shared module so the prices the storefront
// shows always match what the server charges. See lib/snackshop/products.ts.
const PRODUCTS = SNACK_PRODUCTS;

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

    // Member context (null = guest). When signed in, name/email/office are
    // pulled from the member's profile so they never re-enter them.
    const [member, setMember] = useState<MemberLite | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const memberHasLocation = Boolean(member?.office_number || member?.desk_number);

    // On mount, detect a portal session and prefill from the member profile.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const res = await fetch('/api/portal/me', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!mounted || !data?.member) return;
                const m: MemberLite = data.member;
                setMember(m);
                setToken(session.access_token);
                setOrderForm(prev => ({
                    ...prev,
                    customer_name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
                    customer_email: m.email ?? '',
                    office_number: m.office_number || m.desk_number || '',
                }));
            } catch {
                // Treat any failure as a guest — the guest flow always works.
            }
        })();
        return () => { mounted = false; };
    }, []);

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

    // Entry point for the "Pay" button. Members charge their saved card in one
    // click; guests use the hosted Stripe Checkout exactly as before.
    const handlePay = () => {
        if (member) {
            handleMemberPay();
        } else {
            startHostedCheckout(false);
        }
    };

    // One-click checkout for signed-in members. Falls back to hosted Checkout
    // when the member has no saved card yet or the bank requires auth.
    const handleMemberPay = async () => {
        if (cart.length === 0) {
            setError('Please select at least one item');
            return;
        }
        if (!memberHasLocation && !orderForm.office_number.trim()) {
            setError('Please enter your office or desk number for pickup.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/snackshop/member-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cart_items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
                    office_number: orderForm.office_number.trim(),
                    notes: orderForm.notes.trim(),
                }),
            });

            const result = await response.json();

            // No card on file yet, or the bank wants authentication: send them
            // to hosted Checkout, which saves the card for next time.
            if (result?.requires_setup || result?.requires_action) {
                await startHostedCheckout(true);
                return;
            }

            if (!response.ok) {
                throw new Error(result?.error || 'Payment failed');
            }

            if (result?.success) {
                const total = (result.total_cents / 100).toFixed(2);
                setSuccess(
                    `Paid $${total} with your card on file. Order ${result.order_id} is ready for pickup in the kitchen — a receipt is on its way to your email.`
                );
                setCart([]);
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error: any) {
            console.error('❌ Member payment error:', error);
            setError(error.message || 'Failed to process payment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Hosted Stripe Checkout. Used for guests (withAuth=false) and as the
    // member fallback (withAuth=true) — the auth header lets the server attach
    // the order to the member's Stripe customer and save the card.
    const startHostedCheckout = async (withAuth: boolean) => {
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

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (withAuth && token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers,
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
        <div className="min-h-screen bg-bone">
            {/* No pt-20: the hero starts at y=0 under the transparent navbar.
                This route is listed in HERO_ROUTES in Navbar.tsx. */}
            <PageHero
                src="/images/amenities/kitchen-counter.webp"
                alt="The snackshop case and kitchen counter at Merritt Workspace, a coworking space in Sloan's Lake, Denver"
                blurDataURL={BLUR['amenities/kitchen-counter']}
                objectPosition="50% 45%"
                eyebrow="Member resources"
                title={<>The Merritt Snackshop.</>}
                lead="Snacks, drinks and quick meals in the kitchen, a few steps from your desk. Pick what you want, pay here, take it with you."
            />

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 mx-4 mt-4">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 p-4 mx-4 mt-4">
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
                                        className={`flex items-center gap-2 px-4 py-2  font-medium transition ${selectedCategory === category.value
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
                                        className={`bg-bone   border overflow-hidden transition ${quantity > 0
                                                ? 'border-burnt-orange-500 ring-2 ring-burnt-orange-200'
                                                : 'border-gray-200 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="h-32 bg-linen relative overflow-hidden">
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
                                                <span className="bg-bone/90 text-ink-60 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                    {getCategoryIcon(product.category)}
                                                </span>
                                            </div>
                                            {quantity > 0 && (
                                                <div className="absolute top-2 right-2">
                                                    <span className="bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                                                        {quantity}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <h3 className="font-display font-semibold text-ink mb-1">{product.name}</h3>
                                            <p className="text-lg font-bold text-accent-deep mb-3">${product.price.toFixed(2)}</p>
                                            
                                            {/* Quantity Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => removeFromCart(product.id)}
                                                        disabled={quantity === 0}
                                                        className="w-8 h-8 rounded-full border border-clay flex items-center justify-center hover:bg-linen disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-semibold">{quantity}</span>
                                                    <button
                                                        onClick={() => addToCart(product.id)}
                                                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-deep"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {quantity > 0 && (
                                                    <span className="text-sm font-medium text-accent-deep">
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
                        <div className="bg-bone border border-clay p-6 sticky top-24">
                            <h2 className="font-display text-xl font-semibold text-ink mb-4">Complete Your Purchase</h2>

                            {/* Guests: nudge them toward the portal (goal: migrate members online). */}
                            {!member && (
                                <div className="mb-6 p-4 border border-clay bg-gradient-to-br from-burnt-orange-50 to-white">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-4 h-4 text-accent-deep" />
                                        <span className="font-semibold text-ink">Members check out in one click</span>
                                    </div>
                                    <p className="text-sm text-ink-60 mb-3">
                                        It&apos;s where all our new members are. Pay with a card on file, skip
                                        re-typing your name and office, avoid fees, and see every purchase in
                                        your portal.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href="/portal/login"
                                            className="text-sm font-medium text-accent-deep hover:text-accent-deep underline"
                                        >
                                            Member sign in
                                        </Link>
                                        <span className="text-clay">·</span>
                                        <Link
                                            href="/portal/existing-member"
                                            className="text-sm font-medium text-accent-deep hover:text-accent-deep underline"
                                        >
                                            Already a member? Move your account online
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Cart Items with Quantities */}
                            {cart.length > 0 && (
                                <div className="mb-6 p-4 bg-linen">
                                    <h3 className="font-display font-medium text-ink mb-3">Your Cart:</h3>
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center py-1 text-sm text-accent-deep">
                                            <span>{item.name} {item.quantity > 1 && `(x${item.quantity})`}</span>
                                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-clay mt-2 pt-2">
                                        <div className="flex justify-between items-center font-bold text-ink">
                                            <span>Total:</span>
                                            <span className="text-lg">${calculateTotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {member ? (
                                    <>
                                        {/* Signed-in member: identity comes from their profile,
                                            so we don't ask for it again. */}
                                        <div className="p-4 bg-linen border border-clay">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-accent-deep" />
                                                <span className="font-semibold text-ink">
                                                    {orderForm.customer_name || member.email}
                                                </span>
                                            </div>
                                            <p className="text-sm text-accent-deep">{member.email}</p>
                                            {memberHasLocation && (
                                                <p className="text-sm text-accent-deep mt-1">
                                                    Pickup: <strong>{orderForm.office_number}</strong>
                                                </p>
                                            )}
                                        </div>

                                        {/* Only ask for a location if it's missing from their profile. */}
                                        {!memberHasLocation && (
                                            <div>
                                                <label className="block text-sm font-medium text-ink-60 mb-2">Office/Desk Number *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g., Office 104 or Desk DD4"
                                                    value={orderForm.office_number}
                                                    onChange={(e) => setOrderForm(prev => ({ ...prev, office_number: e.target.value }))}
                                                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-accent focus:border-accent"
                                                />
                                                <p className="text-xs text-ink-60 mt-1">
                                                    We&apos;ll save this to your profile so you won&apos;t be asked again.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-ink-60 mb-2">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={orderForm.customer_name}
                                                onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                                className="w-full p-3 border border-clay focus:ring-2 focus:ring-accent focus:border-accent"
                                                placeholder="Enter your full name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-ink-60 mb-2">Email *</label>
                                            <input
                                                type="email"
                                                required
                                                value={orderForm.customer_email}
                                                onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                                                className="w-full p-3 border border-clay focus:ring-2 focus:ring-accent focus:border-accent"
                                                placeholder="your.email@company.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-ink-60 mb-2">Office/Desk Number *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g., Office 104 or Desk DD4"
                                                value={orderForm.office_number}
                                                onChange={(e) => setOrderForm(prev => ({ ...prev, office_number: e.target.value }))}
                                                className="w-full p-3 border border-clay focus:ring-2 focus:ring-accent focus:border-accent"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-ink-60 mb-2">Notes (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={orderForm.notes}
                                        onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Any notes or requests..."
                                        className="w-full p-3 border border-clay focus:ring-2 focus:ring-accent focus:border-accent"
                                    />
                                </div>

                                {/* Payment Options */}
                                <div className="p-4 bg-blue-50 border border-blue-200 mb-4">
                                    <h4 className="font-semibold text-blue-800 mb-3">
                                        {member ? '⚡ One-Click Checkout' : '💳 Pay Now'}
                                    </h4>
                                    {member && (
                                        <p className="text-xs text-blue-700 mb-3">
                                            Paid instantly with your card on file — no fees, nothing to re-enter.
                                            Every purchase shows up in your portal.
                                        </p>
                                    )}
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => handlePay()}
                                            disabled={submitting || cart.length === 0}
                                            className="w-full bg-blue-600 text-white py-2 px-4 font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <CreditCard className="w-4 h-4 mr-2" />
                                            )}
                                            {member ? 'Pay' : 'Pay Securely'} - {cart.length > 0 ? `$${calculateTotal().toFixed(2)}` : '$0.00'}
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