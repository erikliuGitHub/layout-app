// 彈性API配置 - 自動偵測最佳連線
const API_ENDPOINTS = {
  local: 'http://localhost:3001/api',
  home: 'http://220.128.162.218:3001/api',
  company: 'http://your-company-server:3001/api', // 請替換為實際的公司伺服器地址
  // 範例: company: 'http://lrps.company.com:3001/api'
};

/**
 * 智能選擇API端點
 * 優先順序：環境變數 > 環境參數 > 自動偵測 > 預設值
 */
const selectApiEndpoint = () => {
  // 1. 如果有明確的環境變數設定，直接使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2. 檢查是否有環境參數指定 (例如: ?env=company)
  const urlParams = new URLSearchParams(window.location.search);
  const envParam = urlParams.get('env');
  if (envParam && API_ENDPOINTS[envParam]) {
    console.log(`🏢 使用指定環境: ${envParam}`);
    return API_ENDPOINTS[envParam];
  }

  // 3. 根據主機名稱自動判斷環境
  const hostname = window.location.hostname;
  
  // 公司環境判斷 (請根據實際公司域名調整)
  if (hostname.includes('company.com') || 
      hostname.includes('corp.local') || 
      hostname === 'lrps.company.com') {
    console.log('🏢 偵測到公司環境');
    return API_ENDPOINTS.company;
  }
  
  // 本地開發環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('💻 使用本地開發環境');
    return API_ENDPOINTS.local;
  }
  
  // 家裡環境 (預設)
  console.log('🏠 使用家裡環境');
  return API_ENDPOINTS.home;
};

const API_BASE_URL = selectApiEndpoint();

// 開發環境資訊顯示
if (import.meta.env.DEV) {
  console.log('🌐 Available API Endpoints:', API_ENDPOINTS);
  console.log('🔗 Selected API Base URL:', API_BASE_URL);
  console.log('🌍 Current hostname:', window.location.hostname);
  console.log('💡 Environment switching tips:');
  console.log('   - 本地: http://localhost:5173');
  console.log('   - 家裡: http://localhost:5173?env=home');  
  console.log('   - 公司: http://localhost:5173?env=company');
}

export { API_BASE_URL, API_ENDPOINTS };