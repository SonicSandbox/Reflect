"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/client";
import { InfoIcon, UserCircle, Home, MapPin, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{
    temp: number;
    condition: string;
    location: string;
  } | null>(null);
  const [locationStep, setLocationStep] = useState<
    "none" | "requesting" | "zipcode"
  >("none");
  const [zipCode, setZipCode] = useState("");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const supabase = createClient();

  // State management for the journaling flow - moved to top to avoid conditional hook calls
  const [currentStep, setCurrentStep] = useState<
    | "launch"
    | "dailyBrief"
    | "scoreSelection"
    | "audioRecording"
    | "locationSetup"
  >("launch");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);

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
        .eq("user_id", user.id)
        .single();

      setUser(user);
      setUserProfile(profile);

      // Check if we have location data and fetch weather
      if (profile?.location_city || profile?.zip_code) {
        setWeatherLoading(true);
        await fetchWeather(profile);
        setWeatherLoading(false);
      }

      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const fetchWeather = async (profile: Tables<"users">) => {
    try {
      let location = "";
      if (profile.location_city && profile.location_state) {
        location = `${profile.location_city}, ${profile.location_state}`;
      } else if (profile.zip_code) {
        location = profile.zip_code;
      } else {
        return;
      }

      // For demo purposes, we'll use mock weather data
      // In a real app, you'd call a weather API like OpenWeatherMap
      setWeather({
        temp: Math.floor(Math.random() * 30) + 60, // Random temp between 60-90
        condition: ["Sunny", "Partly cloudy", "Cloudy", "Light rain"][
          Math.floor(Math.random() * 4)
        ],
        location: location, // Use the actual location from profile
      });
    } catch (error) {
      console.error("Error fetching weather:", error);
    }
  };

  const requestLocation = async () => {
    setLocationStep("requesting");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use reverse geocoding to get actual location
            // For demo, we'll simulate different cities based on coordinates
            let mockCity, mockState;

            // Simple coordinate-based city assignment for demo
            if (latitude > 40 && longitude < -100) {
              mockCity = "Denver";
              mockState = "CO";
            } else if (latitude > 40 && longitude > -100) {
              mockCity = "New York";
              mockState = "NY";
            } else if (latitude < 35 && longitude < -100) {
              mockCity = "Los Angeles";
              mockState = "CA";
            } else {
              mockCity = "Chicago";
              mockState = "IL";
            }

            await updateUserLocation({
              latitude,
              longitude,
              location_city: mockCity,
              location_state: mockState,
              location_country: "US",
            });

            setLocationStep("none");
          } catch (error) {
            console.error("Error updating location:", error);
            setLocationStep("zipcode");
          }
        },
        () => {
          // Geolocation failed, ask for zip code
          setLocationStep("zipcode");
        },
      );
    } else {
      // Geolocation not supported, ask for zip code
      setLocationStep("zipcode");
    }
  };

  const updateUserLocation = async (locationData: Partial<Tables<"users">>) => {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update(locationData)
      .eq("user_id", user.id);

    if (!error) {
      setUserProfile((prev) => (prev ? { ...prev, ...locationData } : null));
      if (locationData.location_city || locationData.zip_code) {
        await fetchWeather({
          ...userProfile,
          ...locationData,
        } as Tables<"users">);
      }
    }
  };

  const handleZipCodeSubmit = async () => {
    if (!zipCode.trim()) return;

    setWeatherLoading(true);

    // Simulate city lookup based on zip code for demo
    let cityFromZip, stateFromZip;
    const zip = zipCode.trim();

    // Simple zip code to city mapping for demo
    if (zip.startsWith("1")) {
      cityFromZip = "New York";
      stateFromZip = "NY";
    } else if (zip.startsWith("2")) {
      cityFromZip = "Washington";
      stateFromZip = "DC";
    } else if (zip.startsWith("3")) {
      cityFromZip = "Atlanta";
      stateFromZip = "GA";
    } else if (zip.startsWith("4")) {
      cityFromZip = "Louisville";
      stateFromZip = "KY";
    } else if (zip.startsWith("5")) {
      cityFromZip = "Des Moines";
      stateFromZip = "IA";
    } else if (zip.startsWith("6")) {
      cityFromZip = "Chicago";
      stateFromZip = "IL";
    } else if (zip.startsWith("7")) {
      cityFromZip = "Dallas";
      stateFromZip = "TX";
    } else if (zip.startsWith("8")) {
      cityFromZip = "Denver";
      stateFromZip = "CO";
    } else if (zip.startsWith("9")) {
      cityFromZip = "Los Angeles";
      stateFromZip = "CA";
    } else {
      cityFromZip = "Phoenix";
      stateFromZip = "AZ";
    }

    await updateUserLocation({
      zip_code: zipCode,
      location_city: cityFromZip,
      location_state: stateFromZip,
      location_country: "US",
    });

    setLocationStep("none");
    setZipCode("");
    setLocationDialogOpen(false);
    setWeatherLoading(false);
  };

  const handleLocationReset = () => {
    setLocationDialogOpen(true);
    setLocationStep("none");
  };

  const handleLocationDialogClose = () => {
    setLocationDialogOpen(false);
    setLocationStep("none");
    setZipCode("");
  };

  const requestLocationFromDialog = async () => {
    setLocationStep("requesting");
    setWeatherLoading(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use reverse geocoding to get actual location
            // For demo, we'll simulate different cities based on coordinates
            let mockCity, mockState;

            // Simple coordinate-based city assignment for demo
            if (latitude > 40 && longitude < -100) {
              mockCity = "Denver";
              mockState = "CO";
            } else if (latitude > 40 && longitude > -100) {
              mockCity = "New York";
              mockState = "NY";
            } else if (latitude < 35 && longitude < -100) {
              mockCity = "Los Angeles";
              mockState = "CA";
            } else {
              mockCity = "Chicago";
              mockState = "IL";
            }

            await updateUserLocation({
              latitude,
              longitude,
              location_city: mockCity,
              location_state: mockState,
              location_country: "US",
            });

            setLocationStep("none");
            setLocationDialogOpen(false);
            setWeatherLoading(false);
          } catch (error) {
            console.error("Error updating location:", error);
            setLocationStep("zipcode");
            setWeatherLoading(false);
          }
        },
        () => {
          // Geolocation failed, ask for zip code
          setLocationStep("zipcode");
          setWeatherLoading(false);
        },
      );
    } else {
      // Geolocation not supported, ask for zip code
      setLocationStep("zipcode");
      setWeatherLoading(false);
    }
  };

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
            className={`flex-1 flex items-center justify-center cursor-pointer select-none group transition-all duration-500 hover:bg-slate-900/20 ${
              currentStep !== "launch"
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
            onClick={() => {
              setCurrentStep("dailyBrief");
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

          {/* Daily Brief Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
              currentStep === "dailyBrief"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="w-full max-w-sm mx-auto px-6">
              {/* Date Header */}
              <div className="text-center mb-8">
                <p className="text-slate-400 text-sm mb-2">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h2 className="text-3xl font-light text-blue-300 mb-6">
                  Daily Brief
                </h2>
              </div>

              {/* Sleep Rating */}
              <div className="bg-slate-800/60 rounded-xl p-4 mb-4 text-center">
                <p className="text-slate-400 text-sm mb-1">Sleep</p>
                <p className="text-3xl font-light text-slate-200">10</p>
              </div>

              {/* Weather */}
              {!userProfile?.location_city && !userProfile?.zip_code ? (
                <div className="bg-slate-800/60 rounded-xl p-4 mb-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-3">
                      Set your location for weather
                    </p>
                    <Button
                      onClick={requestLocation}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      disabled={locationStep === "requesting" || weatherLoading}
                    >
                      {locationStep === "requesting" || weatherLoading
                        ? "Getting location..."
                        : "Get Weather"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-slate-800/60 rounded-xl p-4 mb-4 flex items-center justify-between group hover:bg-slate-700/60 transition-colors duration-200 cursor-pointer relative"
                  onClick={handleLocationReset}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-300">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2a.75.75 0 000-1.5.75.75 0 000 1.5zm0 0a.75.75 0 000 1.5.75.75 0 000-1.5zm1.5-6.5a.75.75 0 000-1.5.75.75 0 000 1.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-slate-200 text-lg font-light">
                      {weatherLoading
                        ? "Loading..."
                        : weather?.location ||
                          userProfile?.location_city ||
                          "Loading..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 text-lg font-light">
                      {weatherLoading
                        ? "..."
                        : weather
                          ? `${weather.temp}° ${weather.condition}`
                          : "Loading..."}
                    </span>
                    <MapPin className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              )}

              {/* Focus Point */}
              <div className="bg-slate-800/60 rounded-xl p-4 mb-8">
                <p className="text-slate-400 text-sm mb-2">Focus Point</p>
                <p className="text-slate-200 text-lg font-light">
                  Complete project presentation
                </p>
              </div>

              {/* Score Selection Prompt */}
              <div className="text-center mb-6">
                <p className="text-slate-300 text-lg font-light mb-4">
                  How would you rate your day so far?
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => {
                        setSelectedScore(score);
                        // Move to next step after selection
                        setTimeout(() => {
                          setCurrentStep("audioRecording");
                        }, 500);
                      }}
                      className={`aspect-square rounded-xl text-lg font-light transition-all duration-200 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:scale-105 active:scale-95 ${
                        selectedScore === score
                          ? "bg-blue-500 text-white scale-105"
                          : ""
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Score Selection Confirmation Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
              currentStep === "scoreSelection"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="text-center">
              <h2 className="text-3xl font-light text-slate-200 mb-4">
                You rated your day: {selectedScore}/10
              </h2>
              <p className="text-slate-400 mb-8">
                Moving to voice recording...
              </p>
            </div>
          </div>

          {/* Location Setup Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              locationStep === "zipcode"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="w-full max-w-sm mx-auto px-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-light text-slate-200 mb-4">
                  Enter Your Zip Code
                </h2>
                <p className="text-slate-400 text-sm">
                  We'll use this to get your local weather
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="12345"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  maxLength={10}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => setLocationStep("none")}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleZipCodeSubmit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!zipCode.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Recording Screen Placeholder */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "audioRecording"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center">
              <h2 className="text-3xl font-light text-slate-200 mb-4">
                Ready to listen...
              </h2>
              <p className="text-slate-400">
                Audio recording will be implemented next
              </p>
            </div>
          </div>

          {/* Location Reset Dialog */}
          <Dialog
            open={locationDialogOpen}
            onOpenChange={handleLocationDialogClose}
          >
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-200 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Update Location
                </DialogTitle>
              </DialogHeader>

              {locationStep === "none" && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Choose how you'd like to update your location for weather
                    information.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={requestLocationFromDialog}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      disabled={weatherLoading}
                    >
                      <MapPin className="w-4 h-4" />
                      {weatherLoading
                        ? "Getting location..."
                        : "Use Current Location"}
                    </Button>
                    <Button
                      onClick={() => setLocationStep("zipcode")}
                      variant="outline"
                      className="border-slate-600 text-slate-200 hover:bg-slate-800"
                    >
                      Enter Zip Code
                    </Button>
                  </div>
                </div>
              )}

              {locationStep === "requesting" && (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Getting your location...</p>
                </div>
              )}

              {locationStep === "zipcode" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="zipcode" className="text-slate-300">
                      Zip Code
                    </Label>
                    <Input
                      id="zipcode"
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="12345"
                      className="bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 mt-1"
                      maxLength={10}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setLocationStep("none")}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-800"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleZipCodeSubmit}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!zipCode.trim() || weatherLoading}
                    >
                      {weatherLoading ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
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
