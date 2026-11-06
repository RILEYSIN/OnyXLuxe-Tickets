document.addEventListener("DOMContentLoaded", async function () {
  const guestLinks = document.querySelectorAll("[data-auth-guest]");
  const logoutLink = document.querySelector("[data-auth-logout]");
  const status = document.querySelector("[data-auth-status]");
  if (!guestLinks.length || !logoutLink) {
    return;
  }

  function showSignedOut() {
    guestLinks.forEach((link) => {
      link.hidden = false;
    });
    logoutLink.hidden = true;
  }

  function showSignedIn() {
    guestLinks.forEach((link) => {
      link.hidden = true;
    });
    logoutLink.hidden = false;
  }

  const supabase = window.onyxSupabase;
  if (!supabase) {
    if (status && window.onyxSupabaseError) {
      status.textContent = window.onyxSupabaseError;
      status.hidden = false;
    }
    return;
  }

  function updateNavigation(session) {
    if (session?.user) {
      showSignedIn();
      if (
        /\/(login|signup|forgot-password)\.html$/.test(location.pathname)
      ) {
        location.replace("index.html");
      }
    } else {
      showSignedOut();
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (status) {
      status.textContent = error.message;
      status.hidden = false;
    }
    return;
  }
  updateNavigation(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    updateNavigation(session);
  });

  logoutLink.addEventListener("click", async function (event) {
    event.preventDefault();
    if (logoutLink.getAttribute("aria-disabled") === "true") {
      return;
    }
    logoutLink.setAttribute("aria-disabled", "true");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      location.assign("index.html");
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error
            ? error.message
            : "We could not log you out. Please try again.";
        status.hidden = false;
      }
      logoutLink.removeAttribute("aria-disabled");
    }
  });
});
