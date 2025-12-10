import { Header } from "@/components/kuamini/header"
import { Footer } from "@/components/kuamini/footer"
import { Shield, Monitor, Bell, BarChart3, Lock, Cloud, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Security Console | Kuamini Systems",
  description:
    "Enterprise-grade endpoint protection powered by AI. Protect your business from cyber threats with real-time monitoring, intelligent threat detection, and centralized management.",
}

export default function SecurityAgentLandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
              <Shield className="h-16 w-16 text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="text-blue-400">Kuamini</span> Security Console
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Enterprise-grade endpoint protection powered by AI. Protect your business from cyber threats with real-time
            monitoring, intelligent threat detection, and centralized management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/securityAgent/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Sign In to Console
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/securityAgent/auth/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/30 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Complete Endpoint Protection</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Protect every device in your organization with our comprehensive security suite
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Threat Detection</h3>
              <p className="text-gray-600">
                AI-powered scanning engine that identifies and neutralizes threats before they cause damage.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Monitor className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Centralized Management</h3>
              <p className="text-gray-600">Monitor and manage all your endpoints from a single dashboard.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Bell className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Alerts</h3>
              <p className="text-gray-600">
                Get notified immediately when threats are detected with configurable alert policies.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Detailed Analytics</h3>
              <p className="text-gray-600">
                Comprehensive reports to understand your security posture and track threats.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Lock className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Policy Management</h3>
              <p className="text-gray-600">Create and deploy security policies across your organization easily.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-cyan-100 rounded-lg flex items-center justify-center mb-6">
                <Cloud className="h-7 w-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Cloud-Based Console</h3>
              <p className="text-gray-600">
                Access your security console from anywhere. No on-premise infrastructure required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Protect Every Device</h2>
            <p className="text-gray-600">Our agents support all major operating systems</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="text-5xl mb-4">🪟</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Windows</h3>
              <p className="text-gray-600 text-sm">Windows 10, 11, Server 2016+</p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="text-5xl mb-4">🍎</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">macOS</h3>
              <p className="text-gray-600 text-sm">macOS Monterey and later</p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="text-5xl mb-4">🐧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Linux</h3>
              <p className="text-gray-600 text-sm">Ubuntu, Debian, RHEL, CentOS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Choose the plan that fits your organization</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Basic</h3>
              <p className="text-gray-600 text-sm mb-4">For small teams</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$5</span>
                <span className="text-gray-600">/endpoint/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Up to 25 endpoints
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Real-time protection
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Email support
                </li>
              </ul>
              <Link
                href="/securityAgent/auth/register"
                className="block w-full text-center py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Professional */}
            <div className="border-2 border-blue-500 rounded-xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional</h3>
              <p className="text-gray-600 text-sm mb-4">For growing businesses</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$10</span>
                <span className="text-gray-600">/endpoint/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Up to 100 endpoints
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Advanced threat detection
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Policy management
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Priority support
                </li>
              </ul>
              <Link
                href="/securityAgent/auth/register"
                className="block w-full text-center py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise */}
            <div className="border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 text-sm mb-4">For large organizations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Unlimited endpoints
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Multi-tenant management
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Custom integrations
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  24/7 dedicated support
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full text-center py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Secure Your Endpoints?</h2>
          <p className="text-gray-300 mb-8 text-lg">Start your free trial today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/securityAgent/auth/register"
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/securityAgent/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/30 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
