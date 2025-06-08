"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/client";
import {
  InfoIcon,
  UserCircle,
  Home,
  MapPin,
  RefreshCw,
  Mic,
} from "lucide-react";
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
    | "questionDisplay"
    | "audioRecording"
    | "processing"
    | "followUpQuestion"
    | "followUpRecording"
    | "followUpProcessing"
    | "complete"
    | "locationSetup"
  >("launch");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [journalText, setJournalText] = useState<string>("");
  const [followUpQuestion, setFollowUpQuestion] = useState<string>("");
  const [followUpResponse, setFollowUpResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<{
    emotions?: string[];
    topics?: string[];
  } | null>(null);
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(null);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [hasJournaledToday, setHasJournaledToday] = useState<boolean | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

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

  const removeTag = (tagToRemove: string, type: "emotion" | "topic") => {
    if (type === "emotion" && generatedTags?.emotions) {
      setGeneratedTags({
        ...generatedTags,
        emotions: generatedTags.emotions.filter((tag) => tag !== tagToRemove),
      });
    } else if (type === "topic" && generatedTags?.topics) {
      setGeneratedTags({
        ...generatedTags,
        topics: generatedTags.topics.filter((tag) => tag !== tagToRemove),
      });
    }
    // Also remove from custom tags if it exists there
    setCustomTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const addCustomTag = async () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      const tagToAdd = newTag.trim();
      setCustomTags((prev) => [...prev, tagToAdd]);
      setNewTag("");

      // If we have a current journal entry, update it immediately
      if (currentJournalId) {
        await updateJournalTags(currentJournalId, [...customTags, tagToAdd]);
      }
    }
  };

  const updateJournalTags = async (journalId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({ tags: tags })
        .eq("id", journalId);

      if (error) {
        console.error("Error updating tags:", error);
        alert("Failed to update tags");
      } else {
        console.log("Tags updated successfully:", tags);
      }
    } catch (error) {
      console.error("Error updating tags:", error);
      alert("Failed to update tags");
    }
  };

  const removeCustomTag = async (tagToRemove: string) => {
    const updatedTags = customTags.filter((tag) => tag !== tagToRemove);
    setCustomTags(updatedTags);

    // If we have a current journal entry, update it immediately
    if (currentJournalId) {
      await updateJournalTags(currentJournalId, updatedTags);
    }
  };

  const questions = [
    "What was the highlight of your day?",
    "What were the 3 parts of your day?",
    "What is something you want to remember about today?",
  ];

  const startQuestionDisplay = () => {
    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setDisplayedWords([]);

    const words = randomQuestion.split(" ");
    words.forEach((word, index) => {
      setTimeout(() => {
        setDisplayedWords((prev) => [...prev, word]);

        // Start recording after the last word appears
        if (index === words.length - 1) {
          setTimeout(() => {
            setCurrentStep("audioRecording");
            startRecording();
          }, 1000);
        }
      }, index * 150); // 150ms delay between words
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        processAudio(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setCurrentStep("processing");
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      // Send to webhook endpoint
      const webhookUrl = process.env.NEXT_PUBLIC_SPEECH_TO_TEXT_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error("Speech-to-text webhook URL not configured");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });

      let result;
      let responseText = "";

      try {
        responseText = await response.text();
        // Try to parse as JSON
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        result = {
          error: `Invalid JSON response: ${responseText.substring(0, 200)}...`,
        };
      }

      if (!response.ok || result.error) {
        // Handle error response with more details
        let errorMessage = "";

        if (response.status === 500) {
          errorMessage = `Server error (500): ${result.error || result.message || responseText || "Internal server error"}`;
        } else if (response.status === 400) {
          errorMessage = `Bad request (400): ${result.error || result.message || "Invalid request format"}`;
        } else if (response.status === 413) {
          errorMessage = `File too large (413): Audio file exceeds size limit`;
        } else if (response.status === 429) {
          errorMessage = `Rate limited (429): Too many requests, please try again later`;
        } else {
          errorMessage =
            result.error ||
            result.message ||
            `HTTP error! status: ${response.status}`;
        }

        console.error("Webhook error details:", {
          status: response.status,
          statusText: response.statusText,
          result,
          responseText: responseText.substring(0, 500),
        });

        setJournalText(`Error processing audio: ${errorMessage}`);
        setCurrentStep("complete");
        return;
      }

      // Handle successful response - extract text-to-speech and follow-up-q
      let transcription = "";
      let followUpQ = "";

      // Process webhook response for transcription extraction

      // Handle array response format like [{"response": {"body": {"text-to-speech": "..."}}}]
      let actualData = result;
      if (Array.isArray(result) && result.length > 0) {
        if (result[0].response && result[0].response.body) {
          actualData = result[0].response.body;
        } else if (result[0].body) {
          actualData = result[0].body;
        } else {
          actualData = result[0];
        }
      }

      // Now extract transcription from the actual data
      if (actualData && actualData["text-to-speech"]) {
        transcription = actualData["text-to-speech"];
      } else if (actualData && actualData.text) {
        transcription = actualData.text;
      } else if (actualData && actualData.transcription) {
        transcription = actualData.transcription;
      } else if (actualData && actualData.transcript) {
        transcription = actualData.transcript;
      } else if (typeof actualData === "string") {
        // Sometimes the entire response is just the transcription string
        transcription = actualData;
      } else {
        // If we can't find the transcription, show what we got
        console.error(
          "No transcription found in response. Full actualData:",
          actualData,
        );
        transcription = `Error: No transcription found in response. Please check the webhook response format.`;
      }

      // Extract follow-up question from actual data
      if (actualData && actualData["follow-up-q"]) {
        followUpQ = actualData["follow-up-q"];
      }

      // Validate transcription before proceeding
      const cleanTranscription = transcription ? transcription.trim() : "";

      // Don't save if transcription is empty or an error message
      if (cleanTranscription.length === 0) {
        console.error("Transcription is empty after processing");
        setJournalText(
          "Error: No transcription received from speech-to-text service",
        );
        setCurrentStep("complete");
        return;
      }

      if (cleanTranscription.startsWith("Error:")) {
        console.error(
          "Transcription contains error message:",
          cleanTranscription,
        );
        setJournalText(cleanTranscription);
        setCurrentStep("complete");
        return;
      }

      setJournalText(cleanTranscription);
      setFollowUpQuestion(followUpQ);

      // If we have a follow-up question, show it; otherwise complete
      if (followUpQ && followUpQ.trim()) {
        setCurrentStep("followUpQuestion");
        // Auto-start recording after showing the follow-up question
        setTimeout(() => {
          setCurrentStep("followUpRecording");
          startFollowUpRecording(cleanTranscription, followUpQ);
        }, 3000);
      } else {
        // Save to database without follow-up
        await saveJournalEntry(
          cleanTranscription,
          null,
          null,
          null, // No auto tags
          selectedScore,
        );
        setCurrentStep("complete");
      }
    } catch (error) {
      console.error("Error processing audio:", error);

      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorMessage =
            "Network error: Unable to connect to speech-to-text service";
        } else {
          errorMessage = error.message;
        }
      }

      setJournalText(`Error processing audio: ${errorMessage}`);
      setCurrentStep("complete");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTags = async (responses: {
    initial: string;
    followUp?: string;
  }): Promise<{ emotions?: string[]; topics?: string[] } | null> => {
    try {
      const tagGenerationApiKey =
        process.env.NEXT_PUBLIC_TAG_GENERATION_API_KEY;

      console.log("Tag generation config:", {
        hasApiKey: !!tagGenerationApiKey,
      });

      if (!tagGenerationApiKey) {
        console.log("Tag generation API key not configured");
        return null;
      }

      const payload = {
        model: "gemini-1.5-flash",
        contents: [
          {
            parts: [
              {
                text: `Analyze the following journal entry and generate relevant tags. Return a JSON object with "emotions" and "topics" arrays.

Journal Entry: "${responses.initial}"
${responses.followUp ? `Follow-up Response: "${responses.followUp}"` : ""}

Please return only a JSON object in this format:
{
  "emotions": ["emotion1", "emotion2"],
  "topics": ["topic1", "topic2"]
}

Limit to 3-5 emotions and 3-5 topics maximum.`,
              },
            ],
          },
        ],
      };

      console.log("Sending tag generation request to Gemini API");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${tagGenerationApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      console.log("Tag generation response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Tag generation failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        return null;
      }

      const result = await response.json();
      console.log("Gemini API response:", result);

      // Extract text from Gemini response
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        console.error("No text found in Gemini response");
        return null;
      }

      // Parse JSON from the generated text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in generated text:", generatedText);
        return null;
      }

      const tags = JSON.parse(jsonMatch[0]);
      console.log("Generated tags:", tags);
      setGeneratedTags(tags);
      return tags;
    } catch (error) {
      console.error("Error generating tags:", error);
      return null;
    }
  };

  const saveJournalEntry = async (
    text: string,
    followUpQ?: string | null,
    followUpResp?: string | null,
    tags?: { emotions?: string[]; topics?: string[] } | null,
    moodScore?: number | null,
  ) => {
    if (!user) {
      console.error("No user found when trying to save journal entry");
      return;
    }

    // More robust validation
    if (text === null || text === undefined || typeof text !== "string") {
      console.error(
        "Cannot save journal entry: text is null, undefined, or not a string",
      );
      alert(
        "Cannot save journal entry: No content to save. Please try recording again.",
      );
      return;
    }

    const cleanText = text.trim();

    if (cleanText.length === 0) {
      console.error("Cannot save journal entry: text is empty after trimming");
      alert(
        "Cannot save journal entry: No content to save. Please try recording again.",
      );
      return;
    }

    // Additional validation for error messages
    if (cleanText.startsWith("Error:")) {
      console.error(
        "Cannot save journal entry: content contains error message",
      );
      alert(
        "Cannot save journal entry: There was an error processing your audio. Please try again.",
      );
      return;
    }

    try {
      // Use server action instead of direct client insert
      const formData = new FormData();
      const currentDate = new Date().toISOString().split("T")[0];
      const currentMoodScore = moodScore || selectedScore;

      // Append data to FormData
      formData.append("content", cleanText);
      formData.append("date", currentDate);

      if (currentMoodScore !== null && currentMoodScore !== undefined) {
        formData.append("mood_score", currentMoodScore.toString());
      }
      if (followUpQ && followUpQ.trim()) {
        formData.append("follow_up_question", followUpQ.trim());
      }
      if (followUpResp && followUpResp.trim()) {
        formData.append("follow_up_response", followUpResp.trim());
      }

      // Add tags if available
      const allTags: string[] = [];
      if (tags?.emotions && tags.emotions.length > 0) {
        allTags.push(...tags.emotions);
      }
      if (tags?.topics && tags.topics.length > 0) {
        allTags.push(...tags.topics);
      }
      if (customTags.length > 0) {
        allTags.push(...customTags);
      }
      if (allTags.length > 0) {
        formData.append("tags", JSON.stringify(allTags));
      }

      // Add weather data if available
      if (weather) {
        formData.append("weather", JSON.stringify(weather));
      }

      const { saveJournalEntryAction } = await import("../actions");
      const result = await saveJournalEntryAction(formData);

      if (result.error) {
        console.error("Error saving journal entry:", result.error);
        alert(`Failed to save journal entry: ${result.error}`);
      } else if (result.data) {
        // Store the journal entry ID for later tag updates
        setCurrentJournalId(result.data.id);
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      alert(
        `Failed to save journal entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const startFollowUpRecording = async (
    initialText?: string,
    followUpQ?: string,
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        processFollowUpAudio(blob, initialText, followUpQ);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting follow-up recording:", error);
    }
  };

  const stopFollowUpRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setCurrentStep("followUpProcessing");
    }
  };

  const processFollowUpAudio = async (
    audioBlob: Blob,
    initialText?: string,
    followUpQ?: string,
  ) => {
    setIsProcessing(true);

    // Use passed parameters or fall back to state
    const currentJournalText = initialText || journalText;
    const currentFollowUpQuestion = followUpQ || followUpQuestion;

    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "followup-recording.wav");

      // Send to webhook endpoint
      const webhookUrl = process.env.NEXT_PUBLIC_SPEECH_TO_TEXT_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error("Speech-to-text webhook URL not configured");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });

      let result;
      let responseText = "";

      try {
        responseText = await response.text();
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        result = {
          error: `Invalid JSON response: ${responseText.substring(0, 200)}...`,
        };
      }

      if (!response.ok || result.error) {
        let errorMessage =
          result.error ||
          result.message ||
          `HTTP error! status: ${response.status}`;
        setFollowUpResponse(`Error processing audio: ${errorMessage}`);

        if (currentJournalText && currentJournalText.trim().length > 0) {
          await saveJournalEntry(
            currentJournalText,
            currentFollowUpQuestion,
            `Error: ${errorMessage}`,
            null, // No auto tags
            selectedScore,
          );
        } else {
          console.error("ERROR: Empty journal text in error handler");
          alert(
            "Error: Cannot save journal entry because the initial response is missing. Please try recording again.",
          );
        }
        setCurrentStep("complete");
        return;
      }

      // Extract transcription from follow-up response
      let transcription = "";

      // Handle array response format for follow-up as well
      let actualData = result;
      if (Array.isArray(result) && result.length > 0) {
        if (result[0].response && result[0].response.body) {
          actualData = result[0].response.body;
        } else if (result[0].body) {
          actualData = result[0].body;
        } else {
          actualData = result[0];
        }
      }

      if (actualData && actualData["text-to-speech"]) {
        transcription = actualData["text-to-speech"];
      } else if (actualData && actualData.text) {
        transcription = actualData.text;
      } else if (actualData && actualData.transcription) {
        transcription = actualData.transcription;
      } else if (actualData && actualData.transcript) {
        transcription = actualData.transcript;
      } else if (typeof actualData === "string") {
        transcription = actualData;
      } else {
        transcription = `No transcription found in follow-up response`;
      }

      const cleanFollowUpTranscription = transcription
        ? transcription.trim()
        : "";

      setFollowUpResponse(cleanFollowUpTranscription);

      if (!currentJournalText || currentJournalText.trim().length === 0) {
        console.error(
          "ERROR: journalText is empty when trying to save follow-up response",
        );
        alert(
          "Error: Initial journal text is missing. This might be due to a state management issue. Please try recording your journal entry again from the beginning.",
        );
        setCurrentStep("complete");
        return;
      }

      await saveJournalEntry(
        currentJournalText,
        currentFollowUpQuestion,
        cleanFollowUpTranscription,
        null, // No auto tags
        selectedScore,
      );
      setCurrentStep("complete");
    } catch (error) {
      console.error("Error processing follow-up audio:", error);

      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setFollowUpResponse(`Error processing audio: ${errorMessage}`);

      if (currentJournalText && currentJournalText.trim().length > 0) {
        await saveJournalEntry(
          currentJournalText,
          currentFollowUpQuestion,
          `Error: ${errorMessage}`,
          null, // No auto tags
          selectedScore,
        );
      } else {
        console.error("ERROR: Empty journal text in catch handler");
        alert(
          "Error: Cannot save journal entry because the initial response is missing. Please try recording again.",
        );
      }
      setCurrentStep("complete");
    } finally {
      setIsProcessing(false);
    }
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

  // Move useEffect hooks before any conditional returns to avoid hook order issues
  useEffect(() => {
    const checkTodayEntry = async () => {
      if (!user || !mounted) return;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (data) {
        // User has already journaled today, redirect to home
        window.location.href = "/dashboard/home";
      } else {
        setHasJournaledToday(false);
      }
    };

    if (user && !loading && mounted) {
      checkTodayEntry();
    }
  }, [user, loading, supabase, mounted]);

  if (!mounted || loading) {
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

  // Show loading while checking today's entry
  if (hasJournaledToday === null && user && !loading && mounted) {
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
            Checking today's journal...
          </p>
        </div>
      </div>
    );
  }

  if (mounted && !hasJournaledToday) {
    return (
      <SubscriptionCheck>
        <div className="fixed inset-0 bg-slate-950 flex flex-col">
          {/* Home Button at Top Center */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <Link href="/dashboard/home">
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
                          setCurrentStep("questionDisplay");
                          startQuestionDisplay();
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

          {/* Question Display Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
              currentStep === "questionDisplay"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="text-center px-6 max-w-2xl">
              <div className="mb-8">
                <p className="text-slate-400 text-sm mb-4">Journal Prompt</p>
                <div className="text-2xl md:text-3xl font-light text-slate-200 leading-relaxed min-h-[4rem] flex items-center justify-center">
                  {displayedWords.map((word, index) => (
                    <span
                      key={index}
                      className="inline-block mr-2 animate-typewriter-fade"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animationFillMode: "both",
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audio Recording Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "audioRecording"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6">
              <div className="mb-8">
                <p className="text-slate-400 text-sm mb-4">
                  Recording your response
                </p>
                <h2 className="text-2xl font-light text-slate-200 mb-6">
                  {currentQuestion}
                </h2>
              </div>

              {/* Recording Animation */}
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"></div>
                  <div
                    className="absolute inset-2 rounded-full bg-red-500/40 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-4 rounded-full bg-red-500 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                </div>
                <p className="text-red-400 text-sm font-medium mb-4">
                  Recording...
                </p>
              </div>

              <Button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl"
                disabled={!isRecording}
              >
                Stop Recording
              </Button>
            </div>
          </div>

          {/* Processing Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "processing"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-6">
                  <div className="w-full h-full border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-light text-slate-200 mb-4">
                  Processing your journal entry...
                </h2>
                <p className="text-slate-400 text-sm">
                  Converting your voice to text
                </p>
              </div>
            </div>
          </div>

          {/* Follow-up Question Display Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "followUpQuestion"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6 max-w-2xl">
              <div className="mb-8">
                <p className="text-slate-400 text-sm mb-4">
                  Follow-up Question
                </p>
                <div className="text-2xl md:text-3xl font-light text-slate-200 leading-relaxed min-h-[4rem] flex items-center justify-center">
                  {followUpQuestion}
                </div>
                <p className="text-slate-500 text-sm mt-4">
                  Recording will start automatically...
                </p>
              </div>
            </div>
          </div>

          {/* Follow-up Recording Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "followUpRecording"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6">
              <div className="mb-8">
                <p className="text-slate-400 text-sm mb-4">
                  Recording your follow-up response
                </p>
                <h2 className="text-2xl font-light text-slate-200 mb-6">
                  {followUpQuestion}
                </h2>
              </div>

              {/* Recording Animation */}
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"></div>
                  <div
                    className="absolute inset-2 rounded-full bg-red-500/40 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-4 rounded-full bg-red-500 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                </div>
                <p className="text-red-400 text-sm font-medium mb-4">
                  Recording follow-up response...
                </p>
              </div>

              <Button
                onClick={stopFollowUpRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl"
                disabled={!isRecording}
              >
                Stop Recording
              </Button>
            </div>
          </div>

          {/* Follow-up Processing Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "followUpProcessing"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-6">
                  <div className="w-full h-full border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <h2 className="text-2xl font-light text-slate-200 mb-4">
                  Processing your follow-up response...
                </h2>
                <p className="text-slate-400 text-sm">
                  Converting your voice to text
                </p>
              </div>
            </div>
          </div>

          {/* Complete Screen */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              currentStep === "complete"
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="text-center px-6 max-w-2xl">
              <div className="mb-8">
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
                <h2 className="text-2xl font-light text-slate-200 mb-4">
                  Journal entry saved!
                </h2>
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                    <p className="text-slate-400 text-xs mb-2">
                      Initial Response:
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {journalText}
                    </p>
                  </div>
                  {followUpQuestion && (
                    <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                      <p className="text-slate-400 text-xs mb-2">
                        Follow-up Question:
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed mb-3">
                        {followUpQuestion}
                      </p>
                      <p className="text-slate-400 text-xs mb-2">
                        Your Response:
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {followUpResponse}
                      </p>
                    </div>
                  )}

                  {/* Tags Section */}
                  {generatedTags?.emotions?.length ||
                  generatedTags?.topics?.length ||
                  customTags.length ? (
                    <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                      <p className="text-slate-400 text-xs mb-3">
                        Generated Tags:
                      </p>

                      {generatedTags?.emotions &&
                        generatedTags.emotions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-slate-500 text-xs mb-2">
                              Emotions:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {generatedTags.emotions.map((emotion, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                                >
                                  {emotion}
                                  <button
                                    onClick={() =>
                                      removeTag(emotion, "emotion")
                                    }
                                    className="ml-1 text-blue-400 hover:text-blue-200 text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {generatedTags?.topics &&
                        generatedTags.topics.length > 0 && (
                          <div className="mb-3">
                            <p className="text-slate-500 text-xs mb-2">
                              Topics:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {generatedTags.topics.map((topic, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full"
                                >
                                  {topic}
                                  <button
                                    onClick={() => removeTag(topic, "topic")}
                                    className="ml-1 text-green-400 hover:text-green-200 text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {customTags.length > 0 && (
                        <div className="mb-3">
                          <p className="text-slate-500 text-xs mb-2">
                            Custom Tags:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {customTags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                              >
                                {tag}
                                <button
                                  onClick={() => removeCustomTag(tag)}
                                  className="ml-1 text-purple-400 hover:text-purple-200 text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add custom tag..."
                          className="flex-1 bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                          onKeyPress={(e) =>
                            e.key === "Enter" && addCustomTag()
                          }
                        />
                        <button
                          onClick={addCustomTag}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                          disabled={!newTag.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                      <p className="text-slate-400 text-xs mb-3">
                        No tags generated
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add custom tag..."
                          className="flex-1 bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                          onKeyPress={(e) =>
                            e.key === "Enter" && addCustomTag()
                          }
                        />
                        <button
                          onClick={addCustomTag}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                          disabled={!newTag.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Weather Information */}
                  {weather && (
                    <div className="bg-slate-800/60 rounded-xl p-4 text-left">
                      <p className="text-slate-400 text-xs mb-2">
                        Weather Today:
                      </p>
                      <p className="text-slate-300 text-sm">
                        {weather.temp}° {weather.condition} in{" "}
                        {weather.location}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    // Save any remaining custom tags before leaving
                    if (customTags.length > 0) {
                      const allCurrentTags: string[] = [];
                      if (generatedTags?.emotions)
                        allCurrentTags.push(...generatedTags.emotions);
                      if (generatedTags?.topics)
                        allCurrentTags.push(...generatedTags.topics);
                      allCurrentTags.push(...customTags);

                      // Update the saved entry with all tags
                      const updateTags = async () => {
                        const formData = new FormData();
                        formData.append("tags", JSON.stringify(allCurrentTags));
                        // This would need a separate update action, for now just reload
                        window.location.reload();
                      };
                      updateTags();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                >
                  Return to Dashboard
                </Button>
              </div>
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
