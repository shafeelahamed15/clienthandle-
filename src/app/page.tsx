export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100/30">
      {/* Navigation */}
      <nav className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-semibold text-gray-800">ClientHandle</span>
        </div>
        <div className="flex items-center space-x-4">
          <a href="/pricing" className="text-gray-600 hover:text-gray-800 font-medium">
            Pricing
          </a>
          <a href="/sign-in" className="text-gray-600 hover:text-gray-800 font-medium">
            Sign In
          </a>
          <a 
            href="/sign-up" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            AI-Powered Client Management
          </div>
          
          {/* Main Heading */}
          <h1 className="text-6xl font-bold text-gray-800 mb-6 leading-tight">
            Follow-ups & invoices,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              the Apple way
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            The premium freelancer tool that makes you look professional with elegant invoices, 
            AI follow-ups that get replies, and frictionless workflows.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a 
              href="/sign-up" 
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🚀 Start Free Trial
            </a>
            <a 
              href="/pricing" 
              className="bg-gray-50/80 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100/80 transition-all duration-200 shadow-md border border-gray-200"
            >
              💰 View Pricing
            </a>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-50/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-white text-xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Smart Follow-ups</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered emails that adapt their tone and timing to get more client replies.
              </p>
            </div>
            
            <div className="bg-gray-50/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-white text-xl">📄</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Beautiful Invoices</h3>
              <p className="text-gray-600 leading-relaxed">
                Pristine, branded PDFs that make you look like a Fortune 500 company.
              </p>
            </div>
            
            <div className="bg-gray-50/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Auto Reminders</h3>
              <p className="text-gray-600 leading-relaxed">
                Set once, forget forever. Gentle reminders that get you paid faster.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-6 py-8 text-center text-gray-500 text-sm">
        <p>Built with Apple's attention to detail and user experience excellence.</p>
      </div>
    </div>
  )
}