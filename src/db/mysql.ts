import mysql from "mysql2/promise";
import { DatabaseSchema, User, UserProfile, PortfolioData, ResumeData, CoverLetterData, DocumentFile, ServicePackage, Subscription, Template, ActivityLog, SalesStat } from "../types";

let pool: mysql.Pool | null = null;
let useMySQL = false;

export async function initMySQL(): Promise<boolean> {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user) {
    console.warn("⚠️ MySQL Database configurations not fully set. Falling back to local JSON store.");
    useMySQL = false;
    return false;
  }

  try {
    // Create connection pool
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to MySQL Database at:", host);
    connection.release();

    // Create tables if they do not exist
    await createTablesIfNotExist();
    useMySQL = true;
    return true;
  } catch (error) {
    console.error("❌ Failed to initiate MySQL Database, falling back to local JSON:", error);
    useMySQL = false;
    return false;
  }
}

export function isMySQLActive(): boolean {
  return useMySQL;
}

async function createTablesIfNotExist() {
  if (!pool) return;

  // 1. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      isActive TINYINT(1) DEFAULT 1,
      createdAt VARCHAR(255) NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      resetToken VARCHAR(255) NULL,
      resetTokenExpiry VARCHAR(255) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. Profiles Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      userId VARCHAR(255) PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      placeOfBirth VARCHAR(255) NULL,
      dateOfBirth VARCHAR(100) NULL,
      gender VARCHAR(50) NULL,
      city VARCHAR(255) NULL,
      address TEXT NULL,
      nik VARCHAR(255) NULL,
      phone VARCHAR(255) NULL,
      photoUrl TEXT NULL,
      email VARCHAR(255) NOT NULL,
      age INT DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Portfolios Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      templateId VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      aboutMe TEXT NULL,
      experiences JSON NULL,
      projects JSON NULL,
      educations JSON NULL,
      certificates JSON NULL,
      skills JSON NULL,
      phone VARCHAR(255) NULL,
      address TEXT NULL,
      whatsapp VARCHAR(255) NULL,
      instagram VARCHAR(255) NULL,
      tiktok VARCHAR(255) NULL,
      linkedin VARCHAR(255) NULL,
      github VARCHAR(255) NULL,
      updatedAt VARCHAR(255) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. Resumes Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resumes (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      templateId VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      aboutMe TEXT NULL,
      experiences JSON NULL,
      educations JSON NULL,
      certificates JSON NULL,
      skills JSON NULL,
      phone VARCHAR(255) NULL,
      address TEXT NULL,
      whatsapp VARCHAR(255) NULL,
      instagram VARCHAR(255) NULL,
      tiktok VARCHAR(255) NULL,
      linkedin VARCHAR(255) NULL,
      github VARCHAR(255) NULL,
      customHtml LONGTEXT NULL,
      updatedAt VARCHAR(255) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. Covers Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS covers (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      templateId VARCHAR(255) NOT NULL,
      companyName VARCHAR(255) NOT NULL,
      companyAddress TEXT NULL,
      jobTitle VARCHAR(255) NOT NULL,
      letterContent LONGTEXT NULL,
      updatedAt VARCHAR(255) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. Documents Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      fileType VARCHAR(255) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      filePathUrl TEXT NOT NULL,
      uploadedAt VARCHAR(255) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. Packages Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DOUBLE DEFAULT 0,
      durationDays INT DEFAULT 30,
      features JSON NULL,
      isFeatured TINYINT(1) DEFAULT 0,
      accessPortfolio VARCHAR(255) DEFAULT 'all',
      accessResume VARCHAR(255) DEFAULT 'all',
      accessLetter VARCHAR(255) DEFAULT 'all',
      accessUploadDocs VARCHAR(255) DEFAULT 'all'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 8. Subscriptions Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      userId VARCHAR(255) PRIMARY KEY,
      packageId VARCHAR(255) NOT NULL,
      packageName VARCHAR(255) NOT NULL,
      startDate VARCHAR(255) NOT NULL,
      endDate VARCHAR(255) NOT NULL,
      isActive TINYINT(1) DEFAULT 1,
      domainHostingPath VARCHAR(255) NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 9. Templates Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      htmlMarkup LONGTEXT NULL,
      cssMarkup LONGTEXT NULL,
      tier VARCHAR(255) NULL,
      createdAt VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 10. Logs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      userEmail VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      timestamp VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 11. Sales Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      month VARCHAR(255) PRIMARY KEY,
      sales DOUBLE DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 12. Ads Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ads_config (
      id VARCHAR(255) PRIMARY KEY,
      leftName VARCHAR(255) NULL,
      leftScript LONGTEXT NULL,
      rightName VARCHAR(255) NULL,
      rightScript LONGTEXT NULL,
      name VARCHAR(255) NULL,
      script LONGTEXT NULL,
      socialBarScript LONGTEXT NULL,
      bannerActive INT DEFAULT 1,
      socialActive INT DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN leftName VARCHAR(255) NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN leftScript LONGTEXT NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN rightName VARCHAR(255) NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN rightScript LONGTEXT NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN name VARCHAR(255) NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN script LONGTEXT NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN socialBarScript LONGTEXT NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN bannerActive INT DEFAULT 1");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE ads_config ADD COLUMN socialActive INT DEFAULT 1");
  } catch (err) {}

  // Safely add missing columns to packages table if they do not exist in pre-existing DBs
  try {
    await pool.query("ALTER TABLE packages ADD COLUMN accessPortfolio VARCHAR(255) DEFAULT 'all'");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE packages ADD COLUMN accessResume VARCHAR(255) DEFAULT 'all'");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE packages ADD COLUMN accessLetter VARCHAR(255) DEFAULT 'all'");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE packages ADD COLUMN accessUploadDocs VARCHAR(255) DEFAULT 'all'");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE portfolios ADD COLUMN skills JSON NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE resumes ADD COLUMN skills JSON NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE resumes ADD COLUMN customHtml LONGTEXT NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE profiles ADD COLUMN city VARCHAR(255) NULL");
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE documents MODIFY COLUMN filePathUrl LONGTEXT NOT NULL");
  } catch (err) {}
}

export async function loadMySQLDb(): Promise<DatabaseSchema | null> {
  if (!pool || !useMySQL) return null;

  try {
    const [users] = await pool.query("SELECT * FROM users");
    const [profiles] = await pool.query("SELECT * FROM profiles");
    const [portfolios] = await pool.query("SELECT * FROM portfolios");
    const [resumes] = await pool.query("SELECT * FROM resumes");
    const [covers] = await pool.query("SELECT * FROM covers");
    const [documents] = await pool.query("SELECT * FROM documents");
    const [packages] = await pool.query("SELECT * FROM packages");
    const [subscriptions] = await pool.query("SELECT * FROM subscriptions");
    const [templates] = await pool.query("SELECT * FROM templates");
    const [logs] = await pool.query("SELECT * FROM logs");
    const [sales] = await pool.query("SELECT * FROM sales");

    let adsData = {
      leftName: "",
      leftScript: "",
      rightName: "",
      rightScript: "",
      name: "",
      script: "",
      socialBarScript: "",
      bannerActive: true,
      socialActive: true
    };
    try {
      const [adsRows] = await pool.query("SELECT * FROM ads_config LIMIT 1") as any[];
      if (adsRows && adsRows.length > 0) {
        const row = adsRows[0];
        const rawName = row.name || row.leftName || "";
        const rawScript = row.script || row.leftScript || "";
        adsData = {
          leftName: row.leftName || rawName,
          leftScript: row.leftScript || rawScript,
          rightName: row.rightName || rawName,
          rightScript: row.rightScript || rawScript,
          name: rawName,
          script: rawScript,
          socialBarScript: row.socialBarScript || "",
          bannerActive: row.bannerActive !== 0,
          socialActive: row.socialActive !== 0
        };
      }
    } catch (e) {
      console.warn("⚠️ Could not load ads_config from MySQL table, database might not be initialized yet.", e);
    }

    // Parse JSON columns back to arrays / objects
    const mappedUsers = (users as any[]).map(u => ({
      ...u,
      isActive: !!u.isActive,
    }));

    const mappedProfiles = (profiles as any[]).map(p => ({
      ...p,
    }));

    const mappedPortfolios = (portfolios as any[]).map(p => ({
      ...p,
      experiences: p.experiences ? (typeof p.experiences === 'string' ? JSON.parse(p.experiences) : p.experiences) : [],
      projects: p.projects ? (typeof p.projects === 'string' ? JSON.parse(p.projects) : p.projects) : [],
      educations: p.educations ? (typeof p.educations === 'string' ? JSON.parse(p.educations) : p.educations) : [],
      certificates: p.certificates ? (typeof p.certificates === 'string' ? JSON.parse(p.certificates) : p.certificates) : [],
      skills: p.skills ? (typeof p.skills === 'string' ? JSON.parse(p.skills) : p.skills) : [],
    }));

    const mappedResumes = (resumes as any[]).map(r => ({
      ...r,
      experiences: r.experiences ? (typeof r.experiences === 'string' ? JSON.parse(r.experiences) : r.experiences) : [],
      educations: r.educations ? (typeof r.educations === 'string' ? JSON.parse(r.educations) : r.educations) : [],
      certificates: r.certificates ? (typeof r.certificates === 'string' ? JSON.parse(r.certificates) : r.certificates) : [],
      skills: r.skills ? (typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills) : [],
    }));

    const mappedCovers = (covers as any[]).map(c => ({
      ...c,
    }));

    const mappedDocuments = (documents as any[]).map(d => ({
      ...d,
    }));

    const mappedPackages = (packages as any[]).map(pkg => {
      const id = pkg.id;
      return {
        ...pkg,
        isFeatured: !!pkg.isFeatured,
        accessPortfolio: id === "pkg_basic" ? "basic" : id === "pkg_standard" ? "standard" : id === "pkg_premium" ? "all" : (pkg.accessPortfolio || "all"),
        accessResume: id === "pkg_basic" ? "basic" : id === "pkg_standard" ? "standard" : id === "pkg_premium" ? "all" : (pkg.accessResume || "all"),
        accessLetter: id === "pkg_basic" ? "basic" : id === "pkg_standard" ? "standard" : id === "pkg_premium" ? "all" : (pkg.accessLetter || "all"),
        accessUploadDocs: id === "pkg_basic" ? "none" : id === "pkg_standard" ? "restricted" : id === "pkg_premium" ? "all" : (pkg.accessUploadDocs || "all"),
        features: (() => {
          if (!pkg.features) return [];
          if (typeof pkg.features === 'string') {
            const trimmed = pkg.features.trim();
            if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
              try {
                const res = JSON.parse(trimmed);
                return Array.isArray(res) ? res : [res];
              } catch (e) {
                return trimmed.split(",").map((f: any) => f.trim()).filter(Boolean);
              }
            }
            return trimmed.split(",").map((f: any) => f.trim()).filter(Boolean);
          }
          return Array.isArray(pkg.features) ? pkg.features : [String(pkg.features)];
        })(),
      };
    });

    const mappedSubscriptions = (subscriptions as any[]).map(sub => ({
      ...sub,
      isActive: !!sub.isActive,
    }));

    const mappedTemplates = (templates as any[]).map(t => ({
      ...t,
    }));

    const mappedLogs = (logs as any[]).map(l => ({
      ...l,
    }));

    const mappedSales = (sales as any[]).map(s => ({
      ...s,
    }));

    return {
      users: mappedUsers,
      profiles: mappedProfiles,
      portfolios: mappedPortfolios,
      resumes: mappedResumes,
      covers: mappedCovers,
      documents: mappedDocuments,
      packages: mappedPackages,
      subscriptions: mappedSubscriptions,
      templates: mappedTemplates,
      logs: mappedLogs,
      sales: mappedSales,
      ads: adsData,
    };
  } catch (error) {
    console.error("❌ Error loading database from MySQL pools:", error);
    return null;
  }
}

export async function saveMySQLDb(data: DatabaseSchema): Promise<boolean> {
  if (!pool || !useMySQL) return false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Secure pruning of orphan records to prevent Foreign Key constraints check failures in MySQL
    const validUserIds = new Set((data.users || []).map(u => u.id));
    const validProfiles = (data.profiles || []).filter(p => p.userId && validUserIds.has(p.userId));
    const validPortfolios = (data.portfolios || []).filter(p => p.userId && validUserIds.has(p.userId));
    const validResumes = (data.resumes || []).filter(r => r.userId && validUserIds.has(r.userId));
    const validCovers = (data.covers || []).filter(c => c.userId && validUserIds.has(c.userId));
    const validDocuments = (data.documents || []).filter(d => d.userId && validUserIds.has(d.userId));
    const validSubscriptions = (data.subscriptions || []).filter(s => s.userId && validUserIds.has(s.userId));

    // 1. Sync users
    for (const u of data.users) {
      await conn.query(
        `INSERT INTO users (id, email, fullName, role, isActive, createdAt, passwordHash, resetToken, resetTokenExpiry)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         email = VALUES(email), fullName = VALUES(fullName), role = VALUES(role), 
         isActive = VALUES(isActive), passwordHash = VALUES(passwordHash), 
         resetToken = VALUES(resetToken), resetTokenExpiry = VALUES(resetTokenExpiry)`,
        [u.id, u.email, u.fullName, u.role, u.isActive ? 1 : 0, u.createdAt, u.passwordHash, u.resetToken || null, u.resetTokenExpiry || null]
      );
    }
    const userIds = data.users.map(u => u.id);
    if (userIds.length > 0) {
      await conn.query("DELETE FROM users WHERE id NOT IN (?)", [userIds]);
    } else {
      await conn.query("DELETE FROM users");
    }

    // 2. Sync profiles
    for (const p of validProfiles) {
      await conn.query(
        `INSERT INTO profiles (userId, fullName, placeOfBirth, dateOfBirth, gender, city, address, nik, phone, photoUrl, email, age)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         fullName = VALUES(fullName), placeOfBirth = VALUES(placeOfBirth), dateOfBirth = VALUES(dateOfBirth),
         gender = VALUES(gender), city = VALUES(city), address = VALUES(address), nik = VALUES(nik), phone = VALUES(phone),
         photoUrl = VALUES(photoUrl), email = VALUES(email), age = VALUES(age)`,
        [p.userId, p.fullName, p.placeOfBirth || null, p.dateOfBirth || null, p.gender || null, p.city || null, p.address || null, p.nik || null, p.phone || null, p.photoUrl || null, p.email, p.age]
      );
    }
    const profileUserIds = validProfiles.map(p => p.userId);
    if (profileUserIds.length > 0) {
      await conn.query("DELETE FROM profiles WHERE userId NOT IN (?)", [profileUserIds]);
    } else {
      await conn.query("DELETE FROM profiles");
    }

    // 3. Sync portfolios
    for (const p of validPortfolios) {
      await conn.query(
        `INSERT INTO portfolios (id, userId, templateId, title, aboutMe, experiences, projects, educations, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         templateId = VALUES(templateId), title = VALUES(title), aboutMe = VALUES(aboutMe),
         experiences = VALUES(experiences), projects = VALUES(projects), educations = VALUES(educations),
         certificates = VALUES(certificates), skills = VALUES(skills), phone = VALUES(phone), address = VALUES(address),
         whatsapp = VALUES(whatsapp), instagram = VALUES(instagram), tiktok = VALUES(tiktok),
         linkedin = VALUES(linkedin), github = VALUES(github), updatedAt = VALUES(updatedAt)`,
        [
          p.id, p.userId, p.templateId, p.title, p.aboutMe || null,
          JSON.stringify(p.experiences || []), JSON.stringify(p.projects || []),
          JSON.stringify(p.educations || []), JSON.stringify(p.certificates || []),
          JSON.stringify(p.skills || []),
          p.phone || null, p.address || null, p.whatsapp || null, p.instagram || null,
          p.tiktok || null, p.linkedin || null, p.github || null, p.updatedAt
        ]
      );
    }
    const portfolioIds = validPortfolios.map(p => p.id);
    if (portfolioIds.length > 0) {
      await conn.query("DELETE FROM portfolios WHERE id NOT IN (?)", [portfolioIds]);
    } else {
      await conn.query("DELETE FROM portfolios");
    }

    // 4. Sync resumes
    for (const r of validResumes) {
      await conn.query(
        `INSERT INTO resumes (id, userId, templateId, title, aboutMe, experiences, educations, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github, customHtml, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         templateId = VALUES(templateId), title = VALUES(title), aboutMe = VALUES(aboutMe),
         experiences = VALUES(experiences), educations = VALUES(educations), certificates = VALUES(certificates),
         skills = VALUES(skills),
         phone = VALUES(phone), address = VALUES(address), whatsapp = VALUES(whatsapp),
         instagram = VALUES(instagram), tiktok = VALUES(tiktok), linkedin = VALUES(linkedin),
         github = VALUES(github), customHtml = VALUES(customHtml), updatedAt = VALUES(updatedAt)`,
        [
          r.id, r.userId, r.templateId, r.title, r.aboutMe || null,
          JSON.stringify(r.experiences || []), JSON.stringify(r.educations || []),
          JSON.stringify(r.certificates || []), JSON.stringify(r.skills || []),
          r.phone || null, r.address || null, r.whatsapp || null, r.instagram || null,
          r.tiktok || null, r.linkedin || null, r.github || null, r.customHtml || null, r.updatedAt
        ]
      );
    }
    const resumeIds = validResumes.map(r => r.id);
    if (resumeIds.length > 0) {
      await conn.query("DELETE FROM resumes WHERE id NOT IN (?)", [resumeIds]);
    } else {
      await conn.query("DELETE FROM resumes");
    }

    // 5. Sync covers
    for (const c of validCovers) {
      await conn.query(
        `INSERT INTO covers (id, userId, templateId, companyName, companyAddress, jobTitle, letterContent, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         templateId = VALUES(templateId), companyName = VALUES(companyName),
         companyAddress = VALUES(companyAddress), jobTitle = VALUES(jobTitle),
         letterContent = VALUES(letterContent), updatedAt = VALUES(updatedAt)`,
        [c.id, c.userId, c.templateId, c.companyName, c.companyAddress || null, c.jobTitle, c.letterContent || null, c.updatedAt]
      );
    }
    const coverIds = validCovers.map(c => c.id);
    if (coverIds.length > 0) {
      await conn.query("DELETE FROM covers WHERE id NOT IN (?)", [coverIds]);
    } else {
      await conn.query("DELETE FROM covers");
    }

    // 6. Sync documents
    for (const d of validDocuments) {
      await conn.query(
        `INSERT INTO documents (id, userId, fileType, fileName, filePathUrl, uploadedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         fileType = VALUES(fileType), fileName = VALUES(fileName),
         filePathUrl = VALUES(filePathUrl), uploadedAt = VALUES(uploadedAt)`,
        [d.id, d.userId, d.fileType, d.fileName, d.filePathUrl, d.uploadedAt]
      );
    }
    const documentIds = validDocuments.map(d => d.id);
    if (documentIds.length > 0) {
      await conn.query("DELETE FROM documents WHERE id NOT IN (?)", [documentIds]);
    } else {
      await conn.query("DELETE FROM documents");
    }

    // 7. Sync packages
    for (const p of data.packages) {
      await conn.query(
        `INSERT INTO packages (id, name, price, durationDays, features, isFeatured, accessPortfolio, accessResume, accessLetter, accessUploadDocs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name), price = VALUES(price), durationDays = VALUES(durationDays),
         features = VALUES(features), isFeatured = VALUES(isFeatured),
         accessPortfolio = VALUES(accessPortfolio), accessResume = VALUES(accessResume),
         accessLetter = VALUES(accessLetter), accessUploadDocs = VALUES(accessUploadDocs)`,
        [p.id, p.name, p.price, p.durationDays, JSON.stringify(p.features || []), p.isFeatured ? 1 : 0, p.accessPortfolio || (p.id === 'pkg_basic' ? 'basic' : p.id === 'pkg_standard' ? 'standard' : 'all'), p.accessResume || (p.id === 'pkg_basic' ? 'basic' : p.id === 'pkg_standard' ? 'standard' : 'all'), p.accessLetter || (p.id === 'pkg_basic' ? 'basic' : p.id === 'pkg_standard' ? 'standard' : 'all'), p.accessUploadDocs || (p.id === 'pkg_basic' ? 'none' : p.id === 'pkg_standard' ? 'restricted' : 'all')]
      );
    }
    const packageIds = data.packages.map(p => p.id);
    if (packageIds.length > 0) {
      await conn.query("DELETE FROM packages WHERE id NOT IN (?)", [packageIds]);
    } else {
      await conn.query("DELETE FROM packages");
    }

    // 8. Sync subscriptions
    for (const s of validSubscriptions) {
      // Avoid duplicate empty strings for idx_sub_domain unique key on domainHostingPath
      const finalHostingPath = s.domainHostingPath && s.domainHostingPath.trim() !== "" 
        ? s.domainHostingPath.trim() 
        : `free_${s.userId}`;

      await conn.query(
        `INSERT INTO subscriptions (userId, packageId, packageName, startDate, endDate, isActive, domainHostingPath)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         packageId = VALUES(packageId), packageName = VALUES(packageName),
         startDate = VALUES(startDate), endDate = VALUES(endDate),
         isActive = VALUES(isActive), domainHostingPath = VALUES(domainHostingPath)`,
        [
          s.userId, 
          s.packageId || "free", 
          s.packageName || "Free", 
          s.startDate || new Date().toISOString(), 
          s.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), 
          s.isActive ? 1 : 0, 
          finalHostingPath
        ]
      );
    }
    const subscriptionUserIds = validSubscriptions.map(s => s.userId);
    if (subscriptionUserIds.length > 0) {
      await conn.query("DELETE FROM subscriptions WHERE userId NOT IN (?)", [subscriptionUserIds]);
    } else {
      await conn.query("DELETE FROM subscriptions");
    }

    // 9. Sync templates
    for (const t of data.templates) {
      await conn.query(
        `INSERT INTO templates (id, name, category, htmlMarkup, cssMarkup, tier, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name), category = VALUES(category), htmlMarkup = VALUES(htmlMarkup),
         cssMarkup = VALUES(cssMarkup), tier = VALUES(tier), createdAt = VALUES(createdAt)`,
        [t.id, t.name, t.category, t.htmlMarkup || null, t.cssMarkup || null, t.tier || null, t.createdAt]
      );
    }
    const templateIds = data.templates.map(t => t.id);
    if (templateIds.length > 0) {
      await conn.query("DELETE FROM templates WHERE id NOT IN (?)", [templateIds]);
    } else {
      await conn.query("DELETE FROM templates");
    }

    // 10. Sync logs
    for (const l of data.logs) {
      await conn.query(
        `INSERT INTO logs (id, userId, userEmail, message, timestamp)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         userId = VALUES(userId), userEmail = VALUES(userEmail),
         message = VALUES(message), timestamp = VALUES(timestamp)`,
        [l.id, l.userId || "system", l.userEmail || "system", l.message || "", l.timestamp || new Date().toISOString()]
      );
    }
    const logIds = data.logs.map(l => l.id);
    if (logIds.length > 0) {
      await conn.query("DELETE FROM logs WHERE id NOT IN (?)", [logIds]);
    } else {
      await conn.query("DELETE FROM logs");
    }

    // 11. Sync sales
    for (const s of data.sales) {
      await conn.query(
        `INSERT INTO sales (month, sales)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
         sales = VALUES(sales)`,
        [s.month, s.sales]
      );
    }
    const saleMonths = data.sales.map(s => s.month);
    if (saleMonths.length > 0) {
      await conn.query("DELETE FROM sales WHERE month NOT IN (?)", [saleMonths]);
    } else {
      await conn.query("DELETE FROM sales");
    }

    // 12. Sync ads config
    if (data.ads) {
      const name = data.ads.name || data.ads.leftName || "";
      const script = data.ads.script || data.ads.leftScript || "";
      const leftName = data.ads.leftName || name;
      const leftScript = data.ads.leftScript || script;
      const rightName = data.ads.rightName || name;
      const rightScript = data.ads.rightScript || script;
      const socialBarScript = data.ads.socialBarScript || "";
      const bannerActive = data.ads.bannerActive !== false ? 1 : 0;
      const socialActive = data.ads.socialActive !== false ? 1 : 0;

      await conn.query(
        `INSERT INTO ads_config (id, leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         leftName = VALUES(leftName), leftScript = VALUES(leftScript),
         rightName = VALUES(rightName), rightScript = VALUES(rightScript),
         name = VALUES(name), script = VALUES(script),
         socialBarScript = VALUES(socialBarScript),
         bannerActive = VALUES(bannerActive),
         socialActive = VALUES(socialActive)`,
        ['active_ad', leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive]
      );
    }

    await conn.commit();
    return true;
  } catch (error) {
    if (conn) {
      await conn.rollback();
    }
    console.error("❌ Error syncing database to MySQL databases:", error);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
