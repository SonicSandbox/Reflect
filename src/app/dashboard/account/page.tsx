"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../supabase/client";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User as UserIcon, CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

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

      // Get user profile from our users table
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      setUser(user);
      setUserProfile(profile);

      // Parse the full name into first and last name
      if (profile?.name || profile?.full_name) {
        const fullName = profile.name || profile.full_name || "";
        const nameParts = fullName.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      // Set location data
      setCity(profile?.location_city || "");
      setState(profile?.location_state || "");
      setZipCode(profile?.zip_code || "");

      // Check for active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      setHasActiveSubscription(!!subscription);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleSave = async () => {
    console.log("🔥 handleSave function called!");
    console.log("User:", user);
    console.log("UserProfile:", userProfile);

    if (!user || !userProfile) {
      console.log("❌ Early return - missing user or userProfile");
      return;
    }

    console.log("✅ Starting save process...");
    setSaving(true);
    setMessage(null);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      console.log("📝 Form data:", {
        firstName,
        lastName,
        fullName,
        city,
        state,
        zipCode,
      });

      const updateData: Partial<Tables<"users">> = {
        name: fullName,
        full_name: fullName,
        location_city: city.trim() || null,
        location_state: state.trim() || null,
        zip_code: zipCode.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log("📤 Update data:", updateData);
      console.log("🔑 User ID:", user.id);

      const { error, data } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id)
        .select();

      console.log("📥 Supabase response:", { data, error });

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Update successful!");
      // Update local state
      setUserProfile((prev) => (prev ? { ...prev, ...updateData } : null));
      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("💥 Error updating profile:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      console.log("🏁 Setting saving to false");
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-customer-portal",
        {
          body: {
            user_id: user.id,
            return_url: `${window.location.origin}/dashboard/account`,
          },
        },
      );

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      setMessage({
        type: "error",
        text: "Failed to open subscription management. Please try again.",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/home">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-light text-slate-200">
              Account Settings
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your profile information
            </p>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/30 text-green-300"
                : "bg-red-500/20 border border-red-500/30 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Subscription Management */}
        {hasActiveSubscription && (
          <Card className="bg-slate-900/50 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                Subscription Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Manage your subscription, update payment methods, or cancel your
                plan.
              </p>
              <Button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center gap-2"
              >
                {loadingPortal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Opening...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Manage Subscription
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Form */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-400" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <Label
                htmlFor="email"
                className="text-slate-300 text-sm font-medium"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="mt-2 bg-slate-800/50 border-slate-600 text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="firstName"
                  className="text-slate-300 text-sm font-medium"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="mt-2 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="lastName"
                  className="text-slate-300 text-sm font-medium"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  className="mt-2 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Location Fields */}
            <div className="space-y-4">
              <h3 className="text-slate-300 font-medium">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="city"
                    className="text-slate-300 text-sm font-medium"
                  >
                    City
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter your city"
                    className="mt-2 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="state"
                    className="text-slate-300 text-sm font-medium"
                  >
                    State
                  </Label>
                  <Input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enter your state"
                    className="mt-2 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="md:w-1/2">
                <Label
                  htmlFor="zipCode"
                  className="text-slate-300 text-sm font-medium"
                >
                  Zip Code
                </Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Enter your zip code"
                  className="mt-2 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
