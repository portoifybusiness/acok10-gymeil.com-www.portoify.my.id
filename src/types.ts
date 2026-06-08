/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  city?: string;
  address: string;
  nik: string;
  phone: string;
  photoUrl: string;
  email: string; // from user registration, read-only
  age: number;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  jobdesk: string;
}

export interface Project {
  name: string;
  description: string;
  link: string;
  image?: string; // Base64 project photo (max 1MB)
}

export interface Education {
  institution: string;
  degree: string;
  period: string;
}

export interface PortfolioData {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  aboutMe: string;
  experiences: Experience[]; // max 3
  projects: Project[]; // max 3
  educations: Education[];
  certificates: string[]; // max 3
  skills?: string[];
  phone: string;
  address: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
  github: string;
  updatedAt: string;
}

export interface ResumeData {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  aboutMe: string;
  experiences: Experience[]; // max 3
  educations: Education[];
  projects?: Project[];
  certificates: string[]; // max 3
  skills?: string[];
  phone: string;
  address: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
  github: string;
  customHtml?: string;
  updatedAt: string;
}

export interface CoverLetterData {
  id: string;
  userId: string;
  templateId: string;
  companyName: string;
  companyAddress: string;
  jobTitle: string;
  letterContent: string;
  updatedAt: string;
}

export interface DocumentFile {
  id: string;
  userId: string;
  fileType: string;
  fileName: string;
  filePathUrl: string; // Base64 data or mock file URL
  uploadedAt: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isFeatured?: boolean;
  accessPortfolio?: 'none' | 'basic' | 'standard' | 'premium' | 'all';
  accessResume?: 'none' | 'basic' | 'standard' | 'premium' | 'all';
  accessLetter?: 'none' | 'basic' | 'standard' | 'premium' | 'all';
  accessUploadDocs?: 'none' | 'restricted' | 'all';
}

export interface Subscription {
  userId: string;
  packageId: string;
  packageName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  domainHostingPath: string; // public_html/path folder
}

export interface Template {
  id: string;
  name: string;
  category: 'portfolio' | 'resume' | 'cover_letter';
  htmlMarkup: string; // Tailwind dynamic HTML markup
  cssMarkup?: string;
  tier?: 'free' | 'basic' | 'standard' | 'premium';
  previewUrl?: string;
  description?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  message: string;
  timestamp: string;
}

export interface SalesStat {
  month: string;
  sales: number;
}

export interface DatabaseSchema {
  users: Array<User & { passwordHash: string; resetToken?: string; resetTokenExpiry?: string }>;
  profiles: UserProfile[];
  portfolios: PortfolioData[];
  resumes: ResumeData[];
  covers: CoverLetterData[];
  documents: DocumentFile[];
  packages: ServicePackage[];
  subscriptions: Subscription[];
  templates: Template[];
  logs: ActivityLog[];
  sales: SalesStat[];
  ads?: { leftName?: string; leftScript?: string; rightName?: string; rightScript?: string; name?: string; script?: string; socialBarScript?: string; bannerActive?: boolean; socialActive?: boolean; };
}
