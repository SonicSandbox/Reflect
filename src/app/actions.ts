"use server";

import { encodedRedirect } from "@/utils/utils";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      const { error: updateError } = await supabase.from("users").insert({
        id: user.id,
        user_id: user.id,
        name: fullName,
        email: email,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      });

      if (updateError) {
        // Error handling without console.error
        return encodedRedirect(
          "error",
          "/sign-up",
          "Error updating user. Please try again.",
        );
      }
    } catch (err) {
      // Error handling without console.error
      return encodedRedirect(
        "error",
        "/sign-up",
        "Error updating user. Please try again.",
      );
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {});

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const checkUserSubscription = async (userId: string) => {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    return false;
  }

  return !!subscription;
};

export const saveJournalEntryAction = async (formData: FormData) => {
  console.log("=== SERVER ACTION START ===");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User authentication error:", userError);
    return { error: "User not authenticated" };
  }

  console.log("User authenticated:", user.id);

  try {
    // Extract and validate form data
    const content = formData.get("content")?.toString()?.trim();
    const date = formData.get("date")?.toString()?.trim();
    const moodScoreStr = formData.get("mood_score")?.toString()?.trim();
    const followUpQuestion = formData
      .get("follow_up_question")
      ?.toString()
      ?.trim();
    const followUpResponse = formData
      .get("follow_up_response")
      ?.toString()
      ?.trim();
    const weatherStr = formData.get("weather")?.toString()?.trim();

    console.log("=== EXTRACTED FORM DATA ===");
    console.log(
      "content:",
      content ? `"${content.substring(0, 100)}..."` : "EMPTY",
    );
    console.log("date:", date);
    console.log("=== MOOD SCORE SERVER TRACKING ===");
    console.log("moodScoreStr raw:", moodScoreStr);
    console.log("moodScoreStr type:", typeof moodScoreStr);
    console.log("moodScoreStr length:", moodScoreStr ? moodScoreStr.length : 0);
    console.log("moodScoreStr is empty string:", moodScoreStr === "");
    console.log("moodScoreStr is null:", moodScoreStr === null);
    console.log("moodScoreStr is undefined:", moodScoreStr === undefined);
    console.log(
      "followUpQuestion:",
      followUpQuestion ? `"${followUpQuestion.substring(0, 50)}..."` : "EMPTY",
    );
    console.log(
      "followUpResponse:",
      followUpResponse ? `"${followUpResponse.substring(0, 50)}..."` : "EMPTY",
    );
    console.log("weatherStr:", weatherStr);

    // Validate required fields
    if (!content) {
      console.error("Content is required");
      return { error: "Content is required" };
    }

    if (!date) {
      console.error("Date is required");
      return { error: "Date is required" };
    }

    // Parse mood score
    console.log("=== MOOD SCORE PARSING ===");
    const moodScore = moodScoreStr ? parseInt(moodScoreStr, 10) : null;
    console.log("Parsed moodScore:", moodScore);
    console.log("moodScore type:", typeof moodScore);
    console.log("moodScore is null:", moodScore === null);

    if (
      moodScoreStr &&
      (isNaN(moodScore!) || moodScore! < 1 || moodScore! > 10)
    ) {
      console.error("Invalid mood score:", moodScoreStr);
      return { error: "Mood score must be between 1 and 10" };
    }

    // Prepare insert data
    const insertData: any = {
      user_id: user.id,
      content: content,
      date: date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields only if they have values
    console.log("=== MOOD SCORE INSERT DATA ===");
    console.log("moodScore before null check:", moodScore);
    console.log("moodScore !== null:", moodScore !== null);

    if (moodScore !== null) {
      console.log("Adding mood_score to insertData:", moodScore);
      insertData.mood_score = moodScore;
      console.log("insertData.mood_score set to:", insertData.mood_score);
    } else {
      console.log("moodScore is null, not adding to insertData");
    }

    if (followUpQuestion) {
      insertData.follow_up_question = followUpQuestion;
    }

    if (followUpResponse) {
      insertData.follow_up_response = followUpResponse;
    }

    // Add weather if provided
    if (weatherStr) {
      try {
        const weather = JSON.parse(weatherStr);
        insertData.weather = weather;
      } catch (error) {
        console.error("Error parsing weather:", error);
      }
    }

    // Add tags if provided
    const tagsStr = formData.get("tags")?.toString()?.trim();

    if (tagsStr) {
      try {
        const tags = JSON.parse(tagsStr);
        if (Array.isArray(tags) && tags.length > 0) {
          insertData.tags = tags;
        }
      } catch (error) {
        console.error("Error parsing tags:", error);
      }
    }

    console.log("=== FINAL INSERT DATA (BEFORE DB CALL) ===");
    console.log(JSON.stringify(insertData, null, 2));

    console.log("=== FINAL INSERT DATA ===");
    console.log(JSON.stringify(insertData, null, 2));

    // Insert into database
    console.log("=== ATTEMPTING INSERT ===");
    const { data, error } = await supabase
      .from("journal_entries")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("=== SUPABASE INSERT ERROR ===");
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { error: `Database insert failed: ${error.message}` };
    }

    console.log("=== INSERT SUCCESSFUL ===");
    console.log("Saved data:", data);
    console.log("=== SERVER ACTION END ===");

    return { data, success: true };
  } catch (error) {
    console.error("=== UNEXPECTED ERROR ===");
    console.error("Error in saveJournalEntryAction:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return {
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const updateJournalTagsAction = async (formData: FormData) => {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "User not authenticated" };
  }

  try {
    const journalId = formData.get("journal_id")?.toString();
    const tagsStr = formData.get("tags")?.toString();

    if (!journalId) {
      return { error: "Journal ID is required" };
    }

    let tags = [];
    if (tagsStr) {
      try {
        tags = JSON.parse(tagsStr);
      } catch (error) {
        return { error: "Invalid tags format" };
      }
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .update({ tags: tags, updated_at: new Date().toISOString() })
      .eq("id", journalId)
      .eq("user_id", user.id) // Ensure user can only update their own entries
      .select()
      .single();

    if (error) {
      console.error("Error updating journal tags:", error);
      return { error: `Failed to update tags: ${error.message}` };
    }

    return { data, success: true };
  } catch (error) {
    console.error("Error in updateJournalTagsAction:", error);
    return {
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};
