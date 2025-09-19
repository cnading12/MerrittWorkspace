import { supabase } from './supabase';

// Database Types for Snackshop
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'beverages' | 'snacks' | 'meals' | 'supplies';
  image_url?: string;
  in_stock: boolean;
  stock_quantity: number;
  sku?: string;
  cost_price?: number;
  profit_margin?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  office_number: string;
  total_amount: number;
  payment_method: 'card' | 'account_credit';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending_payment' | 'paid' | 'preparing' | 'delivered' | 'cancelled';
  delivery_notes?: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  reference_id?: string; // Order ID or other reference
  created_by?: string;
  created_at: string;
}

// Snackshop API Functions
export const snackshopAPI = {
  // Products
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category, name');
    
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    return data || [];
  },

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
    
    return data;
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching products by category:', error);
      throw new Error(`Failed to fetch products by category: ${error.message}`);
    }
    
    return data || [];
  },

  async updateProductStock(productId: string, quantityChange: number): Promise<Product> {
    // First get the current product
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newQuantity = Math.max(0, product.stock_quantity + quantityChange);
    const newInStock = newQuantity > 0;

    // Update the product
    const { data, error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: newQuantity,
        in_stock: newInStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product stock:', error);
      throw new Error(`Failed to update product stock: ${error.message}`);
    }

    // Record stock movement
    await this.recordStockMovement({
      product_id: productId,
      movement_type: quantityChange > 0 ? 'in' : 'out',
      quantity_change: Math.abs(quantityChange),
      previous_quantity: product.stock_quantity,
      new_quantity: newQuantity,
      reason: quantityChange > 0 ? 'Stock replenishment' : 'Product sale'
    });
    
    return data;
  },

  // Orders
  async createOrder(orderData: Omit<Order, 'id' | 'order_number'>): Promise<Order> {
    // Generate order number
    const orderNumber = `MWS${Date.now().toString().slice(-8)}`;
    
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        ...orderData,
        order_number: orderNumber
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
    
    return data;
  },

  async createOrderItems(items: Omit<OrderItem, 'id' | 'created_at'>[]): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .insert(items)
      .select();
    
    if (error) {
      console.error('Error creating order items:', error);
      throw new Error(`Failed to create order items: ${error.message}`);
    }
    
    return data || [];
  },

  async getOrder(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
    
    return data;
  },

  async getOrdersByEmail(email: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('customer_email', email)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders by email:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    
    return data || [];
  },

  async updateOrderStatus(
    id: string, 
    status: Order['status'], 
    paymentStatus?: Order['payment_status']
  ): Promise<Order> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (paymentStatus) updateData.payment_status = paymentStatus;
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating order status:', error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }
    
    return data;
  },

  async getOrdersForToday(): Promise<Order[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching today\'s orders:', error);
      throw new Error(`Failed to fetch today's orders: ${error.message}`);
    }
    
    return data || [];
  },

  // Stock Management
  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<StockMovement> {
    const { data, error } = await supabase
      .from('stock_movements')
      .insert([{
        ...movement,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error recording stock movement:', error);
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }
    
    return data;
  },

  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching stock movements:', error);
      throw new Error(`Failed to fetch stock movements: ${error.message}`);
    }
    
    return data || [];
  },

  // Analytics
  async getDailySales(date?: string): Promise<{
    total_revenue: number;
    total_orders: number;
    items_sold: number;
    top_products: Array<{ product_name: string; quantity: number; revenue: number }>;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      // Get orders for the date
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          order_items (
            product_name,
            quantity,
            total_price
          )
        `)
        .gte('created_at', `${targetDate}T00:00:00Z`)
        .lt('created_at', `${targetDate}T23:59:59Z`)
        .in('status', ['paid', 'preparing', 'delivered']);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return {
          total_revenue: 0,
          total_orders: 0,
          items_sold: 0,
          top_products: []
        };
      }

      // Calculate metrics
      const total_revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const total_orders = orders.length;
      
      // Flatten all order items
      const allItems = orders.flatMap(order => order.order_items || []);
      const items_sold = allItems.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate top products
      const productStats = allItems.reduce((acc, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { quantity: 0, revenue: 0 };
        }
        acc[item.product_name].quantity += item.quantity;
        acc[item.product_name].revenue += item.total_price;
        return acc;
      }, {} as Record<string, { quantity: number; revenue: number }>);

      const top_products = Object.entries(productStats)
        .map(([product_name, stats]) => ({
          product_name,
          quantity: stats.quantity,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return {
        total_revenue,
        total_orders,
        items_sold,
        top_products
      };

    } catch (error) {
      console.error('Error getting daily sales:', error);
      throw new Error(`Failed to get daily sales: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getLowStockProducts(threshold: number = 5): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .lte('stock_quantity', threshold)
      .order('stock_quantity');
    
    if (error) {
      console.error('Error fetching low stock products:', error);
      throw new Error(`Failed to fetch low stock products: ${error.message}`);
    }
    
    return data || [];
  }
};

// Utility Functions
export const formatOrderNumber = (orderNumber: string): string => {
  return orderNumber.replace(/(.{3})/g, '$1-').slice(0, -1);
};

export const calculateOrderTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + item.total_price, 0);
};

export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

export const getOrderStatusColor = (status: Order['status']): string => {
  switch (status) {
    case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
    case 'paid': return 'bg-blue-100 text-blue-800';
    case 'preparing': return 'bg-orange-100 text-orange-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPaymentStatusColor = (status: Order['payment_status']): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'paid': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'refunded': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};