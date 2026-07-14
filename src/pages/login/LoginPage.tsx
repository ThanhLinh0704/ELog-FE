import React from 'react';
// import Navbar from './Navbar';
import FeatureCard from './FeatureCard';
import MapMockup from './MapMockup';
import LoginForm from './LoginForm';
import '../../styles/login/LoginPage.css';

const LoginPage: React.FC = () => {
  return (
    <div className="elog-login-page">
      {/* Background Vectors & Ambience */}
      <div className="elog-bg-grid" />
      <div className="elog-blob elog-blob-top" />
      <div className="elog-blob elog-blob-bottom" />

      <div className="elog-content-wrapper">
        {/* Navigation Bar */}
        {/* <Navbar /> */}

        {/* Main Body */}
        <main className="elog-main-body">
          <div className="elog-container">

            {/* Left Column (Feature presentation - hidden on <= 1000px width via CSS) */}
            <section className="elog-left-column">
              <h1 className="elog-headline">
                Quản lý logistics
                <br />
                <span className="elog-headline-highlight">và kho vận</span>
                <br />
                thông minh
              </h1>

              <p className="elog-description">
                Quản lý đơn hàng, tuyến giao, xe, kho, nhân sự và vận hành giao hàng trên một nền tảng tập trung.
              </p>

              {/* 2x2 Feature Grid */}
              <div className="elog-feature-grid">
                <FeatureCard
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.1" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  }
                  text="Quản lý đơn hàng và giao hàng"
                />

                <FeatureCard
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 22V8.5L12 3l9 5.5V22H3z" fill="currentColor" fillOpacity="0.15" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                  }
                  text="Theo dõi tồn kho"
                />

                <FeatureCard
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="6" cy="19" r="3" fill="currentColor" fillOpacity="0.1" />
                      <circle cx="18" cy="5" r="3" fill="currentColor" fillOpacity="0.1" />
                      <path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-7A3.5 3.5 0 0 1 20.5 5H21" />
                    </svg>
                  }
                  text="Điều phối tuyến và xe"
                />

                <FeatureCard
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
                      <rect x="14" y="3" width="7" height="5" rx="1" fill="currentColor" fillOpacity="0.15" />
                      <rect x="14" y="12" width="7" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
                      <rect x="3" y="16" width="7" height="5" rx="1" fill="currentColor" fillOpacity="0.15" />
                    </svg>
                  }
                  text="Bảng điều khiển thời gian thực"
                />
              </div>

              {/* Map Mockup */}
              <MapMockup />
            </section>

            {/* Right Column (LoginForm Card) */}
            <section className="elog-right-column">
              <LoginForm />
            </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="elog-footer">
          <p className="elog-footer-text">
            &copy; 2026 ELog. Nền tảng quản lý logistics và kho vận.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
