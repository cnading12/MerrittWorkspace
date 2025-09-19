import { NextRequest, NextResponse } from 'next/server';
import { snackshopAPI } from '@/lib/snackshop';
import { sendOrderConfirmationEmail } from '@/lib/resend';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const inStock = searchParams.get('in_stock');

    let products;

    if (category && category !== 'all') {
      products = await snackshopAPI.getProductsByCategory(category);
    } else {
      products = await snackshopAPI.getAllProducts();
    }

    // Filter by stock status if requested
    if (inStock === 'true') {
      products = products.filter(product => product.in_stock && product.stock_quantity > 0);
    }

    return NextResponse.json({ 
      success: true, 
      products 
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'items', 'customer_name', 'customer_email', 'office_number', 
      'total_amount', 'payment_method'
    ];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate items array
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Check stock availability for all items
    for (const item of orderData.items) {
      const product = await snackshopAPI.getProduct(item.product_id);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found` },
          { status: 404 }
        );
      }

      if (!product.in_stock || product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}` },
          { status: 409 }
        );
      }
    }

    // Create the order
    const order = await snackshopAPI.createOrder({
      ...orderData,
      status: orderData.payment_method === 'account_credit' ? 'paid' : 'pending_payment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Update stock quantities
    for (const item of orderData.items) {
      await snackshopAPI.updateProductStock(
        item.product_id, 
        -item.quantity // Decrease stock
      );
    }

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail({
        to: orderData.customer_email,
        customerName: orderData.customer_name,
        order: order,
        items: orderData.items
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the whole order if email fails
    }

    // If payment method is card, return checkout URL (in production, integrate with Stripe)
    if (orderData.payment_method === 'card') {
      // TODO: Create Stripe checkout session
      return NextResponse.json({
        success: true,
        order,
        checkout_url: `/api/snackshop/checkout/${order.id}`,
        message: 'Order created. Redirecting to payment...'
      });
    }

    // For account credit, order is automatically paid
    return NextResponse.json({
      success: true,
      order,
      message: 'Order placed successfully! Your items will be delivered within 15 minutes.'
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}