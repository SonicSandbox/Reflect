import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gray-900">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900" />

      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-8 tracking-tight">
              Transform Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                Daily Reflection
              </span>{" "}
              with AI Insights
            </h1>

            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              A sleek journaling app that combines wellness tracking with
              AI-powered reflection prompts. Document your day through voice or
              text and discover deeper insights about yourself.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center px-8 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                Start Journaling
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>

              <Link
                href="#pricing"
                className="inline-flex items-center px-8 py-4 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-lg font-medium"
              >
                View Pricing
              </Link>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-400" />
                <span>Voice & text journaling</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-400" />
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-400" />
                <span>Private & secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
