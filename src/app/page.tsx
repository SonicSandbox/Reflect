import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import Footer from "@/components/footer";
import { createClient } from "../../supabase/server";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Mic,
  Brain,
  BarChart3,
  Moon,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to the journal home page
  if (user) {
    redirect("/dashboard/home");
  }

  const { data: plans, error } = await supabase.functions.invoke(
    "supabase-functions-get-plans",
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <Hero />

      {/* Features Section */}
      <section className="py-24 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Everything You Need for Daily Reflection
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Powerful features designed to help you understand yourself better
              through thoughtful journaling and AI insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Mic className="w-6 h-6" />,
                title: "Voice Journaling",
                description: "Speak your thoughts naturally with voice-to-text",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI Insights",
                description: "Get thoughtful follow-up questions powered by AI",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Wellness Tracking",
                description: "Monitor mood, sleep, and energy patterns",
              },
              {
                icon: <Moon className="w-6 h-6" />,
                title: "Evening Reflection",
                description: "Perfect for end-of-day contemplation",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors"
              >
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Journal Entries</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-100">User Satisfaction</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Available Anywhere</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-900" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Choose the perfect plan for your reflection journey. No hidden
              fees.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((item: any) => (
              <PricingCard key={item.id} item={item} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            Start Your Reflection Journey Today
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands who have discovered deeper insights about themselves
            through daily journaling.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Begin Journaling
            <ArrowUpRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
