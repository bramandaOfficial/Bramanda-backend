const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://bramandaofficial.github.io'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Simple in-memory storage (replace with MongoDB later)
let products = [
  {
    id: '1',
    name: "Minimalist Watch",
    price: 199.99,
    description: "Elegant black and white minimalist watch with leather strap",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400"
  },
  {
    id: '2', 
    name: "Classic Sunglasses",
    price: 149.99,
    description: "Premium black frame sunglasses with UV protection",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400"
  },
  {
    id: '3',
    name: "Designer Handbag", 
    price: 299.99,
    description: "Luxurious black leather handbag with silver accents",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400"
  }
];

let orders = [];
let subscribers = [];

// Routes
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/orders', (req, res) => {
  const order = {
    id: Date.now().toString(),
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  };
  orders.push(order);
  res.json({ success: true, orderId: order.id });
});

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!subscribers.includes(email)) {
    subscribers.push(email);
  }
  res.json({ success: true, message: 'Subscribed successfully' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    products: products.length,
    orders: orders.length,
    subscribers: subscribers.length
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BRAMANDA Backend running on port ${PORT}`);
});
