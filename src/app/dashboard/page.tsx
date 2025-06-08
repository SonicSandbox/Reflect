"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/client";
import { InfoIcon, UserCircle, Home } from "lucide-react";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/sign-in");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center relative">
          {/* Outer rotating ring */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
            <div
              className="absolute inset-2 rounded-full border border-transparent border-r-blue-400 animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>

            {/* Center pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Subtle swirl indicators around the main spinner */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div
              className="w-1 h-1 bg-blue-400 rounded-full animate-ping"
              style={{ animationDelay: "0s" }}
            ></div>
          </div>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <div
              className="w-1 h-1 bg-blue-400 rounded-full animate-ping"
              style={{ animationDelay: "0.5s" }}
            ></div>
          </div>
          <div className="absolute top-1/2 -left-8 transform -translate-y-1/2">
            <div
              className="w-1 h-1 bg-blue-400 rounded-full animate-ping"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>
          <div className="absolute top-1/2 -right-8 transform -translate-y-1/2">
            <div
              className="w-1 h-1 bg-blue-400 rounded-full animate-ping"
              style={{ animationDelay: "1.5s" }}
            ></div>
          </div>

          <p className="text-slate-400 text-sm font-light">
            Loading your journal...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // For now, we'll always show the Launch view
  // Later this will be conditional based on whether journal entry exists for today
  const hasJournaledToday = false;

  if (!hasJournaledToday) {
    return (
      <SubscriptionCheck>
        <div className="fixed inset-0 bg-slate-950 flex flex-col">
          {/* Home Button at Top Center */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Launch Screen - Clickable Area */}
          <div
            className="flex-1 flex items-center justify-center cursor-pointer select-none group transition-all duration-300 hover:bg-slate-900/20"
            onClick={() => {
              // TODO: Implement journal start action
              console.log("Starting journal...");
            }}
          >
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-6xl font-light text-slate-200 group-hover:text-white transition-colors duration-300">
                Tap or say Start
              </h1>
              <div className="w-16 h-1 bg-blue-500/30 mx-auto rounded-full group-hover:bg-blue-400/50 transition-colors duration-300" />

              {/* Subtle pulse animation to indicate interactivity */}
              <div className="flex justify-center mt-8">
                <div className="w-3 h-3 bg-blue-500/40 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </SubscriptionCheck>
    );
  }

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center">
              <InfoIcon size="14" />
              <span>
                This is a protected page only visible to authenticated users
              </span>
            </div>
          </header>

          {/* User Profile Section */}
          <section className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <UserCircle size={48} className="text-primary" />
              <div>
                <h2 className="font-semibold text-xl">User Profile</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 overflow-hidden">
              <pre className="text-xs font-mono max-h-48 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
