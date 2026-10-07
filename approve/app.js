(function () {
  const toast = document.getElementById("toast");
  function say(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    clearTimeout(say._t);
    say._t = setTimeout(() => { toast.style.display = "none"; }, 2400);
  }

  const pilot = document.getElementById("pilot-form");
  if (pilot) {
    pilot.addEventListener("submit", async (event) => {
      event.preventDefault();
      const shop = document.getElementById("shop").value.trim();
      const contact = document.getElementById("contact").value.trim();
      const note = document.getElementById("note").value.trim();
      const text = [
        "Approve pilot request",
        "Shop: " + shop,
        "Contact: " + contact,
        "Shoot: " + (note || "not specified"),
        "Offer: 14 days on our photos, then $500 / 30 days if we keep it.",
        "Note on payment: Approve — 30 days — " + shop
      ].join("\n");
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById("pilot-status").textContent = "Copied. Paste it into a text or the Cash App note.";
        say("Pilot request copied");
      } catch (err) {
        document.getElementById("pilot-status").textContent = text;
        say("Copy blocked — request is on the page");
      }
    });
  }

  if (document.body.dataset.page !== "lock") return;

  const state = {
    shop: localStorage.getItem("approve-shop") || "",
    ban: localStorage.getItem("approve-ban") || "",
    kit: [],
    options: [],
    approved: false
  };
  const logEl = document.getElementById("log");
  function log(line) {
    const stamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    logEl.textContent = stamp + "  " + line + "\n" + logEl.textContent;
  }
  document.getElementById("kit-shop").value = state.shop;
  document.getElementById("kit-ban").value = state.ban;

  function paintLock() {
    const pill = document.getElementById("lock-pill");
    const label = document.getElementById("lock-label");
    const download = document.getElementById("download");
    const note = document.getElementById("export-note");
    const kept = state.options.filter((item) => item.kept);
    if (state.approved && kept.length) {
      pill.textContent = "APPROVED";
      pill.className = "pill open";
      label.textContent = "Export open";
      download.disabled = false;
      note.textContent = kept.length + " kept image" + (kept.length === 1 ? "" : "s") + " can download.";
    } else {
      pill.textContent = "LOCKED";
      pill.className = "pill locked";
      label.textContent = "Export locked";
      download.disabled = true;
      note.textContent = kept.length
        ? "Export is locked. Tap Approve to release " + kept.length + " kept image" + (kept.length === 1 ? "" : "s") + "."
        : "Export is locked. Keep at least one image, then approve.";
    }
  }

  function readFiles(fileList, bucket, render) {
    Array.from(fileList || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        bucket.push({ name: file.name, url: reader.result, kept: false });
        render();
        log("Added " + file.name);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderKit() {
    const box = document.getElementById("kit-shots");
    box.innerHTML = "";
    state.kit.forEach((shot) => {
      const el = document.createElement("figure");
      el.className = "shot";
      el.innerHTML = "<img alt=''><footer></footer>";
      el.querySelector("img").src = shot.url;
      el.querySelector("footer").textContent = shot.name;
      box.appendChild(el);
    });
  }

  function renderReview() {
    const box = document.getElementById("review");
    box.innerHTML = "";
    state.options.forEach((opt, index) => {
      const el = document.createElement("figure");
      el.className = "opt" + (opt.kept ? " kept" : "");
      el.innerHTML = "<img alt=''><footer><button type='button' class='btn ghost'>Keep</button><button type='button' class='btn ghost'>Kill</button></footer>";
      el.querySelector("img").src = opt.url;
      const [keep, kill] = el.querySelectorAll("button");
      keep.textContent = opt.kept ? "Kept" : "Keep";
      keep.addEventListener("click", () => {
        opt.kept = !opt.kept;
        state.approved = false;
        log((opt.kept ? "Kept " : "Unkept ") + opt.name);
        renderReview();
        paintLock();
      });
      kill.addEventListener("click", () => {
        state.options.splice(index, 1);
        state.approved = false;
        log("Killed " + opt.name);
        renderReview();
        paintLock();
      });
      box.appendChild(el);
    });
  }

  document.getElementById("kit-files").addEventListener("change", (event) => {
    readFiles(event.target.files, state.kit, renderKit);
    event.target.value = "";
  });
  document.getElementById("review-files").addEventListener("change", (event) => {
    readFiles(event.target.files, state.options, () => {
      renderReview();
      paintLock();
    });
    event.target.value = "";
  });
  document.getElementById("save-kit").addEventListener("click", () => {
    state.shop = document.getElementById("kit-shop").value.trim();
    state.ban = document.getElementById("kit-ban").value.trim();
    localStorage.setItem("approve-shop", state.shop);
    localStorage.setItem("approve-ban", state.ban);
    log("Kit saved" + (state.shop ? " for " + state.shop : ""));
    say("Kit saved on this phone");
  });
  document.getElementById("copy-prompt").addEventListener("click", async () => {
    const shop = document.getElementById("kit-shop").value.trim() || "the shop";
    const ban = document.getElementById("kit-ban").value.trim();
    const brief = document.getElementById("brief").value.trim() || "Three Instagram squares from the attached photo.";
    const prompt = [
      "Shop: " + shop,
      "Brief: " + brief,
      "Use only the attached real photo. Do not invent a new face.",
      ban ? "Banned words: " + ban : "No banned words set.",
      "Make two options. Do not add a download link."
    ].join("\n");
    try {
      await navigator.clipboard.writeText(prompt);
      say("Prompt copied");
      log("Prompt copied");
    } catch (err) {
      say("Copy blocked");
      log(prompt);
    }
  });
  document.getElementById("approve").addEventListener("click", () => {
    const kept = state.options.filter((item) => item.kept);
    if (!kept.length) {
      say("Keep at least one image");
      log("Approve blocked — nothing kept");
      return;
    }
    state.approved = true;
    log("Approved " + kept.length + " image" + (kept.length === 1 ? "" : "s"));
    say("Export open");
    paintLock();
  });
  document.getElementById("revoke").addEventListener("click", () => {
    state.approved = false;
    log("Export locked again");
    say("Locked");
    paintLock();
  });
  document.getElementById("download").addEventListener("click", () => {
    if (!state.approved) return;
    state.options.filter((item) => item.kept).forEach((item, i) => {
      const a = document.createElement("a");
      a.href = item.url;
      a.download = "approve-" + (i + 1) + "-" + item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    log("Downloaded approved set");
  });
  paintLock();
  log("Lock ready. Export is off.");
})();
