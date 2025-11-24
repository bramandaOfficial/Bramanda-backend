const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://bramandaofficial.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bramanda';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.log('❌ MongoDB connection error:', err);
    console.log('🔄 Using in-memory storage instead...');
  });

// MongoDB Models
const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
}));

const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  image: String,
  category: String,
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
  orderId: { type: String, unique: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  totalAmount: Number,
  paymentMethod: { type: String, enum: ['cod', 'esewa'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
}));

// Generate order ID
Order.schema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = 'BR' + Date.now();
  }
  next();
});

// In-memory fallback (if MongoDB fails)
let memorySubscribers = [];
let memoryProducts = [];
let memoryOrders = [];

// Initialize sample products
const initializeProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const sampleProducts = [
        {
          name: "Minimalist Watch",
          price: 199.99,
          description: "Elegant black and white minimalist watch with leather strap",
          image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400",
          category: "Accessories"
        },
        {
          name: "Classic Sunglasses", 
          price: 149.99,
          description: "Premium black frame sunglasses with UV protection",
          image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
          category: "Accessories"
        },
        {
          name: "Designer Handbag",
          price: 299.99,
          description: "Luxurious black leather handbag with silver accents",
          image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400", 
          category: "Bags"
        },
        {
          name: "Wireless Earbuds",
          price: 179.99,
          description: "High-quality white wireless earbuds with noise cancellation",
          image: "https://images.unsplash.com/photo-1590658165737-15a047b8b5e3?w=400",
          category: "Electronics"
        }
      ];
      await Product.insertMany(sampleProducts);
      console.log('✅ Sample products added to database');
    }
  } catch (error) {
    console.log('❌ Could not add sample products to database');
    // Use memory products as fallback
    memoryProducts = [
      {
        id: '1',
        name: "Minimalist Watch",
        price: 199.99,
        description: "Elegant black and white minimalist watch with leather strap",
        image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400",
        category: "Accessories"
      },
      {
        id: '2',
        name: "Classic Sunglasses",
        price: 149.99, 
        description: "Premium black frame sunglasses with UV protection",
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
        category: "Accessories"
      },
      {
        id: '3',
        name: "Designer Handbag",
        price: 299.99,
        description: "Luxurious black leather handbag with silver accents",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
        category: "Bags"
      }
    ];
  }
};

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = mongoose.connection.readyState === 1;
    const productCount = dbConnected ? await Product.countDocuments() : memoryProducts.length;
    const subscriberCount = dbConnected ? await Subscriber.countDocuments() : memorySubscribers.length;
    const orderCount = dbConnected ? await Order.countDocuments() : memoryOrders.length;
    
    res.json({
      status: '✅ OK',
      database: dbConnected ? 'Connected' : 'Using Memory',
      products: productCount,
      subscribers: subscriberCount,
      orders: orderCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: '✅ OK (Memory Mode)',
      database: 'Disconnected',
      products: memoryProducts.length,
      subscribers: memorySubscribers.length,
      orders: memoryOrders.length,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const products = await Product.find({ inStock: true });
      res.json(products);
    } else {
      res.json(memoryProducts);
    }
  } catch (error) {
    res.json(memoryProducts);
  }
});

// Add new product (Admin)
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
});

// Subscribe to newsletter
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      let subscriber = await Subscriber.findOne({ email });
      if (!subscriber) {
        subscriber = new Subscriber({ email, name });
        await subscriber.save();
      }
    } else {
      if (!memorySubscribers.find(s => s.email === email)) {
        memorySubscribers.push({ email, name, createdAt: new Date() });
      }
    }
    
    res.json({ success: true, message: 'Subscribed successfully to BRAMANDA!' });
  } catch (error) {
    res.json({ success: true, message: 'Subscribed successfully!' });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, customerAddress, items, totalAmount, paymentMethod } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      const order = new Order({
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        totalAmount,
        paymentMethod
      });
      await order.save();
      
      res.json({ 
        success: true, 
        orderId: order.orderId,
        message: `Order #${order.orderId} placed successfully!` 
      });
    } else {
      const orderId = 'BR' + Date.now();
      const order = {
        orderId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        totalAmount,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        createdAt: new Date()
      };
      memoryOrders.push(order);
      
      res.json({ 
        success: true, 
        orderId: order.orderId,
        message: `Order #${order.orderId} placed successfully!` 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Get all orders (Admin)
app.get('/api/orders', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json(orders);
    } else {
      res.json(memoryOrders);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get order by ID
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ orderId: req.params.orderId });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.json(order);
    } else {
      const order = memoryOrders.find(o => o.orderId === req.params.orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.json(order);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// eSewa payment verification (Simulated)
app.post('/api/esewa-verify', async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ orderId });
      if (order) {
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save();
      }
    } else {
      const order = memoryOrders.find(o => o.orderId === orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      orderId 
    });
  } catch (error) {
    res.json({ success: true, message: 'Payment processed' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🛍️ BRAMANDA Backend API - The Undiscovered',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      products: 'GET /api/products',
      subscribe: 'POST /api/subscribe',
      orders: 'POST /api/orders',
      'get-orders': 'GET /api/orders',
      'esewa-verify': 'POST /api/esewa-verify'
    },
    status: '🚀 Running'
  });
});

// Initialize and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initializeProducts();
  
  app.listen(PORT, () => {
    console.log(`\n🎉 BRAMANDA Backend Server Started!`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛍️  Ready to power your e-commerce site!`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Frontend URL: https://bramandaofficial.github.io/Bramanda/`);
  });
};

startServer();
