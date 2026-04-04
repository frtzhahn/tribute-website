// frontend logic for bscs 1a memory book
// secure text inject to prevent xss

(function () {
  "use strict";

  // spawn clock ticker
  setInterval(() => {
    const c = document.getElementById('sys-clock');
    if (c) c.innerText = new Date().toLocaleString();
  }, 1000);

  // set up cinematic loader
  document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("navbar");
    const navLinks = document.querySelector(".navbar-links");
    if (nav && navLinks) {
      const menuBtn = document.createElement("button");
      menuBtn.className = "mobile-menu-btn";
      menuBtn.innerText = "[ MENU ]";
      menuBtn.onclick = () => navLinks.classList.toggle("active");
      nav.insertBefore(menuBtn, navLinks);
    }
    const page = window.location.pathname;
    let themeClass = "loader-home";
    if (page === "/moments.html") themeClass = "loader-gallery";
    else if (page === "/upload.html") themeClass = "loader-upload";
    else if (page === "/admin.html") themeClass = "loader-admin";

    const loaderWrapper = document.createElement("div");
    loaderWrapper.style.cssText = "position:fixed;inset:0;background:var(--desk);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;";
    
    const loaderAnim = document.createElement("div");
    loaderAnim.className = "loader-theme " + themeClass;
    
    const ticker = document.createElement("div");
    ticker.className = "loading-ticker";
    ticker.innerText = "INITIATING [0%]";

    loaderWrapper.appendChild(loaderAnim);
    loaderWrapper.appendChild(ticker);
    document.body.appendChild(loaderWrapper);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 7;
      if (progress > 100) progress = 100;
      ticker.innerText = `DECRYPTING [${progress}%]`;
      if (progress === 100) clearInterval(interval);
    }, 80);

    setTimeout(() => {
      loaderWrapper.style.transition = "opacity 0.3s";
      loaderWrapper.style.opacity = "0";
      setTimeout(() => {
        loaderWrapper.remove();
        // jump to proper context
        if (page === "/moments.html") initGallery();
        else if (page === "/upload.html") initUpload();
        else if (page === "/admin.html") initAdmin();
      }, 300);
    }, 1200);
  });

  // handle gallery screen
  function initGallery() {
    const grid = document.getElementById("gallery-grid");
    const modal = document.getElementById("lightbox-modal");
    const modalImg = document.getElementById("modal-img");
    const modalDesc = document.getElementById("modal-desc");
    const modalClose = document.getElementById("modal-close");

    // bind date filter
    const btnFilter = document.getElementById("btn-apply-filter");
    if (btnFilter) {
      btnFilter.addEventListener("click", () => {
        const start = document.getElementById("filter-start").value;
        const end = document.getElementById("filter-end").value;
        const cards = grid.querySelectorAll(".photo-card");
        cards.forEach(c => {
          const d = c.getAttribute("data-date");
          if (!d) return; // skip unformatted legacy items
          if ((start && d < start) || (end && d > end)) {
            c.style.display = "none";
          } else {
            c.style.display = "";
          }
        });
      });
    }

    // mount decrypt splash screen
    const loader = document.createElement("div");
    loader.className = "splash-screen";
    loader.innerHTML = `
      <div class="stamp-impact" data-content="DECRYPTING"></div>
      <div class="splash-title">INITIATING DECRYPTION...</div>
    `;
    document.body.appendChild(loader);

    const loaderTimeout = setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 800);
      }
    }, 10000); // clear if stranded over 10s

    fetchImages();

    // grab permitted photos
    async function fetchImages() {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("Failed to load images.");
        const images = await res.json();

        if (images.length === 0) {
          const empty = document.createElement("p");
          empty.className = "gallery-empty";
          empty.textContent = "No photos yet — be the first to upload a memory.";
          grid.appendChild(empty);
        } else {
          images.forEach(function (img) {
            grid.appendChild(createPhotoCard(img));
          });
        }
      } catch (err) {
        console.error("[Gallery]", err);
        const errEl = document.createElement("p");
        errEl.className = "gallery-empty";
        errEl.textContent = "Could not load photos. Please try again later.";
        grid.appendChild(errEl);
      } finally {
        clearTimeout(loaderTimeout);
        if (loader && loader.parentNode) {
          loader.classList.add("hidden");
          setTimeout(() => loader.remove(), 800);
        }
      }
    }

    // spawn polaroid widget
    function createPhotoCard(data) {
      var card = document.createElement("div");
      card.className = "photo-card";

      // unpack description json safely
      let parsed;
      try {
        parsed = JSON.parse(data.description);
      } catch (e) {
        parsed = { title: "DATA_CORRUPTED", date: new Date().toISOString().split('T')[0], desc: data.description || "" };
      }

      card.setAttribute("data-date", parsed.date);

      var img = document.createElement("img");
      img.className = "photo-card-img";
      img.src = data.filepath;
      img.alt = parsed.title;
      img.loading = "lazy";

      var desc = document.createElement("p");
      desc.className = "photo-card-desc";
      desc.textContent = `> ${parsed.title} | ${parsed.date}`; // mask full body text text

      var uploaderText = document.createElement("p");
      uploaderText.className = "uploader-info";
      uploaderText.style.fontFamily = "'Fira Code', monospace";
      uploaderText.style.fontSize = "0.75rem";
      uploaderText.style.color = "var(--accent)";
      uploaderText.style.marginTop = "5px";
      uploaderText.textContent = `> UPLOADED_BY: ${parsed.alias || 'ANONYMOUS'}`;

      card.appendChild(img);
      card.appendChild(desc);
      card.appendChild(uploaderText);

      // reveal full size on tap
      card.addEventListener("click", function () {
        modalImg.src = data.filepath;
        modalImg.alt = parsed.title;
        modalDesc.innerHTML = `<div style="font-family:'Fira Code',monospace;color:var(--accent);margin-bottom:10px;">> ${parsed.title} // DATE: ${parsed.date} // ALIAS: ${parsed.alias || 'ANONYMOUS'}</div>${parsed.desc}`;
        
        let cv = document.getElementById('modal-vc-' + data.id);
        if (!cv) {
          cv = document.createElement("div");
          cv.id = 'modal-vc-' + data.id;
          cv.className = "modal-views-counter";
          cv.innerText = "> VIEWS: LOADING...";
          document.querySelector(".modal-content").appendChild(cv);
        }
        
        fetch('/api/images/' + data.id + '/view', { method: 'POST' })
          .then(r => r.json())
          .then(res => {
            if (cv) cv.innerText = "> VIEWS: " + (res.views || 0);
          })
          .catch(e => {
            if (cv) cv.innerText = "> VIEWS: ERR";
          });

        modal.classList.add("is-open");
        let mContent = modal.querySelector(".modal-content");
        if (mContent) {
          setTimeout(() => mContent.classList.add("zoom-active"), 10);
        }
      });

      return card;
    }

    // configure modal behavior
    modalClose.addEventListener("click", closeModal);

    modal.addEventListener("click", function (e) {
      // close if blur clicked
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });

    function closeModal() {
      let mContent = modal.querySelector(".modal-content");
      if (mContent) {
        mContent.classList.remove("zoom-active");
      }
      setTimeout(() => {
        document.querySelectorAll(".modal-views-counter").forEach(el => el.remove());
        modal.classList.remove("is-open");
        modalImg.src = "";
        modalDesc.textContent = "";
      }, 300);
    }
  }

  // manage file ingest portal
  function initUpload() {
    var form = document.getElementById("upload-form");
    var submitBtn = document.getElementById("upload-btn");
    var statusEl = document.getElementById("upload-status");

    // tie up length bounds
    const titleIn = document.getElementById("upload-title");
    const descIn = document.getElementById("upload-desc");
    const titleCount = document.getElementById("title-counter");
    const descCount = document.getElementById("desc-counter");

    if (titleIn && titleCount) {
      titleIn.addEventListener("input", () => {
        titleCount.innerText = `> SYSTEM_MEM: [${titleIn.value.length}/25 BYTES]`;
      });
    }
    if (descIn && descCount) {
      descIn.addEventListener("input", () => {
        descCount.innerText = `> LOG_CAPACITY: [${descIn.value.length}/200 BYTES]`;
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // lock out phantom clicks
      submitBtn.disabled = true;
      submitBtn.textContent = "TRANSMITTING...";
      hideStatus();

      var formData = new FormData(form);

      // consolidate properties into chunk
      var finalData = new FormData();
      finalData.append("image", formData.get("image"));
      var aliasVal = document.getElementById("upload-alias") ? document.getElementById("upload-alias").value.trim() : "";
      var mixedDesc = {
        title: formData.get("title") || "UNTITLED",
        date: formData.get("date") || new Date().toISOString().split('T')[0],
        alias: aliasVal || "ANONYMOUS",
        desc: formData.get("description") || ""
      };
      finalData.append("description", JSON.stringify(mixedDesc));

      try {
        var res = await fetch("/api/upload", {
          method: "POST",
          body: finalData,
        });

        var data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed.");
        }

        showStatus("success", data.message || "File transmitted. Awaiting admin clearance.");
        form.reset();
      } catch (err) {
        console.error("[Upload]", err);
        showStatus("error", err.message || "Transmission failed. Try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "TRANSMIT_FILE";
      }
    });

    function showStatus(type, message) {
      statusEl.className = "form-status " + type;
      statusEl.textContent = message;
    }

    function hideStatus() {
      statusEl.className = "form-status";
      statusEl.textContent = "";
    }
  }

  // arm control console
  function initAdmin() {
    var loginSection = document.getElementById("login-section");
    var loginForm = document.getElementById("admin-login-form");
    var loginBtn = document.getElementById("admin-login-btn");
    var loginStatus = document.getElementById("admin-login-status");
    var dashboard = document.getElementById("dashboard-section");
    var pendingGrid = document.getElementById("pending-grid");

    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      loginBtn.disabled = true;
      loginBtn.textContent = "AUTHENTICATING...";
      hideLoginStatus();

      var username = document.getElementById("admin-user").value.trim();
      var password = document.getElementById("admin-pass").value;

      try {
        var res = await fetch("/api/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username, password: password }),
        });

        var data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Authentication failed.");
        }

        // bypass login form visually
        loginSection.style.display = "none";
        dashboard.classList.add("active");
        fetchPending();
      } catch (err) {
        console.error("[Admin Login]", err);
        showLoginStatus("error", err.message || "Invalid credentials.");
        loginBtn.disabled = false;
        loginBtn.textContent = "AUTHENTICATE";
      }
    });

    function showLoginStatus(type, message) {
      loginStatus.className = "form-status " + type;
      loginStatus.textContent = message;
    }

    function hideLoginStatus() {
      loginStatus.className = "form-status";
      loginStatus.textContent = "";
    }

    // load unlisted objects
    async function fetchPending() {
      try {
        var res = await fetch("/api/admin/pending");
        if (!res.ok) throw new Error("Failed to load pending images.");
        var images = await res.json();

        pendingGrid.textContent = ""; // obliterate children

        if (images.length === 0) {
          var empty = document.createElement("p");
          empty.className = "pending-empty";
          empty.textContent = "No pending uploads — all caught up.";
          pendingGrid.appendChild(empty);
          return;
        }

        images.forEach(function (img) {
          pendingGrid.appendChild(createPendingCard(img));
        });
      } catch (err) {
        console.error("[Admin Pending]", err);
        var errEl = document.createElement("p");
        errEl.className = "pending-empty";
        errEl.textContent = "Could not load pending images.";
        pendingGrid.appendChild(errEl);
      }
    }

    // form command prompt card
    function createPendingCard(data) {
      var card = document.createElement("div");
      card.className = "photo-card";

      // crack token wrapper
      let parsed;
      try {
        parsed = JSON.parse(data.description);
      } catch (e) {
        parsed = { title: "CORRUPTED", date: "UNKNOWN", desc: data.description || "(no description)" };
      }

      var img = document.createElement("img");
      img.className = "photo-card-img";
      img.src = data.filepath;
      img.alt = parsed.title;
      img.loading = "lazy";

      var desc = document.createElement("p");
      desc.className = "photo-card-desc";
      desc.style.textAlign = "left";
      desc.innerHTML = `<strong>> ${parsed.title}</strong><br><small style="color:var(--accent)">${parsed.date}</small><br><br>${parsed.desc}`;

      var uploaderInfo = document.createElement("p");
      uploaderInfo.className = "uploader-info";
      uploaderInfo.style.fontFamily = "'Fira Code', monospace";
      uploaderInfo.style.fontSize = "0.75rem";
      uploaderInfo.style.color = "var(--accent)";
      uploaderInfo.style.marginBottom = "10px";
      uploaderInfo.textContent = "> UPLOADED_BY: " + (data.uploaderName || 'ANONYMOUS');

      var actions = document.createElement("div");
      actions.className = "action-btns";

      var approveBtn = document.createElement("button");
      approveBtn.className = "btn-approve";
      approveBtn.textContent = "APPROVE";

      var rejectBtn = document.createElement("button");
      rejectBtn.className = "btn-reject";
      rejectBtn.textContent = "REJECT";

      // fire authorization hook
      approveBtn.addEventListener("click", async function () {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        approveBtn.textContent = "APPROVING...";

        try {
          var res = await fetch("/api/admin/approve/" + data.id, { method: "POST" });
          var result = await res.json();

          if (!res.ok) throw new Error(result.error || "Approve failed.");

          // expunge node
          card.remove();

          // scan for leftover cards
          if (pendingGrid.children.length === 0) {
            var empty = document.createElement("p");
            empty.className = "pending-empty";
            empty.textContent = "No pending uploads — all caught up.";
            pendingGrid.appendChild(empty);
          }
        } catch (err) {
          console.error("[Admin Approve]", err);
          approveBtn.textContent = "ERROR";
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
        }
      });

      // fire blacklist hook
      rejectBtn.addEventListener("click", async function () {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        rejectBtn.textContent = "REJECTING...";

        try {
          var res = await fetch("/api/admin/reject/" + data.id, { method: "DELETE" });
          var result = await res.json();

          if (!res.ok) throw new Error(result.error || "Reject failed.");

          // expunge node
          card.remove();

          // scan for leftover cards
          if (pendingGrid.children.length === 0) {
            var empty = document.createElement("p");
            empty.className = "pending-empty";
            empty.textContent = "No pending uploads — all caught up.";
            pendingGrid.appendChild(empty);
          }
        } catch (err) {
          console.error("[Admin Reject]", err);
          rejectBtn.textContent = "ERROR";
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
        }
      });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);

      card.appendChild(img);
      card.appendChild(desc);
      card.appendChild(uploaderInfo);
      card.appendChild(actions);

      return card;
    }

    // mount scope toggles
    var btnViewPending = document.getElementById("btn-view-pending");
    var btnViewActive = document.getElementById("btn-view-active");
    var activeGrid = document.getElementById("active-grid");
    
    var editModal = document.getElementById("admin-edit-modal");
    var editClose = document.getElementById("admin-edit-close");
    var overwriteBtn = document.getElementById("btn-overwrite-data");
    
    if (editClose) {
      editClose.addEventListener("click", () => {
        let mContent = editModal.querySelector(".modal-content");
        if (mContent) mContent.classList.remove("zoom-active");
        setTimeout(() => editModal.classList.remove("is-open"), 300);
      });
    }

    if (btnViewPending && btnViewActive) {
      btnViewPending.addEventListener("click", () => {
        btnViewPending.classList.add("active");
        btnViewActive.classList.remove("active");
        pendingGrid.style.display = "";
        activeGrid.style.display = "none";
        fetchPending();
      });

      btnViewActive.addEventListener("click", () => {
        btnViewActive.classList.add("active");
        btnViewPending.classList.remove("active");
        activeGrid.style.display = "";
        pendingGrid.style.display = "none";
        fetchActive();
      });
    }

    async function fetchActive() {
      try {
        var res = await fetch("/api/images");
        if (!res.ok) throw new Error("Failed to load active images.");
        var images = await res.json();
        activeGrid.textContent = "";

        if (images.length === 0) {
          activeGrid.innerHTML = "<p class='pending-empty'>No active uploads found.</p>";
          return;
        }

        images.forEach(function (img) {
          activeGrid.appendChild(createActiveCard(img));
        });
      } catch (err) {
        activeGrid.innerHTML = "<p class='pending-empty'>Could not load active images.</p>";
      }
    }

    function createActiveCard(data) {
      var card = document.createElement("div");
      card.className = "photo-card";

      let parsed;
      try {
        parsed = JSON.parse(data.description);
      } catch (e) {
        parsed = { title: "CORRUPTED", date: "UNKNOWN", desc: data.description || "" };
      }

      var img = document.createElement("img");
      img.className = "photo-card-img";
      img.src = data.filepath;
      img.alt = parsed.title;

      var desc = document.createElement("p");
      desc.className = "photo-card-desc";
      desc.style.textAlign = "left";
      desc.innerHTML = `<strong>> ${parsed.title}</strong><br><small style="color:var(--accent)">${parsed.date}</small><br><br>${parsed.desc}`;

      var actions = document.createElement("div");
      actions.className = "action-btns";

      var modifyBtn = document.createElement("button");
      modifyBtn.className = "btn-terminal btn-modify";
      modifyBtn.textContent = "[MODIFY]";

      var termBtn = document.createElement("button");
      termBtn.className = "btn-reject btn-terminate";
      termBtn.textContent = "[TERMINATE]";

      actions.appendChild(modifyBtn);
      actions.appendChild(termBtn);

      card.appendChild(img);
      card.appendChild(desc);
      card.appendChild(actions);

      termBtn.addEventListener("click", async () => {
        if(window.confirm("> WARNING: PERMANENT DELETION IMMINENT. PROCEED?")) {
          try {
            termBtn.disabled = true;
            await fetch('/api/admin/reject/' + data.id, { method: 'DELETE' });
            card.remove();
          } catch(e) {
            console.error(e);
            termBtn.disabled = false;
          }
        }
      });

      modifyBtn.addEventListener("click", () => {
        document.getElementById("edit-id").value = data.id;
        document.getElementById("edit-title").value = parsed.title;
        document.getElementById("edit-date").value = parsed.date;
        document.getElementById("edit-alias").value = parsed.alias || "ANONYMOUS";
        document.getElementById("edit-desc").value = parsed.desc;
        editModal.classList.add("is-open");
        let mContent = editModal.querySelector(".modal-content");
        if (mContent) {
          setTimeout(() => mContent.classList.add("zoom-active"), 10);
        }
      });

      return card;
    }

    if (overwriteBtn) {
      overwriteBtn.addEventListener("click", async () => {
        let id = document.getElementById("edit-id").value;
        let title = document.getElementById("edit-title").value;
        let date = document.getElementById("edit-date").value;
        let alias = document.getElementById("edit-alias").value || "ANONYMOUS";
        let desc = document.getElementById("edit-desc").value;
        
        let newJsonString = JSON.stringify({ title, date, alias, desc });
        
        overwriteBtn.textContent = "OVERWRITING...";
        try {
          await fetch('/api/admin/edit/' + id, { 
            method: 'PUT', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ description: newJsonString }) 
          });
          let mContent = editModal.querySelector(".modal-content");
          if (mContent) mContent.classList.remove("zoom-active");
          setTimeout(() => {
            editModal.classList.remove("is-open");
            fetchActive(); // swap views
          }, 300);
        } catch(e) {
          console.error(e);
        }
        overwriteBtn.textContent = "> OVERWRITE_DATA";
      });
    }
  }
})();
