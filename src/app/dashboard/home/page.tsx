"use client";

import { createClient } from "../../../../supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Edit, RotateCcw, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<JournalEntry | null>(null);
  const [redoDialogOpen, setRedoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Add effect to refresh entries when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log("Page became visible, refreshing entries...");
        fetchEntries(user.id);
      }
    };

    const handleFocus = () => {
      if (user) {
        console.log("Window focused, refreshing entries...");
        fetchEntries(user.id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, supabase]);

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
    setIsEditing(false);
    setEditedEntry(null);
  };

  const handleEditEntry = () => {
    if (selectedEntry) {
      setEditedEntry({ ...selectedEntry });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEntry(null);
  };

  const handleSaveEdit = async () => {
    if (!editedEntry || !user) {
      console.log("Save failed: missing editedEntry or user", {
        editedEntry: !!editedEntry,
        user: !!user,
      });
      return;
    }

    setSaving(true);
    try {
      console.log("Saving entry with ID:", editedEntry.id);
      console.log("Updated data:", {
        content: editedEntry.content,
        mood_score: editedEntry.mood_score,
        follow_up_question: editedEntry.follow_up_question || null,
        follow_up_response: editedEntry.follow_up_response || null,
        emotions:
          editedEntry.emotions && editedEntry.emotions.length > 0
            ? editedEntry.emotions
            : null,
        topics:
          editedEntry.topics && editedEntry.topics.length > 0
            ? editedEntry.topics
            : null,
      });

      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          content: editedEntry.content,
          mood_score: editedEntry.mood_score,
          follow_up_question: editedEntry.follow_up_question || null,
          follow_up_response: editedEntry.follow_up_response || null,
          emotions:
            editedEntry.emotions && editedEntry.emotions.length > 0
              ? editedEntry.emotions
              : null,
          topics:
            editedEntry.topics && editedEntry.topics.length > 0
              ? editedEntry.topics
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editedEntry.id)
        .select();

      if (error) {
        console.error("Error updating entry:", error);
        alert(`Failed to save: ${error.message}`);
        return;
      }

      console.log("Entry updated successfully:", data);

      // Update the selected entry and entries list
      setSelectedEntry(editedEntry);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editedEntry.id ? editedEntry : entry,
        ),
      );
      setIsEditing(false);
      setEditedEntry(null);

      console.log("State updated, should exit edit mode");
    } catch (error) {
      console.error("Error saving entry:", error);
      alert(
        `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRedoJournal = async () => {
    if (!selectedEntry || !user) return;

    try {
      // Delete the current entry
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", selectedEntry.id);

      if (error) {
        console.error("Error deleting entry:", error);
        return;
      }

      // Redirect to dashboard to start new journal
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error redoing journal:", error);
    }
  };

  const addTag = (type: "emotions" | "topics", tag: string) => {
    if (!editedEntry || !tag.trim()) return;

    const currentTags = editedEntry[type] || [];
    if (!currentTags.includes(tag.trim())) {
      setEditedEntry({
        ...editedEntry,
        [type]: [...currentTags, tag.trim()],
      });
    }
  };

  const removeTag = (type: "emotions" | "topics", tagToRemove: string) => {
    if (!editedEntry) return;

    const currentTags = editedEntry[type] || [];
    setEditedEntry({
      ...editedEntry,
      [type]: currentTags.filter((tag) => tag !== tagToRemove),
    });
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
            onClick={isEditing ? handleCancelEdit : handleBackToList}
            variant="ghost"
            size="icon"
            className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
          >
            {isEditing ? (
              <X className="h-5 w-5" />
            ) : (
              <ArrowLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={handleEditEntry}
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setRedoDialogOpen(true)}
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                >
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
            </>
          ) : (
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              variant="ghost"
              size="icon"
              className="rounded-full bg-green-600/50 hover:bg-green-500/50 text-white"
            >
              <Save className="h-5 w-5" />
            </Button>
          )}
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
                {isEditing ? "Edit Journal Entry" : "Journal Entry"}
              </h2>
              <p className="text-slate-400 text-sm">
                {formatDate(selectedEntry.date).dayOfWeek},{" "}
                {formatDate(selectedEntry.date).formattedDate}
              </p>
              {isEditing ? (
                <div className="mt-4">
                  <Label className="text-slate-400 text-sm">
                    Mood Score (1-10):
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={editedEntry?.mood_score || ""}
                    onChange={(e) =>
                      setEditedEntry((prev) =>
                        prev
                          ? {
                              ...prev,
                              mood_score: parseInt(e.target.value) || null,
                            }
                          : null,
                      )
                    }
                    className="w-20 mx-auto mt-1 bg-slate-800/60 border-slate-600 text-slate-200"
                  />
                </div>
              ) : (
                selectedEntry.mood_score && (
                  <p className="text-slate-400 text-sm mt-1">
                    Mood Score: {selectedEntry.mood_score}/10
                  </p>
                )
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                <p className="text-slate-400 text-xs mb-2">Journal Entry:</p>
                {isEditing ? (
                  <Textarea
                    value={editedEntry?.content || ""}
                    onChange={(e) =>
                      setEditedEntry((prev) =>
                        prev
                          ? {
                              ...prev,
                              content: e.target.value,
                            }
                          : null,
                      )
                    }
                    className="bg-slate-700/60 border-slate-600 text-slate-200 min-h-[100px]"
                    placeholder="Enter your journal entry..."
                  />
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {selectedEntry.content || "No content available"}
                  </p>
                )}
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                <p className="text-slate-400 text-xs mb-2">
                  Follow-up Question:
                </p>
                {isEditing ? (
                  <Textarea
                    value={editedEntry?.follow_up_question || ""}
                    onChange={(e) =>
                      setEditedEntry((prev) =>
                        prev
                          ? {
                              ...prev,
                              follow_up_question: e.target.value,
                            }
                          : null,
                      )
                    }
                    className="bg-slate-700/60 border-slate-600 text-slate-200 mb-3"
                    placeholder="Enter follow-up question..."
                  />
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    {selectedEntry.follow_up_question ||
                      "No follow-up question"}
                  </p>
                )}
                <p className="text-slate-400 text-xs mb-2">Your Response:</p>
                {isEditing ? (
                  <Textarea
                    value={editedEntry?.follow_up_response || ""}
                    onChange={(e) =>
                      setEditedEntry((prev) =>
                        prev
                          ? {
                              ...prev,
                              follow_up_response: e.target.value,
                            }
                          : null,
                      )
                    }
                    className="bg-slate-700/60 border-slate-600 text-slate-200"
                    placeholder="Enter your response..."
                  />
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {selectedEntry.follow_up_response ||
                      "No response available"}
                  </p>
                )}
              </div>

              {/* Tags Section */}
              <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                <p className="text-slate-400 text-xs mb-3">Tags:</p>

                {/* Emotions */}
                <div className="mb-3">
                  <p className="text-slate-500 text-xs mb-2">Emotions:</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(isEditing
                      ? editedEntry?.emotions
                      : selectedEntry.emotions
                    )?.map((emotion, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                      >
                        {emotion}
                        {isEditing && (
                          <button
                            onClick={() => removeTag("emotions", emotion)}
                            className="ml-1 text-blue-400 hover:text-blue-200 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    )) || (
                      <span className="text-slate-500 text-xs">
                        No emotions tagged
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add emotion tag..."
                        className="flex-1 bg-slate-700/60 border-slate-600 text-slate-200 text-xs h-8"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            addTag("emotions", e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Topics */}
                <div>
                  <p className="text-slate-500 text-xs mb-2">Topics:</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(isEditing
                      ? editedEntry?.topics
                      : selectedEntry.topics
                    )?.map((topic, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full"
                      >
                        {topic}
                        {isEditing && (
                          <button
                            onClick={() => removeTag("topics", topic)}
                            className="ml-1 text-green-400 hover:text-green-200 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    )) || (
                      <span className="text-slate-500 text-xs">
                        No topics tagged
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add topic tag..."
                        className="flex-1 bg-slate-700/60 border-slate-600 text-slate-200 text-xs h-8"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            addTag("topics", e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Redo Confirmation Dialog */}
        <Dialog open={redoDialogOpen} onOpenChange={setRedoDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-200 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-400" />
                Redo Today's Journal
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <p className="text-orange-300 text-sm font-medium mb-2">
                  ⚠️ Warning: This action cannot be undone
                </p>
                <p className="text-slate-300 text-sm">
                  This will permanently delete your current journal entry and
                  allow you to start over with today's journaling session.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setRedoDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRedoJournal}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Redo Journal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
