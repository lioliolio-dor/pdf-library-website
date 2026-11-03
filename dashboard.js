
import { supabase } from "./supabase.js";

const pdfInput = document.getElementById("pdfInput");
const pdfList = document.getElementById("pdfList");

const uploadMessage =
  document.getElementById("uploadMessage");

const searchInput =
  document.getElementById("searchInput");

const logoutButton =
  document.getElementById("logoutButton");

let currentUser = null;
let allPDFs = [];

// Check whether the user is logged in
const {
  data: { session },
  error: sessionError
} = await supabase.auth.getSession();

if (sessionError || !session) {
  window.location.href = "login.html";
} else {
  currentUser = session.user;
  await loadPDFs();
}

// Logout
logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();

  window.location.href = "login.html";
});

// Upload a PDF
pdfInput.addEventListener("change", async () => {
  const file = pdfInput.files[0];

  if (!file) return;

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    uploadMessage.textContent =
      "Please select a PDF file.";

    pdfInput.value = "";
    return;
  }

  uploadMessage.textContent = "Uploading PDF...";

  try {
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath =
      `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;

    // Upload the actual file to Supabase Storage
    const { error: uploadError } =
      await supabase.storage
        .from("pdf-files")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false
        });

    if (uploadError) {
      throw uploadError;
    }

    // Save PDF information in the database
    const { error: databaseError } =
      await supabase
        .from("pdf_files")
        .insert({
          name: file.name,
          storage_path: filePath,
          uploaded_by: currentUser.id
        });

    if (databaseError) {
      // Avoid leaving an unlisted file behind
      await supabase.storage
        .from("pdf-files")
        .remove([filePath]);

      throw databaseError;
    }

    uploadMessage.textContent =
      "Your PDF has been uploaded!";

    await loadPDFs();

  } catch (error) {
    uploadMessage.textContent =
      "Upload failed: " + error.message;

  } finally {
    pdfInput.value = "";
  }
});

// Load all PDFs from the shared library
async function loadPDFs() {
  pdfList.innerHTML = `
    <p class="empty-message">Loading PDFs...</p>
  `;

  const { data, error } = await supabase
    .from("pdf_files")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    pdfList.innerHTML = `
      <p class="empty-message">
        Could not load PDFs: ${escapeHTML(error.message)}
      </p>
    `;

    return;
  }

  allPDFs = data || [];

  renderPDFs(allPDFs);
}

// Display PDFs
function renderPDFs(files) {
  pdfList.innerHTML = "";

  if (files.length === 0) {
    pdfList.innerHTML = `
      <p class="empty-message">
        Nothing here yet. Upload your first PDF!
      </p>
    `;

    return;
  }

  files.forEach((file) => {
    const card = document.createElement("article");

    card.className = "pdf-card";

    const isOwner =
      file.uploaded_by === currentUser.id;

    card.innerHTML = `
      <div class="pdf-icon">PDF</div>

      <div class="pdf-details">
        <h3>${escapeHTML(file.name)}</h3>

        <p>
          Uploaded ${new Date(
            file.created_at
          ).toLocaleDateString()}
        </p>
      </div>

      <div class="pdf-actions">

        <button class="action-button view-button">
          View
        </button>

        <button class="action-button download-button">
          Download
        </button>

        ${
          isOwner
            ? `<button class="action-button delete-button">
                 Delete
               </button>`
            : ""
        }

      </div>
    `;

    card.querySelector(".view-button")
      .addEventListener("click", () => {
        openPDF(file, false);
      });

    card.querySelector(".download-button")
      .addEventListener("click", () => {
        openPDF(file, true);
      });

    if (isOwner) {
      card.querySelector(".delete-button")
        .addEventListener("click", () => {
          deletePDF(file);
        });
    }

    pdfList.appendChild(card);
  });
}

// Create a temporary private URL for viewing or downloading
async function openPDF(file, download) {
  const { data, error } =
    await supabase.storage
      .from("pdf-files")
      .createSignedUrl(
        file.storage_path,
        60 * 5,
        {
          download: download ? file.name : false
        }
      );

  if (error) {
    alert("Could not open PDF: " + error.message);
    return;
  }

  window.open(
    data.signedUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

// Delete a PDF
async function deletePDF(file) {
  const confirmed = confirm(
    `Are you sure you want to delete "${file.name}"?`
  );

  if (!confirmed) return;

  // Delete actual file
  const { error: storageError } =
    await supabase.storage
      .from("pdf-files")
      .remove([file.storage_path]);

  if (storageError) {
    alert(storageError.message);
    return;
  }

  // Delete database record
  const { error: databaseError } =
    await supabase
      .from("pdf_files")
      .delete()
      .eq("id", file.id);

  if (databaseError) {
    alert(databaseError.message);
    return;
  }

  await loadPDFs();
}

// Search PDFs
searchInput.addEventListener("input", () => {
  const searchTerm =
    searchInput.value.toLowerCase();

  const filteredPDFs = allPDFs.filter((file) =>
    file.name.toLowerCase().includes(searchTerm)
  );

  renderPDFs(filteredPDFs);
});

// Escape user-provided text before inserting it into HTML
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}
