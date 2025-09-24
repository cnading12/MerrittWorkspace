// Create this file at: app/order-confirmation/page.tsx

"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ShoppingCart, Mail, Clock, MapPin, CreditCard } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface OrderDetails {
    order_id: string;
    total: string;
    email_sent: boolean;
    timestamp: string;
    customer_name?: string;
    items?: string;
}

export default function OrderConfirmationPage() {
    const searchParams = useSearchParams();
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get order details from URL parameters
        const orderId = searchParams.get('order_id');
        const total = searchParams.get('total');
        const emailSent = searchParams.get('email_sent') === 'true';
        const timestamp = searchParams.get('timestamp');
        const customerName = searchParams.get('customer_name');
        const items = searchParams.get('items');

        if (orderId && total) {
            setOrderDetails({
                order_id: orderId,
                total,
                email_sent: emailSent,
                timestamp: timestamp || new Date().toISOString(),
                customer_name: customerName || undefined,
                items: items || undefined
            });
        }

        setLoading(false);
    }, [searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burnt-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading confirmation...</p>
                </div>
            </div>
        );
    }

    if (!orderDetails) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingCart className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
                        <p className="text-gray-600 mb-8">
                            We couldn't find the details for this order. Please check your email for confirmation details.
                        </p>
                        <Link
                            href="/member-resources/snackshop"
                            className="inline-flex items-center px-6 py-3 bg-burnt-orange-600 text-white font-semibold rounded-lg hover:bg-burnt-orange-700 transition"
                        >
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            Back to Snackshop
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

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
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
                    <p className="text-xl text-gray-600">
                        {orderDetails.customer_name ? `Thank you ${orderDetails.customer_name}! ` : 'Thank you! '}
                        Your snackshop order has been processed successfully.
                    </p>
                </div>

                {/* Order Details Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-burnt-orange-500 to-burnt-orange-600 px-8 py-6">
                        <div className="flex items-center justify-between text-white">
                            <div>
                                <h2 className="text-2xl font-bold">Order #{orderDetails.order_id}</h2>
                                <p className="opacity-90">{formattedTime}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{orderDetails.total}</p>
                                <p className="opacity-90">Total Amount</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Next Steps */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <Clock className="w-6 h-6 text-burnt-orange-600 mr-2" />
                                    What's Next?
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-burnt-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-burnt-orange-600 text-sm font-bold">1</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Head to the Kitchen</p>
                                            <p className="text-gray-600 text-sm">Your items are ready to be picked up from the kitchen area.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-burnt-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-burnt-orange-600 text-sm font-bold">2</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Take Your Items</p>
                                            <p className="text-gray-600 text-sm">Collect the items you ordered from the kitchen.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-burnt-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-burnt-orange-600 text-sm font-bold">3</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Complete Payment</p>
                                            <p className="text-gray-600 text-sm">Pay using the honor system methods below.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <CreditCard className="w-6 h-6 text-burnt-orange-600 mr-2" />
                                    Payment Options
                                </h3>
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                    <h4 className="font-semibold text-green-800 mb-3">🏆 Honor System Payment</h4>
                                    <div className="space-y-2 text-sm text-green-700">
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                                            <span>Cash payment box in the kitchen</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                                            <span>Venmo: @MerrittWorkspace</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                                            <span>Online payment (coming soon)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        {orderDetails.items && (
                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <ShoppingCart className="w-6 h-6 text-burnt-orange-600 mr-2" />
                                    Your Items
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-800 font-medium">{orderDetails.items}</p>
                                </div>
                            </div>
                        )}

                        {/* Email Status */}
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <div className="flex items-center space-x-3">
                                <Mail className="w-6 h-6 text-burnt-orange-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Email Confirmation</p>
                                    <p className="text-gray-600 text-sm">
                                        {orderDetails.email_sent
                                            ? "A confirmation email has been sent to you with all the details."
                                            : "We had an issue sending your confirmation email, but your order was processed successfully."
                                        }
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
                                The kitchen is located on the main floor of the building. 
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
                        className="inline-flex items-center px-6 py-3 bg-burnt-orange-600 text-white font-semibold rounded-lg hover:bg-burnt-orange-700 transition w-full sm:w-auto justify-center"
                    >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Order More Items
                    </Link>
                    <Link
                        href="/member-resources"
                        className="inline-flex items-center px-6 py-3 bg-white text-burnt-orange-600 font-semibold rounded-lg border-2 border-burnt-orange-600 hover:bg-burnt-orange-50 transition w-full sm:w-auto justify-center"
                    >
                        Back to Member Resources
                    </Link>
                </div>

                {/* Help Section */}
                <div className="text-center mt-12 p-6 bg-gray-100 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                    <p className="text-gray-600 mb-4">
                        If you have any questions about your order or can't find your items, 
                        please don't hesitate to reach out.
                    </p>
                    <div className="text-sm text-gray-700">
                        <p>📧 snackshop@merrittworkspace.net</p>
                        <p>📞 (303) 555-0123</p>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}