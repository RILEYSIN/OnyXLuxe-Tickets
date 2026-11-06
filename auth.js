document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".password-toggle").forEach(function (toggle) {
    const input = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!input) {
      return;
    }

    toggle.addEventListener("click", function () {
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!isVisible));
      toggle.setAttribute(
        "aria-label",
        `${isVisible ? "Show" : "Hide"} ${input.dataset.passwordLabel}`
      );
    });
  });

  const form = document.querySelector("[data-auth-form]");
  if (!form) {
    return;
  }

  const feedback = form.querySelector(".form-feedback");
  const password = form.querySelector("#password");
  const confirmation = form.querySelector("#confirm-password");
  const submitButton = form.querySelector('button[type="submit"]');

  function updatePasswordMatch() {
    if (!password || !confirmation) {
      return;
    }

    const mismatch =
      confirmation.value.length > 0 && password.value !== confirmation.value;
    confirmation.setCustomValidity(
      mismatch ? "Your passwords do not match." : ""
    );
    confirmation.setAttribute("aria-invalid", String(mismatch));
    confirmation
      .closest(".form-field")
      .querySelector("small").textContent = mismatch
      ? "The passwords do not match. Please check both entries."
      : "Enter the same password again to confirm it.";
  }

  if (password && confirmation) {
    password.addEventListener("input", updatePasswordMatch);
    confirmation.addEventListener("input", updatePasswordMatch);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    feedback.textContent = "";
    updatePasswordMatch();

    if (!form.reportValidity()) {
      return;
    }

    const supabase = window.onyxSupabase;
    if (!supabase) {
      feedback.textContent =
        window.onyxSupabaseError ||
        "Supabase is unavailable. Please reload and try again.";
      return;
    }

    submitButton.disabled = true;
    try {
      if (form.dataset.authForm === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          form.elements.email.value.trim(),
          {
            redirectTo: new URL("reset-password.html", location.href).href,
          }
        );
        if (error) {
          throw error;
        }

        feedback.textContent =
          "If an account exists for that email, a password-reset link will be sent.";
        return;
      }

      if (form.dataset.authForm === "update-password") {
        const { error } = await supabase.auth.updateUser({
          password: password.value,
        });
        if (error) {
          throw error;
        }

        feedback.textContent =
          "Your password has been updated. You can now sign in with it.";
        password.value = "";
        confirmation.value = "";
        return;
      }

      if (form.dataset.authForm === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.elements.email.value.trim(),
          password: password.value,
          options: {
            data: { username: form.elements.username.value.trim() },
            emailRedirectTo: new URL("index.html", location.href).href,
          },
        });
        if (error) {
          throw error;
        }
        if (data.session) {
          location.assign("index.html");
          return;
        }

        feedback.textContent =
          "Check your email for a confirmation link to finish creating your account.";
        form.reset();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.elements.email.value.trim(),
        password: password.value,
      });
      if (error) {
        throw error;
      }
      location.assign("index.html");
    } catch (error) {
      feedback.textContent =
        error instanceof Error
          ? error.message
          : "Your request could not be completed. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
});
