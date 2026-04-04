// express backend core
// dependencies: express, multer, auth, db limiters

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // requires https for prod
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

// setup file uploads with random names and strict type checking
const ALLOWED_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "public", "uploads"));
  },
  filename: (_req, file, cb) => {
    // generate unique filename hash
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, .png, .webp, and .gif files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // max upload cap
});

// block api spam (5 req/hr)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // timeframe
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please try again later." },
});

// secure endpoint guard
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized. Please log in." });
}

// core endpoints

// fetch all approved gallery photos
app.get("/api/images", (_req, res) => {
  db.all(
    "SELECT id, filepath, description, view_count FROM images WHERE status = 'approved' ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error("[API] GET /api/images error:", err.message);
        return res.status(500).json({ error: "Failed to fetch images." });
      }
      return res.json(rows);
    }
  );
});

// handle new memory submissions
app.post("/api/upload", uploadLimiter, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filepath = `/uploads/${req.file.filename}`;
    const description = req.body.description || "";

    db.run(
      "INSERT INTO images (filepath, description, status) VALUES (?, ?, 'pending')",
      [filepath, description],
      function (dbErr) {
        if (dbErr) {
          console.error("[API] POST /api/upload insert error:", dbErr.message);
          return res.status(500).json({ error: "Failed to save image." });
        }
        return res.status(201).json({
          message: "Image uploaded successfully. It will appear after admin approval.",
          id: this.lastID,
        });
      }
    );
  });
});

// check admin passwords
app.post("/api/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminHash = process.env.ADMIN_PASSWORD;

    if (username !== adminUser) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // check if stored variable is a hash
    // fallback to plaintext for local dev
    let valid = false;
    if (adminHash && adminHash.startsWith("$2b$")) {
      valid = await bcrypt.compare(password, adminHash);
    } else {
      // warn: bypass hash check
      valid = password === (adminHash || "admin");
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    req.session.isAdmin = true;
    return res.json({ message: "Login successful." });
  } catch (error) {
    console.error("[API] POST /api/admin-login error:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// fetch unapproved queue
app.get("/api/admin/pending", requireAuth, (_req, res) => {
  db.all(
    "SELECT id, filepath, description, view_count FROM images WHERE status = 'pending' ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error("[API] GET /api/admin/pending error:", err.message);
        return res.status(500).json({ error: "Failed to fetch pending images." });
      }
      return res.json(rows);
    }
  );
});

// authorize photo for public gallery
app.post("/api/admin/approve/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  db.run(
    "UPDATE images SET status = 'approved' WHERE id = ? AND status = 'pending'",
    [id],
    function (err) {
      if (err) {
        console.error("[API] POST /api/admin/approve error:", err.message);
        return res.status(500).json({ error: "Failed to approve image." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Image not found or already approved." });
      }
      return res.json({ message: "Image approved." });
    }
  );
});

// hotfix payload descriptors
app.put("/api/admin/edit/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description payload is required." });
  }

  db.run(
    "UPDATE images SET description = ? WHERE id = ?",
    [description, id],
    function (err) {
      if (err) {
        console.error("[API] PUT /api/admin/edit error:", err.message);
        return res.status(500).json({ error: "Failed to update record." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Image not found." });
      }
      return res.json({ message: "Record updated successfully." });
    }
  );
});

// terminate record and nuke file
app.delete("/api/admin/reject/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  // grab path before wiping db
  db.get("SELECT filepath FROM images WHERE id = ?", [id], async (err, row) => {
    if (err) {
      console.error("[API] DELETE /api/admin/reject select error:", err.message);
      return res.status(500).json({ error: "Failed to reject image." });
    }
    if (!row) {
      return res.status(404).json({ error: "Image not found." });
    }

    // clear from sqlite
    db.run("DELETE FROM images WHERE id = ?", [id], async function (delErr) {
      if (delErr) {
        console.error("[API] DELETE /api/admin/reject delete error:", delErr.message);
        return res.status(500).json({ error: "Failed to delete image record." });
      }

      // safely ignore missing files during purge
      const absolutePath = path.join(__dirname, "public", row.filepath);
      try {
        await fs.promises.unlink(absolutePath);
        console.log("[API] Deleted file:", absolutePath);
      } catch (unlinkErr) {
        if (unlinkErr.code === "ENOENT") {
          console.warn("[API] File already missing, skipping unlink:", absolutePath);
        } else {
          console.error("[API] Unexpected unlink error:", unlinkErr.message);
        }
      }

      return res.json({ message: "Image rejected and deleted." });
    });
  });
});

// bump impression tracker
app.post("/api/images/:id/view", (req, res) => {
  const { id } = req.params;
  db.run("UPDATE images SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?", [id], function(err) {
    if (err) {
      console.error("[API] POST view error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    db.get("SELECT view_count FROM images WHERE id = ?", [id], (err, row) => {
      res.json({ views: row ? row.view_count : 0 });
    });
  });
});

// boot backend
app.listen(PORT, () => {
  console.log(`[SERVER] BSCS 1A Memory Book running on http://localhost:${PORT}`);
});
