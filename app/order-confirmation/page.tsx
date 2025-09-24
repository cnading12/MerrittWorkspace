// Create this file at: app/order-confirmation/page.tsx

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ShoppingCart, Mail, Clock, MapPin, CreditCard, Loader2 } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface OrderDetails {
    order_id: string;
    total: number;
    customer_name: string;
    customer_email: string;
    office_number: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    notes?: string;
    payment_status: string;
    timestamp: string;
}

function OrderConfirmationContent() {
    const searchParams = useSearchParams();
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
            setError('No payment session found');
            setLoading(false);
            return;
        }

        // Fetch payment details from Stripe
        const fetchPaymentDetails = async () => {
            try {
                console.log('🔍 Fetching payment details for session:', sessionId);
                
                const response = await fetch(`/api/payment-success?session_id=${sessionId}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to fetch payment details');
                }

                console.log('✅ Payment details received:', result);
                setOrderDetails(result.payment_details);
                
            } catch (err: any) {
                console.error('❌ Error fetching payment details:', err);
                setError(err.message || 'Failed to load payment details');
            } finally {
                setLoading(false);
            }
        };

        fetchPaymentDetails();
    }, [searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Processing your payment...</p>
                </div>
            </div>
        );
    }

    if (error || !orderDetails) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingCart className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Error</h1>
                        <p className="text-gray-600 mb-8">
                            {error || 'We couldn\'t process your payment. Please try again or contact support.'}
                        </p>
                        <div className="space-x-4">
                            <Link
                                href="/member-resources/snackshop"
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                            >
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Try Again
                            </Link>
                            <a
                                href="mailto:snackshop@merrittworkspace.net"
                                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition"
                            >
                                <Mail className="w-5 h-5 mr-2" />
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const formattedTotal = `$${orderDetails.total.toFixed(2)}`;
    const totalItems = orderDetails.items.reduce((sum, item) => sum + item.quantity, 0);
    const formattedTime = new Date(orderDetails.timestamp).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="min-h-screen bg-gray-50 pt-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Success Header */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
                    <p className="text-xl text-gray-600">
                        Thank you {orderDetails.customer_name}! Your payment has been processed and your items are ready for pickup.
                    </p>
                </div>

                {/* Payment Details Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
                        <div className="flex items-center justify-between text-white">
                            <div>
                                <h2 className="text-2xl font-bold">Order #{orderDetails.order_id}</h2>
                                <p className="opacity-90">{formattedTime}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{formattedTotal}</p>
                                <p className="opacity-90">Paid Successfully</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Next Steps */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <Clock className="w-6 h-6 text-green-600 mr-2" />
                                    What's Next?
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-green-600 text-sm font-bold">1</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Head to the Kitchen</p>
                                            <p className="text-gray-600 text-sm">Your paid items are ready for pickup in the kitchen area.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-green-600 text-sm font-bold">2</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Collect Your Items</p>
                                            <p className="text-gray-600 text-sm">Take the items you've paid for from the kitchen.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-green-600 text-sm font-bold">3</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Enjoy!</p>
                                            <p className="text-gray-600 text-sm">Your payment is complete - enjoy your snacks!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Confirmation */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <CreditCard className="w-6 h-6 text-green-600 mr-2" />
                                    Payment Confirmed
                                </h3>
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-green-700">Status:</span>
                                            <span className="font-semibold text-green-800">Paid</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-green-700">Amount:</span>
                                            <span className="font-semibold text-green-800">{formattedTotal}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-green-700">Items:</span>
                                            <span className="font-semibold text-green-800">{totalItems} items</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-green-700">Pickup:</span>
                                            <span className="font-semibold text-green-800">{orderDetails.office_number}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <ShoppingCart className="w-6 h-6 text-green-600 mr-2" />
                                Your Items
                            </h3>
                            <div className="grid gap-3">
                                {orderDetails.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center">
                                            <span className="font-medium text-gray-900">{item.name}</span>
                                            {item.quantity > 1 && (
                                                <span className="ml-2 text-sm text-gray-600">x{item.quantity}</span>
                                            )}
                                        </div>
                                        <span className="font-semibold text-gray-900">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Email Confirmation */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <div className="flex items-center space-x-3">
                                <Mail className="w-6 h-6 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Email Confirmation</p>
                                    <p className="text-gray-600 text-sm">
                                        A receipt and confirmation email has been sent to {orderDetails.customer_email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Info */}
                <div className="bg-blue-50 rounded-lg p-6 mb-8 border border-blue-200">
                    <div className="flex items-start space-x-3">
                        <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-2">Kitchen Location</h4>
                            <p className="text-blue-800">
                                Your items are available for pickup in the kitchen on the main floor. 
                                If you need help finding it, ask any team member!
                            </p>
                            <p className="text-blue-700 text-sm mt-2">
                                📍 Merritt Workspace • 2246 Irving Street, Denver, CO 80211
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="text-center space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                    <Link
                        href="/member-resources/snackshop"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition w-full sm:w-auto justify-center"
                    >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Order More Items
                    </Link>
                    <Link
                        href="/member-resources"
                        className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition w-full sm:w-auto justify-center"
                    >
                        Back to Member Resources
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default function OrderConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading order details...</p>
                </div>
            </div>
        }>
            <OrderConfirmationContent />
        </Suspense>
    );
}