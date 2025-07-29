import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full" style={{ background: 'var(--color-light)' }}>
      <div className="w-full max-w-none" style={{ 
        maxWidth: '90vw', 
        minWidth: 'min(800px, 95vw)',
        margin: '0 max(2rem, 5vw)'
      }}>
        {/* 登入頁面專用的header */}
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(90deg, #000 0%, #0a1832 40%, #4f8cff 100%)',
            padding: '48px 8%',
            borderRadius: '16px 16px 0 0',
            gap: '32px',
            minHeight: '140px',
            marginBottom: '0'
          }}
        >
          <img 
            src="/assets/logo-lrps.png" 
            alt="LRPS Logo" 
            style={{ 
              height: '96px', 
              width: '180px',
              objectFit: 'contain',
              borderRadius: '8px'
            }} 
          />
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{ 
                fontSize: '3rem', 
                fontWeight: '700',
                color: '#fff',
                letterSpacing: '0.1em',
                marginBottom: '8px'
              }}
            >
              LRPS
            </div>
            <div 
              style={{ 
                fontSize: '1.3rem', 
                color: '#e0e7ef',
                letterSpacing: '0.05em'
              }}
            >
              Layout Resource Plan System
            </div>
          </div>
        </div>

        {/* 登入表單區域 */}
        <div 
          className="bg-white" 
          style={{ 
            padding: '48px 8%', 
            borderRadius: '0 0 16px 16px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)' 
          }}
        >
          <h2 
            className="text-3xl font-bold text-center mb-8" 
            style={{ color: 'var(--color-primary-dark)' }}
          >
            系統登入
          </h2>
          
          <form className="space-y-8 mx-auto" style={{ maxWidth: 'min(600px, 60%)' }} onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-base font-medium mb-2"
                style={{ color: 'var(--color-primary-dark)' }}
              >
                使用者名稱
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none transition-all"
                style={{
                  borderColor: '#d1d5db',
                  fontSize: '16px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79,140,255,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium mb-2"
                style={{ color: 'var(--color-primary-dark)' }}
              >
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none transition-all"
                style={{
                  borderColor: '#d1d5db',
                  fontSize: '16px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79,140,255,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                className="w-full px-6 py-4 text-lg font-semibold text-white rounded-lg shadow-lg focus:outline-none focus:ring-4 transition-all"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  focusRingColor: 'rgba(79,140,255,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--color-primary-dark)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(79,140,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--color-primary)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(79,140,255,0.3)';
                }}
              >
                登入系統
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
