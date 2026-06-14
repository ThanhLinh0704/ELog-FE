import React from 'react';
// import Navbar from './Navbar';
import FeatureCard from './FeatureCard';
import BrowserDashboardMockup from './BrowserDashboardMockup';
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
                Smart Logistics &
                <br />
                <span className="elog-headline-highlight">Warehouse</span>
                <br />
                Operation Platform
              </h1>

              <p className="elog-description">
                Manage orders, routes, vehicles, warehouses, staff, and delivery operations in one centralized platform.
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
                  text="Order & Delivery Management"
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
                  text="Warehouse Inventory Tracking"
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
                  text="Route & Vehicle Dispatching"
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
                  text="Real-time Operation Dashboard"
                />
              </div>

              {/* Browser Mockup */}
              <BrowserDashboardMockup />
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
            &copy; 2026 ELog. Logistics & Warehouse Management Platform.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
