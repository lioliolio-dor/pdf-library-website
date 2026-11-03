

import { supabase } from "./supabase.js";

// Get HTML elements
const authForm = document.getElementById("authForm");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const authButton = document.getElementById("authButton");
const authMessage = document.getElementById("authMessage");

let currentMode = "login";

// Change between Login and Signup
function setMode(mode) {
  currentMode = mode;

  loginTab.classList.toggle(
    "active",
    mode === "login"
  );

  signupTab.classList.toggle(
    "active",
    mode === "signup"
  );

  authButton.textContent =
    mode === "login" ? "Login" : "Create account";

  authMessage.textContent = "";
}

// Login tab
loginTab.addEventListener("click", () => {
  setMode("login");
});

// Signup tab
signupTab.addEventListener("click", () => {
  setMode("signup");
});

// Handle login and signup
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("email")
    .value.trim();

  const password = document
    .getElementById("password")
    .value;

  authButton.disabled = true;

  authMessage.textContent = "Please wait...";

  try {
    let result;

    // LOGIN
    if (currentMode === "login") {

      result = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        throw result.error;
      }

      // Successful login
      window.location.href = "dashboard.html";

    }

    // SIGNUP
    else {

      result = await supabase.auth.signUp({
        email: email,
        password: password
      });

      if (result.error) {
        throw result.error;
      }

      // Email confirmation enabled
      if (!result.data.session) {

        authMessage.textContent =
          "Account created successfully! Please check your email and confirm your account before logging in.";

      }

      // Email confirmation disabled
      else {

        window.location.href = "dashboard.html";

      }

    }

  } catch (error) {

    console.error("Authentication error:", error);

    authMessage.textContent =
      error.message || "Something went wrong. Please try again.";

  } finally {

    authButton.disabled = false;

  }
});

// Check whether the user is already logged in
async function checkSession() {

  try {

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (session) {

      window.location.href = "dashboard.html";

    }

  } catch (error) {

    console.error("Session error:", error);

  }

}

checkSession();

