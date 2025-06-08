"use client";

import { createClient } from "../../../../supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";
import { redirect } from "next/navigation";

interface JournalEntry extends Tables<"journal_entries"> {
  emotions?: string[] | null;
  topics?: string[] | null;
  follow_up_question?: string | null;
  follow_up_response?: string | null;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
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
      await fetchEntries(user.id);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const fetchEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching entries:", error);
        return;
      }

      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return { dayOfWeek, formattedDate };
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const handleEntryClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
  };

  const handleBackToList = () => {
    setSelectedEntry(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-center relative">
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-light">
            Loading your entries...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show detailed entry view when an entry is selected
  if (selectedEntry) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col">
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            onClick={handleBackToList}
            variant="ghost"
            size="icon"
            className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Home Button */}
        <div className="absolute top-4 right-4 z-10">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Entry Detail View */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-light text-slate-200 mb-2">
                Journal Entry
              </h2>
              <p className="text-slate-400 text-sm">
                {formatDate(selectedEntry.date).dayOfWeek},{" "}
                {formatDate(selectedEntry.date).formattedDate}
              </p>
              {selectedEntry.mood_score && (
                <p className="text-slate-400 text-sm mt-1">
                  Mood Score: {selectedEntry.mood_score}/10
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                <p className="text-slate-400 text-xs mb-2">Journal Entry:</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {selectedEntry.content}
                </p>
              </div>

              {selectedEntry.follow_up_question && (
                <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                  <p className="text-slate-400 text-xs mb-2">
                    Follow-up Question:
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    {selectedEntry.follow_up_question}
                  </p>
                  {selectedEntry.follow_up_response && (
                    <>
                      <p className="text-slate-400 text-xs mb-2">
                        Your Response:
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {selectedEntry.follow_up_response}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Tags Section */}
              {(selectedEntry.emotions?.length ||
                selectedEntry.topics?.length) && (
                <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                  <p className="text-slate-400 text-xs mb-3">Tags:</p>

                  {/* Emotions */}
                  {selectedEntry.emotions &&
                    selectedEntry.emotions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-slate-500 text-xs mb-2">Emotions:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.emotions.map((emotion, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                            >
                              {emotion}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Topics */}
                  {selectedEntry.topics && selectedEntry.topics.length > 0 && (
                    <div>
                      <p className="text-slate-500 text-xs mb-2">Topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.topics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-slate-200">
                Journal Entries
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6 bg-slate-800/60 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-light text-slate-300 mb-2">
              No journal entries yet
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Start your journaling journey by creating your first entry
            </p>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                Create First Entry
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const { dayOfWeek, formattedDate } = formatDate(entry.date);
              return (
                <Card
                  key={entry.id}
                  className="bg-slate-800/60 border-slate-700 hover:bg-slate-700/60 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleEntryClick(entry)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-slate-200 group-hover:text-white transition-colors">
                            {dayOfWeek}
                          </h3>
                          <span className="text-slate-400 text-sm">
                            {formattedDate}
                          </span>
                        </div>
                        {entry.mood_score && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-slate-400 text-sm">
                              Mood:
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-blue-400 font-medium">
                                {entry.mood_score}
                              </span>
                              <span className="text-slate-500 text-sm">
                                /10
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-slate-500 group-hover:text-slate-400 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-300 text-sm leading-relaxed group-hover:text-slate-200 transition-colors">
                        {truncateText(entry.content)}
                      </p>
                    </div>

                    {/* Tags Preview */}
                    {(entry.emotions?.length || entry.topics?.length) && (
                      <div className="flex flex-wrap gap-2">
                        {entry.emotions?.slice(0, 3).map((emotion, index) => (
                          <span
                            key={`emotion-${index}`}
                            className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                          >
                            {emotion}
                          </span>
                        ))}
                        {entry.topics?.slice(0, 3).map((topic, index) => (
                          <span
                            key={`topic-${index}`}
                            className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                        {(entry.emotions?.length || 0) +
                          (entry.topics?.length || 0) >
                          6 && (
                          <span className="px-2 py-1 bg-slate-600/40 text-slate-400 text-xs rounded-full">
                            +
                            {(entry.emotions?.length || 0) +
                              (entry.topics?.length || 0) -
                              6}{" "}
                            more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
