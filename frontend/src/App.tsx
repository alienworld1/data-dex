function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 glass-morph border-b border-yellow-400/30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg neon-yellow">
            <span className="text-black font-bold text-lg">D</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400 tracking-wide cel-text-shadow">
            DataDex
          </span>
        </div>

        <div className="hidden md:flex space-x-8">
          <a
            href="#"
            className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 font-medium"
          >
            Marketplace
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 font-medium"
          >
            Upload Data
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 font-medium"
          >
            Analytics
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 font-medium"
          >
            About
          </a>
        </div>

        <button className="persona-button bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full font-bold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 neon-yellow">
          Connect Wallet
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative">
        {/* Floating geometric shapes for Persona-style background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="floating-1 absolute top-20 left-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl"></div>
          <div className="floating-2 absolute top-40 right-20 w-24 h-24 bg-cyan-400/20 rounded-lg rotate-45 blur-lg"></div>
          <div className="floating-3 absolute bottom-40 left-1/4 w-16 h-16 bg-pink-400/20 rounded-full blur-lg"></div>
          <div className="floating-4 absolute top-1/3 right-1/3 w-20 h-20 bg-purple-400/20 rounded-lg rotate-12 blur-lg"></div>
          <div className="floating-1 absolute bottom-20 right-10 w-28 h-28 bg-green-400/20 rounded-lg rotate-45 blur-xl"></div>
          <div className="floating-3 absolute top-60 left-1/3 w-12 h-12 bg-orange-400/20 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16 reveal">
            <h1 className="text-6xl md:text-8xl font-black mb-6 gradient-text leading-tight cel-text-shadow">
              DataDex
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light cel-text-shadow">
              The Future of Data Commerce
            </p>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Empowering Vietnam's SMEs to monetize their business data on the
              Aptos blockchain. Buy, sell, and analyze anonymized datasets with
              complete transparency and security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="persona-button bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-full text-lg font-bold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-2 neon-yellow">
                Explore Marketplace
              </button>
              <button className="persona-button border-2 border-yellow-400 text-yellow-400 px-8 py-4 rounded-full text-lg font-bold hover:bg-yellow-400 hover:text-black transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-2">
                Upload Your Data
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="glass-morph rounded-2xl p-6 border border-yellow-400/30 hover:border-cyan-400/60 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 reveal">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg neon-cyan">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-cyan-400 cel-text-shadow">
                Secure Data Storage
              </h3>
              <p className="text-gray-300">
                Your data is encrypted and stored on IPFS with metadata secured
                on the Aptos blockchain for maximum security and transparency.
              </p>
            </div>

            <div className="glass-morph rounded-2xl p-6 border border-yellow-400/30 hover:border-purple-400/60 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 reveal">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg neon-purple">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-purple-400 cel-text-shadow">
                Instant APT Rewards
              </h3>
              <p className="text-gray-300">
                Earn APT tokens instantly when your data is purchased. Smart
                contracts ensure automatic, transparent reward distribution.
              </p>
            </div>

            <div className="glass-morph rounded-2xl p-6 border border-yellow-400/30 hover:border-green-400/60 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/20 reveal">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-green-400 cel-text-shadow">
                Real-time Analytics
              </h3>
              <p className="text-gray-300">
                Advanced data visualization tools help you understand market
                trends and make informed business decisions.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="glass-morph rounded-3xl p-8 border border-yellow-400/30 reveal">
            <h2 className="text-3xl font-bold text-center mb-8 gradient-text cel-text-shadow">
              Platform Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="transform hover:scale-105 transition-transform duration-300">
                <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2 cel-text-shadow">
                  150+
                </div>
                <div className="text-gray-300">Datasets Available</div>
              </div>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2 cel-text-shadow">
                  50+
                </div>
                <div className="text-gray-300">Active SMEs</div>
              </div>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2 cel-text-shadow">
                  1.2K
                </div>
                <div className="text-gray-300">APT Earned</div>
              </div>
              <div className="transform hover:scale-105 transition-transform duration-300">
                <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2 cel-text-shadow">
                  98%
                </div>
                <div className="text-gray-300">Data Security</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="relative z-10 glass-morph border-t border-yellow-400/30 py-12">
          <div className="max-w-4xl mx-auto text-center px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text cel-text-shadow">
              Ready to Transform Your Data?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join Vietnam's leading decentralized data marketplace today
            </p>
            <button className="persona-button bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-12 py-4 rounded-full text-xl font-bold hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-2 neon-yellow">
              Get Started Now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
