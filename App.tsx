
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  Search,
  CheckCircle2,
  AlertCircle,
  BrainCircuit
} from 'lucide-react';
import { Product, CartItem, Transaction, View } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load Initial Data
  useEffect(() => {
    const savedProducts = localStorage.getItem('pos_products');
    const savedTransactions = localStorage.getItem('pos_transactions');
    
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    else {
      // Mock initial data
      const initial = [
        { id: '1', name: 'Kopi Susu Gula Aren', price: 18000, stock: 50, category: 'Minuman', sku: 'DRK-01' },
        { id: '2', name: 'Roti Bakar Cokelat', price: 15000, stock: 30, category: 'Makanan', sku: 'FD-01' },
      ];
      setProducts(initial);
      localStorage.setItem('pos_products', JSON.stringify(initial));
    }

    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const originalProduct = products.find(p => p.id === id);
        if (originalProduct && newQty > originalProduct.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total,
      paymentMethod: 'cash',
      timestamp: Date.now(),
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
      return p;
    }));
    setCart([]);
    alert('Transaksi Berhasil!');
  };

  const runAiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      // Initialize GoogleGenAI client using named parameters and process.env.API_KEY directly.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Gunakan data inventory ini: ${JSON.stringify(products)}. 
      Serta ringkasan transaksi terakhir: ${JSON.stringify(transactions.slice(0, 5))}.
      Berikan analisis singkat (maks 3 kalimat) tentang produk mana yang perlu ditambah stoknya atau yang paling laku.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      // Extract text output from response using the .text property.
      setAiAnalysis(response.text || 'Gagal melakukan analisis.');
    } catch (err) {
      setAiAnalysis('Maaf, fitur AI membutuhkan koneksi internet atau API Key valid.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <nav className="w-full md:w-64 bg-indigo-700 text-white flex-shrink-0 flex md:flex-col sticky top-0 md:h-screen z-50">
        <div className="p-4 flex items-center gap-2 font-bold text-xl border-b border-indigo-600">
          <ShoppingCart className="w-8 h-8" />
          <span>SmartPOS</span>
        </div>
        
        <div className="flex md:flex-col overflow-x-auto md:overflow-visible flex-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<ShoppingCart />} label="Kasir" active={view === 'cashier'} onClick={() => setView('cashier')} />
          <NavItem icon={<Package />} label="Stok Barang" active={view === 'inventory'} onClick={() => setView('inventory')} />
          <NavItem icon={<History />} label="Riwayat" active={view === 'history'} onClick={() => setView('history')} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Ringkasan Bisnis</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Penjualan" value={`Rp ${transactions.reduce((s, t) => s + t.total, 0).toLocaleString()}`} />
              <StatCard label="Transaksi Hari Ini" value={transactions.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length} />
              <StatCard label="Produk Menipis" value={products.filter(p => p.stock < 10).length} color="text-red-600" />
              <StatCard label="Total Produk" value={products.length} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <BrainCircuit className="w-5 h-5" />
                  <span>AI Business Insight</span>
                </div>
                <button 
                  onClick={runAiAnalysis}
                  disabled={isAiLoading}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  {isAiLoading ? 'Menganalisis...' : 'Mulai Analisis'}
                </button>
              </div>
              <p className="text-gray-600 italic">
                {aiAnalysis || "Klik tombol di atas untuk melihat ringkasan stok dan performa penjualan Anda melalui kecerdasan buatan."}
              </p>
            </div>
          </div>
        )}

        {view === 'cashier' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Product Selector */}
            <div className="flex-1 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Cari produk atau scan SKU..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <button 
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-indigo-500 transition-all text-left flex flex-col justify-between group"
                  >
                    <div>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <h3 className="font-semibold group-hover:text-indigo-600">{product.name}</h3>
                    </div>
                    <div className="mt-4 flex justify-between items-end">
                      <span className="text-indigo-600 font-bold">Rp {product.price.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-1 rounded ${product.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        Stok: {product.stock}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="w-full lg:w-96 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col sticky top-8 max-h-[calc(100vh-120px)]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Keranjang Belanja
              </h2>
              <div className="flex-1 overflow-y-auto space-y-4 min-h-[200px]">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">Keranjang kosong</div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-500">Rp {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500"><Minus className="w-4 h-4" /></button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total</span>
                  <span className="text-indigo-600">Rp {cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:bg-gray-300"
                >
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Manajemen Stok</h1>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                <Plus className="w-5 h-5" /> Tambah Barang
              </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Produk</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">SKU</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Kategori</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Harga</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Stok</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                      <td className="px-6 py-4 font-medium">Rp {product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Plus className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-xl">Belum ada transaksi</div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="p-3 bg-green-50 text-green-600 rounded-full">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Rp {tx.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tx.items.map(item => (
                        <span key={item.id} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                          {item.name} x{item.quantity}
                        </span>
                      ))}
                    </div>
                    <button className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
                      Cetak Struk <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (Mobile Only) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button 
          onClick={() => setView('cashier')}
          className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

// UI Helpers
// Fixed NavItem icon type to React.ReactElement<any> to allow React.cloneElement with className prop.
const NavItem: React.FC<{ icon: React.ReactElement<any>, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 transition-all whitespace-nowrap md:w-full ${active ? 'bg-indigo-800 border-l-4 border-indigo-300 font-bold' : 'hover:bg-indigo-600 opacity-80'}`}
  >
    {React.cloneElement(icon, { className: "w-5 h-5" })}
    <span className="text-sm md:text-base">{label}</span>
  </button>
);

const StatCard: React.FC<{ label: string, value: string | number, color?: string }> = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

export default App;
