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
    // Log all form data keys for debugging
    const formDataEntries = Array.from(formData.entries());
    console.log("=== FORM DATA RECEIVED ===");
    formDataEntries.forEach(([key, value]) => {
      console.log(
        `${key}:`,
        typeof value === "string"
          ? `"${value.substring(0, 200)}${value.length > 200 ? "..." : ""}"`
          : value,
      );
    });

    // Extract form data with more robust handling
    const contentRaw = formData.get("content");
    const dateRaw = formData.get("date");
    const moodScoreRaw = formData.get("mood_score");
    const followUpQuestionRaw = formData.get("follow_up_question");
    const followUpResponseRaw = formData.get("follow_up_response");
    const weatherRaw = formData.get("weather");

    console.log("=== RAW FORM VALUES ===");
    console.log("contentRaw:", contentRaw, "(type:", typeof contentRaw, ")");
    console.log("dateRaw:", dateRaw, "(type:", typeof dateRaw, ")");
    console.log(
      "moodScoreRaw:",
      moodScoreRaw,
      "(type:",
      typeof moodScoreRaw,
      ")",
    );
    console.log(
      "followUpQuestionRaw:",
      followUpQuestionRaw,
      "(type:",
      typeof followUpQuestionRaw,
      ")",
    );
    console.log(
      "followUpResponseRaw:",
      followUpResponseRaw,
      "(type:",
      typeof followUpResponseRaw,
      ")",
    );
    console.log("weatherRaw:", weatherRaw, "(type:", typeof weatherRaw, ")");

    // Convert to strings and validate
    const content = contentRaw ? String(contentRaw).trim() : "";
    const date = dateRaw ? String(dateRaw).trim() : "";
    const moodScore = moodScoreRaw ? String(moodScoreRaw).trim() : "";
    const followUpQuestion = followUpQuestionRaw
      ? String(followUpQuestionRaw).trim()
      : "";
    const followUpResponse = followUpResponseRaw
      ? String(followUpResponseRaw).trim()
      : "";
    const weather = weatherRaw ? String(weatherRaw).trim() : "";

    console.log("=== PROCESSED VALUES ===");
    console.log("content:", `"${content}" (length: ${content.length})`);
    console.log("date:", `"${date}" (length: ${date.length})`);
    console.log("moodScore:", `"${moodScore}" (length: ${moodScore.length})`);
    console.log(
      "followUpQuestion:",
      `"${followUpQuestion}" (length: ${followUpQuestion.length})`,
    );
    console.log(
      "followUpResponse:",
      `"${followUpResponse}" (length: ${followUpResponse.length})`,
    );
    console.log("weather:", `"${weather}" (length: ${weather.length})`);

    // Validate required fields
    if (!content || content === "") {
      console.error("=== VALIDATION ERROR: CONTENT ===");
      console.error("Content is empty or null:", {
        contentRaw,
        content,
        contentLength: content.length,
        contentType: typeof content,
      });
      return { error: "Content is required and cannot be empty" };
    }

    if (!date || date === "") {
      console.error("=== VALIDATION ERROR: DATE ===");
      console.error("Date is empty or null:", {
        dateRaw,
        date,
        dateLength: date.length,
        dateType: typeof date,
      });
      return { error: "Date is required and cannot be empty" };
    }

    // Prepare insert data
    const insertData = {
      user_id: user.id,
      content: content,
      date: date,
      mood_score: moodScore && moodScore !== "" ? parseInt(moodScore) : null,
      follow_up_question:
        followUpQuestion && followUpQuestion !== "" ? followUpQuestion : null,
      follow_up_response:
        followUpResponse && followUpResponse !== "" ? followUpResponse : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("=== INSERT DATA PREPARED ===");
    console.log(JSON.stringify(insertData, null, 2));

    // Test Supabase connection first
    console.log("=== TESTING SUPABASE CONNECTION ===");
    const { data: testData, error: testError } = await supabase
      .from("journal_entries")
      .select("count")
      .limit(1);

    if (testError) {
      console.error("Supabase connection test failed:", testError);
      return { error: `Database connection failed: ${testError.message}` };
    }

    console.log("Supabase connection test successful");

    // Attempt to insert
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
