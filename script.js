// Configuration
const CONFIG = {
    // Ganti dengan Web App URL dari Google Apps Script
    SPREADSHEET_URL: 'https://script.google.com/macros/s/AKfycbwg3YoRsKcCEAnTjTMQAOHoFwq3AlX8fa_ozyEyYWz7Noi7lPsDqUyjjBNwlSyilqAmHw/exec',
    // Ganti dengan nomor WhatsApp toko (format: 62xxx tanpa +)
    WHATSAPP_NUMBER: '6281330752685',
    // Set true untuk menggunakan data dari spreadsheet, false untuk demo dengan gambar lokal
    USE_SPREADSHEET: true
};

// State
let allProducts = [];
let cart = [];
let currentCategory = 'semua';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterProducts(e.target.value);
    });

    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentCategory = e.target.dataset.category;
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active', 'bg-green-600', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            e.target.classList.add('active', 'bg-green-600', 'text-white');
            e.target.classList.remove('bg-gray-200', 'text-gray-700');
            filterProducts(document.getElementById('searchInput').value);
        });
    });

    // Cart modal
    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('cartModal').addEventListener('click', (e) => {
        if (e.target.id === 'cartModal') closeCart();
    });

    // Checkout
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
}

// Load products from Google Sheets
async function loadProducts() {
    try {
        if (CONFIG.USE_SPREADSHEET) {
            console.log('Loading from spreadsheet:', CONFIG.SPREADSHEET_URL);
            const response = await fetch(CONFIG.SPREADSHEET_URL);
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            console.log('Data received:', data);
            allProducts = parseSheetData(data);
            console.log('Products parsed:', allProducts);
        } else {
            // Demo data
            allProducts = getDemoData();
        }
        
        displayProducts(allProducts);
        document.getElementById('loading').classList.add('hidden');
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('loading').innerHTML = `
            <i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
            <p class="mt-4 text-red-600">Gagal memuat produk. Menggunakan data demo.</p>
        `;
        // Fallback ke demo data
        allProducts = getDemoData();
        displayProducts(allProducts);
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 2000);
    }
}

// Get demo data
function getDemoData() {
    return [
        { id: 1, nama: 'Beras Premium 5kg', kategori: 'beras', harga: 75000, stok: 50, gambar: 'img/beras 5kg.jpg' },
        { id: 2, nama: 'Beras Pulen 10kg', kategori: 'beras', harga: 140000, stok: 25, gambar: 'img/beras pulen.jpg' },
        { id: 3, nama: 'Minyak Goreng 2L', kategori: 'minyak', harga: 35000, stok: 30, gambar: 'img/miyak 2l.jpg' },
        { id: 4, nama: 'Gula Pasir 1kg', kategori: 'gula', harga: 15000, stok: 100, gambar: 'img/gula pasir 1kg.jpg' },
        { id: 5, nama: 'Gula Merah 500g', kategori: 'gula', harga: 20000, stok: 40, gambar: 'img/gula merah 500 g.jpg' },
        { id: 6, nama: 'Tepung Terigu 1kg', kategori: 'tepung', harga: 12000, stok: 80, gambar: 'img/terigu.jpg' },
        { id: 7, nama: 'Garam Dapur 500g', kategori: 'bumbu', harga: 5000, stok: 150, gambar: 'img/garam 500g.jpg' },
    ];
}

// Parse data from Google Sheets
function parseSheetData(data) {
    // Format data dari Google Sheets
    // Asumsi: kolom [ID, Nama, Kategori, Harga, Stok, Gambar URL]
    const rows = data.values.slice(1); // Skip header
    return rows.map(row => ({
        id: parseInt(row[0]),
        nama: row[1],
        kategori: row[2].toLowerCase(),
        harga: parseInt(row[3]),
        stok: parseInt(row[4]),
        gambar: row[5] || 'https://via.placeholder.com/300x200?text=Produk'
    }));
}

// Display products
function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    
    if (products.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    grid.innerHTML = products.map(product => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
            <img src="${product.gambar}" alt="${product.nama}" class="w-full h-48 object-cover">
            <div class="p-4">
                <span class="inline-block px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full mb-2">
                    ${product.kategori}
                </span>
                <h3 class="text-lg font-bold mb-2">${product.nama}</h3>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-2xl font-bold text-green-600">Rp ${formatPrice(product.harga)}</span>
                    <span class="text-sm text-gray-500">Stok: ${product.stok}</span>
                </div>
                <button onclick="addToCart(${product.id})" 
                    class="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition ${product.stok === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${product.stok === 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus mr-2"></i>
                    ${product.stok === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
                </button>
            </div>
        </div>
    `).join('');
}

// Filter products
function filterProducts(searchTerm) {
    let filtered = allProducts;
    
    // Filter by category
    if (currentCategory !== 'semua') {
        filtered = filtered.filter(p => p.kategori === currentCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.nama.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    displayProducts(filtered);
}

// Add to cart
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.stok === 0) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stok) {
            existingItem.quantity++;
        } else {
            alert('Stok tidak mencukupi!');
            return;
        }
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCart();
    saveCartToStorage();
    
    // Show feedback
    showNotification('Produk ditambahkan ke keranjang!');
}

// Update cart display
function updateCart() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    
    cartCount.textContent = totalItems;
    cartTotal.textContent = `Rp ${formatPrice(totalPrice)}`;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-shopping-cart text-6xl mb-4"></i>
                <p>Keranjang belanja kosong</p>
            </div>
        `;
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="flex items-center gap-4 mb-4 pb-4 border-b">
            <img src="${item.gambar}" alt="${item.nama}" class="w-20 h-20 object-cover rounded">
            <div class="flex-1">
                <h4 class="font-semibold">${item.nama}</h4>
                <p class="text-green-600 font-bold">Rp ${formatPrice(item.harga)}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateQuantity(${item.id}, -1)" class="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300">
                    <i class="fas fa-minus text-sm"></i>
                </button>
                <span class="w-12 text-center font-bold">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)" class="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300">
                    <i class="fas fa-plus text-sm"></i>
                </button>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Update quantity
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    const product = allProducts.find(p => p.id === productId);
    
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stok) {
        alert('Stok tidak mencukupi!');
        return;
    }
    
    item.quantity = newQuantity;
    updateCart();
    saveCartToStorage();
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCartToStorage();
}

// Open/Close cart
function openCart() {
    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCart() {
    document.getElementById('cartModal').classList.add('hidden');
}

// Checkout
async function checkout() {
    if (cart.length === 0) {
        alert('Keranjang belanja kosong!');
        return;
    }
    
    // Minta data customer
    const customerName = prompt('Nama Anda:') || 'Guest';
    const customerPhone = prompt('Nomor HP Anda:') || '';
    
    if (!customerName || !customerPhone) {
        alert('Mohon isi nama dan nomor HP!');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    
    // Format pesan untuk WhatsApp
    let message = '*PESANAN BARU TOKO SEMBAKO*\n';
    message += '================================\n\n';
    message += `Nama: ${customerName}\n`;
    message += `No HP: ${customerPhone}\n\n`;
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.nama}\n`;
        message += `   Jumlah: ${item.quantity}\n`;
        message += `   Harga: Rp ${formatPrice(item.harga)}\n`;
        message += `   Subtotal: Rp ${formatPrice(item.harga * item.quantity)}\n\n`;
    });
    
    message += '================================\n';
    message += `*TOTAL: Rp ${formatPrice(total)}*\n\n`;
    message += 'Mohon konfirmasi pesanan ini. Terima kasih!';
    
    // Simpan pesanan ke spreadsheet
    try {
        await saveOrderToSpreadsheet({
            customerName,
            customerPhone,
            items: cart,
            total
        });
        console.log('Order saved to spreadsheet');
    } catch (error) {
        console.error('Failed to save order:', error);
        // Lanjut ke WhatsApp meskipun gagal simpan
    }
    
    // Buat URL WhatsApp
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    console.log('WhatsApp URL:', whatsappUrl);
    
    // Buka WhatsApp
    const newWindow = window.open(whatsappUrl, '_blank');
    
    // Jika popup diblokir, coba dengan window.location
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.log('Popup blocked, using window.location');
        window.location.href = whatsappUrl;
    }
    
    // Kosongkan keranjang
    setTimeout(() => {
        cart = [];
        updateCart();
        saveCartToStorage();
        closeCart();
        showNotification('Pesanan dikirim ke WhatsApp!');
    }, 1000);
}

// Save order to spreadsheet
async function saveOrderToSpreadsheet(orderData) {
    try {
        const response = await fetch(CONFIG.SPREADSHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Order saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

// Local storage
function saveCartToStorage() {
    localStorage.setItem('sembako_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('sembako_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCart();
    }
}

// Utilities
function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
