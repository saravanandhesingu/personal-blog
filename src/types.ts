/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Post {
  id: string; // The Firestore document ID (slug)
  title: string;
  slug: string; // URL friendly string slug
  content: string; // Markdown text
  excerpt: string; // Short teaser
  published: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  tags: string[];
  readTime: string;
  authorEmail: string;
  views: number;
}

export interface UserContextType {
  user: any;
  loading: boolean;
  isAuthor: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
