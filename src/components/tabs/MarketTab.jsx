import React, { useState, useMemo } from 'react';
import { BarChart3, Tag, TrendingUp, ArrowUpRight, RefreshCw, ExternalLink, Search, ShoppingCart, AlertCircle } from 'lucide-react';

export default function MarketTab({ market, crossRefs, icName, icNumber }) {
  const [sortBy, setSortBy] = useState('price-asc');

  const searchName = icNumber || icName || '';

  // Generate REAL working search URLs
  const getRetailerSearchUrl = (retailerName) => {
    const term = encodeURIComponent(searchName);
    switch(retailerName.toLowerCase()) {
      case 'mouser india':
        return `https://in.mouser.com/c/semiconductors/?q=${term}`;
      case 'digikey india':
        return `https://www.digikey.in/en/products?keywords=${term}`;
      case 'robu.in':
        return `https://robu.in/?s=${term}&post_type=product`;
      case 'element14 india':
        return `https://in.element14.com/search?st=${term}`;
      default:
        return `https://www.google.com/search?q=${term}+buy+india`;
    }
  };

  // Sort retailers
  const sortedRetailers = useMemo(() => {
    if (!market?.indiaRetailers) return [];
    
    const retailers = [...market.indiaRetailers];
    
    switch(sortBy) {
      case 'price-asc':
        return retailers.sort((a, b) => {
          const priceA = parseFloat(a.price?.replace(/[₹,]/g, '')) || 0;
          const priceB = parseFloat(b.price?.replace(/[₹,]/g, '')) || 0;
          return priceA - priceB;
        });
      case 'price-desc':
        return retailers.sort((a, b) => {
          const priceA = parseFloat(a.price?.replace(/[₹,]/g, '')) || 0;
          const priceB = parseFloat(b.price?.replace(/[₹,]/g, '')) || 0;
          return priceB - priceA;
        });
      case 'retailer':
        return retailers.sort((a, b) => a.store.localeCompare(b.store));
      case 'availability':
        return retailers.sort((a, b) => {
          const aInStock = a.availability?.toLowerCase().includes('in stock') ? 0 : 1;
          const bInStock = b.availability?.toLowerCase().includes('in stock') ? 0 : 1;
          return aInStock - bInStock;
        });
      default:
        return retailers;
    }
  }, [market?.indiaRetailers, sortBy]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-primary-600" />
        <span className="section-title !mb-0">India Market Analysis</span>
      </div>

      {/* Important Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Verify Prices Before Buying</p>
            <p className="text-xs text-amber-700">
              Prices shown are <strong>AI-researched estimates</strong>. 
              <strong> Click any retailer link</strong> to see <strong>current real-time prices</strong> for {searchName}.
            </p>
          </div>
        </div>
      </div>

      {/* Price Summary */}
      {market && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
            <Tag size={14} className="text-primary-600 mb-1" />
            <p className="data-label">Estimated Min Price</p>
            <p className="text-2xl font-display font-bold text-primary-700">{market.minPrice || '100-150'}</p>
          </div>
          <div className="p-4 bg-accent-50 border border-accent-100 rounded-xl">
            <Tag size={14} className="text-accent-600 mb-1" />
            <p className="data-label">Estimated Max Price</p>
            <p className="text-2xl font-display font-bold text-accent-700">{market.maxPrice || '₹200-300'}</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <TrendingUp size={14} className="text-slate-400 mb-1" />
            <p className="data-label">Bulk Trend</p>
            <p className="text-sm font-semibold text-slate-700">{market.bulkTrend || 'Price decreases with quantity'}</p>
          </div>
        </div>
      )}

      {/* Quick Search Buttons - ALL WORKING */}
      <div className="mb-6">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShoppingCart size={14} /> Search Live Prices at Indian Retailers
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Robu.in', icon: '🛒', color: 'purple' },
            { name: 'Mouser India', icon: '🏭', color: 'blue' },
            { name: 'DigiKey India', icon: '⚡', color: 'red' },
            { name: 'Element14', icon: '🔌', color: 'orange' },
          ].map((retailer) => {
            const url = getRetailerSearchUrl(retailer.name);
            const colorClasses = {
              purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700',
              blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
              red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700',
              orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700',
            };

            return (
              <a
                key={retailer.name}
                href={url}
                target="_blank"
                rel="noopener"
                className={`p-4 rounded-xl border-2 transition-all group ${colorClasses[retailer.color]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{retailer.icon}</span>
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-bold">{retailer.name}</p>
                <p className="text-[10px] opacity-75">Search {searchName}</p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Retailer Price Comparison
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white hover:border-primary-300 focus:border-primary-500 focus:outline-none transition-colors"
          >
            <option value="price-asc">💰 Price: Low to High</option>
            <option value="price-desc">💰 Price: High to Low</option>
            <option value="retailer">🏪 Retailer Name</option>
            <option value="availability">✅ Availability</option>
          </select>
        </div>
      </div>

      {/* Retailer Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-2.5 data-label">Retailer</th>
              <th className="text-left px-4 py-2.5 data-label">Price (INR)</th>
              <th className="text-left px-4 py-2.5 data-label">Availability</th>
              <th className="text-center px-4 py-2.5 data-label">Search</th>
            </tr>
          </thead>
          <tbody>
            {sortedRetailers.map((r, i) => {
              const url = r.url || getRetailerSearchUrl(r.store);
              const isInStock = r.availability?.toLowerCase().includes('in stock');
              
              return (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.store}</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary-700">{r.price || 'Check link'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] ${isInStock ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      {r.availability || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener" 
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      Search <ArrowUpRight size={12} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cross References */}
      {crossRefs?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={16} className="text-primary-600" />
            <span className="section-title !mb-0">Alternative ICs (Check Prices)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {crossRefs.map((cr, i) => {
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cr.name + ' buy india price')}`;
              
              return (
                <a 
                  key={i} 
                  href={searchUrl}
                  target="_blank" 
                  rel="noopener"
                  className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary-700">{cr.name}</h4>
                      <ExternalLink size={12} className="text-slate-300 group-hover:text-primary-500" />
                    </div>
                    <span className="badge bg-primary-50 text-primary-700 border border-primary-100 text-[10px]">{cr.compatibility}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{cr.manufacturer}</p>
                  {cr.notes && <p className="text-xs text-slate-400 mb-2">{cr.notes}</p>}
                  <p className="text-[10px] text-primary-600 font-medium flex items-center gap-1">
                    <Search size={10} /> Click to search price
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-800">
          💡 <strong>Tip:</strong> All links open real search pages. Click any retailer to see current prices for {searchName}.
        </p>
      </div>
    </div>
  );
}