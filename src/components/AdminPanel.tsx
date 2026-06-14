/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, Eye, Save, Plus, Trash2, Edit2, Check, AlertCircle, FileText, Globe, 
  Settings, Bold, Italic, Link, List, Quote, Code, RotateCcw, ListRestart,
  Image as ImageIcon, Upload, X, Link2, FileImage, Loader2
} from 'lucide-react';
import { Post, OperationType } from '../types';
import { db, handleFirestoreError } from '../firebase';
import { doc, setDoc, deleteDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';
import Markdown from 'react-markdown';

// Compress, resize and convert an image file to Base64 JPEG string
const compressAndResizeImage = (file: File, maxWidth = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if width exceeds maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string); // Fallback to original Base64 if 2D context fails
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export to JPEG with quality compression (JPEG is much more size-efficient than PNG)
        const output = canvas.toDataURL('image/jpeg', quality);
        resolve(output);
      };
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  posts: Post[];
  isAuthor: boolean;
  onRefreshPosts: () => Promise<void>;
  onSelectPostToRead: (post: Post) => void;
}

export default function AdminPanel({ posts, isAuthor, onRefreshPosts, onSelectPostToRead }: AdminPanelProps) {
  // Post Editor States
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // Image Upload and Link States
  const [coverImage, setCoverImage] = useState('');
  const [showImgInserter, setShowImgInserter] = useState(false);
  const [insertAlt, setInsertAlt] = useState('');
  const [insertUrl, setInsertUrl] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [imageError, setImageError] = useState<string | null>(null);
  
  // UI Interaction States
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Auto-generate slug from title
  useEffect(() => {
    if (!editingPostId) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .trim()
        .replace(/\s+/g, '-');      // replace spaces with dashes
      setSlug(generated);
    }
  }, [title, editingPostId]);

  // Calculate read time automatically
  const getEstimatedReadTime = () => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return `${minutes} min read`;
  };

  const handleCreateNew = () => {
    setEditingPostId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setPublished(true);
    setTags([]);
    setTagsInput('');
    setActiveTab('write');
    setStatusMessage(null);
    setCoverImage('');
    setShowImgInserter(false);
    setImageError(null);
  };

  const handleEdit = (post: Post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setPublished(post.published);
    setTags(post.tags || []);
    setTagsInput('');
    setActiveTab('write');
    setStatusMessage(null);
    setCoverImage(post.coverImage || '');
    setShowImgInserter(false);
    setImageError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const sanitized = tagsInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (sanitized && !tags.includes(sanitized)) {
        setTags([...tags, sanitized]);
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper buttons to inject markdown instantly
  const injectMarkdown = (type: 'bold' | 'italic' | 'link' | 'list' | 'quote' | 'code') => {
    const textarea = document.getElementById('content-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = 1;
        break;
      case 'link':
        replacement = `[${selected || 'Link Title'}](https://example.com)`;
        cursorOffset = 1;
        break;
      case 'list':
        replacement = `\n- ${selected || 'List item'}`;
        cursorOffset = 3;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Blockquote block'}`;
        cursorOffset = 3;
        break;
      case 'code':
        replacement = `\`\`\`javascript\n${selected || '// Insert code here'}\n\`\`\``;
        cursorOffset = 14;
        break;
    }

    const valueWithReplacement = text.substring(0, start) + replacement + text.substring(end);
    setContent(valueWithReplacement);

    // Focus back and position selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + replacement.length - cursorOffset);
    }, 50);
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image file is too large (must be under 8MB).");
      return;
    }

    setCoverLoading(true);
    setImageError(null);
    try {
      const base64 = await compressAndResizeImage(file, 900, 0.70);
      setCoverImage(base64);
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || "Failed to process the cover image.");
    } finally {
      setCoverLoading(false);
    }
  };

  const handleInlineImageInsertChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image must be under 8MB.");
      return;
    }

    setInlineLoading(true);
    setImageError(null);
    try {
      const base64 = await compressAndResizeImage(file, 800, 0.65);
      insertIntoMarkdown(base64, file.name.split('.')[0] || "screenshot");
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || "Failed to process the inline screenshot.");
    } finally {
      setInlineLoading(false);
    }
  };

  const insertIntoMarkdown = (urlOrBase64: string, altText: string) => {
    const textarea = document.getElementById('content-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setContent(prev => prev + `\n![${altText || 'screenshot'}](${urlOrBase64})\n`);
      setShowImgInserter(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const replacement = `\n![${altText || 'screenshot'}](${urlOrBase64})\n`;

    const valueWithReplacement = text.substring(0, start) + replacement + text.substring(end);
    setContent(valueWithReplacement);
    
    setShowImgInserter(false);
    setInsertAlt('');
    setInsertUrl('');
    setImageError(null);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthor) {
      setStatusMessage({ text: "Error: You lack administrative privileges.", error: true });
      return;
    }
    if (!title.trim() || !slug.trim() || !content.trim()) {
      setStatusMessage({ text: "Please supply a Title, URL Slug, and Content block.", error: true });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const docId = editingPostId || slug;

    // Strict blueprint structure validation
    const postPayload = {
      id: docId,
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || title.trim().substring(0, 150) + "...",
      content: content,
      published,
      updatedAt: serverTimestamp(),
      tags: tags,
      readTime: getEstimatedReadTime(),
      authorEmail: 'saravanandhesingu1992@gmail.com',
      views: editingPostId ? (posts.find(p => p.id === docId)?.views || 0) : 0,
      coverImage: coverImage || ''
    };

    try {
      const docRef = doc(db, 'posts', docId);
      
      // On create, attach createdAt
      const finalPayload = editingPostId ? {
        ...postPayload,
        createdAt: posts.find(p => p.id === docId)?.createdAt
      } : {
        ...postPayload,
        createdAt: serverTimestamp()
      };

      await setDoc(docRef, finalPayload);
      
      setStatusMessage({ 
        text: editingPostId ? "Success! Post updated successfully." : "Success! Post published successfully.", 
        error: false 
      });

      if (!editingPostId) {
        // Just created, reset form
        handleCreateNew();
      }

      await onRefreshPosts();
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Failed to persist. Firestore Rules denied authentication.", error: true });
      handleFirestoreError(err, OperationType.WRITE, `posts/${docId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you entirely sure you want to permanently delete this post? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const docRef = doc(db, 'posts', postId);
      await deleteDoc(docRef);
      setStatusMessage({ text: "Post deleted permanently.", error: false });
      
      if (editingPostId === postId) {
        handleCreateNew();
      }
      
      await onRefreshPosts();
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Failed to delete from Firestore.", error: true });
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Administrative Area Restricted
        </h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mb-6">
          Access is reserved for verification emails. Please log in using the verified Google Author Profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 font-sans">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: The Posts Editor Form (8 cols on big, 12 on mobile) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm">
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-md">
                <PenTool className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                {editingPostId ? 'Edit Post' : 'Compose New Article'}
              </h2>
            </div>

            {editingPostId && (
              <button
                id="discard-edit-btn"
                onClick={handleCreateNew}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Blank Post</span>
              </button>
            )}
          </div>

          {/* Form Action Feedback */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex gap-2.5 items-center p-4 rounded-2xl mb-6 text-sm border font-medium ${
                  statusMessage.error
                    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30'
                    : 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900/30'
                }`}
              >
                {statusMessage.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0 text-green-500" />}
                <span className="flex-1 text-xs">{statusMessage.text}</span>
                <button 
                  onClick={() => setStatusMessage(null)} 
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSavePost} className="space-y-5">
            {/* Title / Header */}
            <div>
              <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400 mb-1.5">
                Article Title
              </label>
              <input
                id="article-title-field"
                type="text"
                placeholder="Enter a captivating header..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-base sm:text-lg font-semibold rounded-2xl border border-slate-200 p-3.5 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-all placeholder:text-slate-450"
                required
              />
            </div>

            {/* Slug / Routing - Disabled slightly if Editing existing item */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400 mb-1.5">
                  URL Route Path (Slug)
                </label>
                <input
                  id="article-slug-field"
                  type="text"
                  placeholder="title-of-the-post"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  disabled={!!editingPostId}
                  className={`w-full rounded-2xl border p-3 text-xs outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:bg-[#0f172a] dark:text-slate-100 transition-all font-mono placeholder:text-slate-450 ${
                    editingPostId ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-250 text-slate-400 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  required
                />
                <span className="text-[10px] font-mono text-slate-450 mt-1 block">
                  {editingPostId ? 'Slug route is permanent for link stability.' : 'Used for stable URL routing.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400 mb-1.5">
                  Estimated Read Duration
                </label>
                <input
                  id="article-duration-field"
                  type="text"
                  value={getEstimatedReadTime()}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 text-slate-400 dark:border-slate-805 transition-all font-mono select-none outline-none"
                />
                <span className="text-[10px] font-mono text-slate-455 mt-1 block">
                  Auto-calculated based on content word length.
                </span>
              </div>
            </div>

            {/* Cover Image uploader section */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
              <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400">
                Article Cover Banner (Optional)
              </label>

              {coverImage ? (
                <div className="relative group rounded-xl overflow-hidden aspect-video max-h-48 border border-slate-150 dark:border-slate-800 bg-black">
                  <img 
                    src={coverImage} 
                    alt="Article cover" 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="rounded-full bg-red-600 hover:bg-red-700 text-white p-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Cover</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload box */}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-555 rounded-xl p-6 bg-white dark:bg-[#0f172a] cursor-pointer transition-colors text-center group">
                    {coverLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                    )}
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">
                      {coverLoading ? 'Processing screenshot...' : 'Upload Screenshot/File'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                      Drag & Drop or click to browse
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleCoverImageChange} 
                      disabled={coverLoading}
                    />
                  </label>

                  {/* URL path paste */}
                  <div className="flex flex-col justify-center gap-2 p-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Or paste high-res image URL</span>
                    </span>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-all placeholder:text-slate-450"
                    />
                    <span className="text-[9px] text-slate-400 font-mono italic block leading-relaxed">
                      Supports direct JPEG, PNG, WebP relative links or absolute URLs.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Excerpt Summary */}
            <div>
              <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400 mb-1.5">
                Teaser / Excerpt (Short Abstract)
              </label>
              <textarea
                id="article-excerpt-field"
                rows={2}
                placeholder="Write a brief, engaging summary to listing blocks..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                maxLength={450}
                className="w-full text-xs rounded-2xl border border-slate-205 p-3 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-all placeholder:text-slate-455 resize-none"
              />
            </div>

            {/* Tabbed Editor Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-4 font-sans">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'write'
                    ? 'border-indigo-500 text-indigo-505 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                    : 'border-transparent text-slate-450 hover:text-slate-650 dark:hover:text-slate-200'
                }`}
              >
                ✎ Write Post (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'border-indigo-500 text-indigo-505 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                    : 'border-transparent text-slate-450 hover:text-slate-650 dark:hover:text-slate-200'
                }`}
              >
                👁 Live Preview
              </button>
            </div>

            {/* Editor Body */}
            {activeTab === 'write' ? (
              <div className="space-y-2">
                {/* Markdown Quick injector bar */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => injectMarkdown('bold')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-650 dark:text-slate-350"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => injectMarkdown('italic')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs italic text-slate-655 dark:text-slate-350"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => injectMarkdown('link')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-655 dark:text-slate-350"
                    title="Hyperlink ([title](url))"
                  >
                    <Link className="w-3.5 h-3.5" />
                  </button>
                  <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    onClick={() => injectMarkdown('list')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-655 dark:text-slate-350"
                    title="Bullet list (- item)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => injectMarkdown('quote')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-655 dark:text-slate-350"
                    title="Quote block (> text)"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => injectMarkdown('code')}
                    className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-655 dark:text-slate-350"
                    title="Code block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <button
                    type="button"
                    onClick={() => setShowImgInserter(!showImgInserter)}
                    className={`p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer transition-colors ${showImgInserter ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold' : 'text-slate-655 dark:text-slate-350'}`}
                    title="Insert image/screenshot (Local machine or URL)"
                  >
                    <FileImage className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-mono hidden sm:inline text-indigo-600 dark:text-indigo-455">Add Image</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showImgInserter && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border border-slate-200 dark:border-slate-805 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/50 space-y-3 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-505" />
                          <span>Insert Article Media / Screenshot</span>
                        </span>
                        
                        <div className="flex gap-1.5 p-0.5 bg-slate-205 dark:bg-slate-900 rounded-full text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setImageTab('upload')}
                            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${imageTab === 'upload' ? 'bg-white text-slate-900 shadow-sm dark:bg-[#0f172a] dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                          >
                            Local File / Screenshot
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageTab('url')}
                            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${imageTab === 'url' ? 'bg-white text-slate-900 shadow-sm dark:bg-[#0f172a] dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                          >
                            External URL Link
                          </button>
                        </div>
                      </div>

                      {imageError && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium dark:bg-red-950/20 dark:border-red-900/30 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                          <span>{imageError}</span>
                        </div>
                      )}

                      {imageTab === 'upload' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                          <label className="sm:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-4 bg-white dark:bg-[#0f172a] cursor-pointer transition-colors text-center">
                            {inlineLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-indigo-505" />
                            ) : (
                              <Upload className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 mt-1 block">
                              {inlineLoading ? 'Processing file...' : 'Choose Screenshot file'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleInlineImageInsertChange} 
                              disabled={inlineLoading}
                            />
                          </label>

                          <div className="sm:col-span-2 space-y-2">
                            <label className="block text-[10px] font-semibold font-mono tracking-wider uppercase text-slate-400">
                              Image Alt Description / Title
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. App dashboard walkthrough"
                              value={insertAlt}
                              onChange={(e) => setInsertAlt(e.target.value)}
                              className="w-full text-xs rounded-xl border border-slate-200 p-2 outline-none focus:border-indigo-500/50 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-105"
                            />
                            <p className="text-[9px] text-slate-400 font-sans leading-tight">
                              Uploading automatically recompresses the image, making it highly compact for instant reads and safe storage.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[10px] font-semibold font-mono tracking-wider uppercase text-slate-400">
                              Image Alt / Caption Text
                            </label>
                            <input
                              type="text"
                              placeholder="App screen interface"
                              value={insertAlt}
                              onChange={(e) => setInsertAlt(e.target.value)}
                              className="w-full text-xs rounded-xl border border-slate-200 p-2 outline-none focus:border-indigo-500/50 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-105"
                            />
                          </div>
                          
                          <div className="sm:col-span-6 space-y-1">
                            <label className="block text-[10px] font-semibold font-mono tracking-wider uppercase text-slate-400">
                              Image Address / URL Link
                            </label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/..."
                              value={insertUrl}
                              onChange={(e) => setInsertUrl(e.target.value)}
                              className="w-full text-xs rounded-xl border border-slate-200 p-2 outline-none focus:border-indigo-500/50 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-105"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!insertUrl.trim()) {
                                  setImageError("Please enter a valid image URL link first.");
                                  return;
                                }
                                insertIntoMarkdown(insertUrl.trim(), insertAlt.trim() || 'image');
                              }}
                              className="w-full text-center text-xs font-semibold rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white p-2.5 transition-colors cursor-pointer"
                            >
                              Insert Link
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea
                  id="content-editor-textarea"
                  rows={14}
                  placeholder="Begin drafting in elegant Markdown syntax... Supports markdown structures like headers, listings, images, quotes and formatted script codes!"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm font-mono rounded-2xl border border-slate-205 p-4 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-all placeholder:text-slate-455"
                  required
                />
              </div>
            ) : (
              <div 
                id="markdown-preview"
                className="w-full max-h-[400px] overflow-y-auto rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-6 min-h-[300px]"
              >
                {content.trim() ? (
                  <div className="markdown-body prose dark:prose-invert text-sm max-w-none">
                    <Markdown>{content}</Markdown>
                  </div>
                ) : (
                  <div className="text-center py-20 text-neutral-400 dark:text-neutral-500 font-sans text-xs">
                    <Eye className="w-6 h-6 mx-auto mb-2 text-neutral-300" />
                    Nothing to preview. Go ahead and write some markdown!
                  </div>
                )}
              </div>
            )}

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold font-mono tracking-wider uppercase text-slate-400 mb-1.5">
                Categories / Tags
              </label>
              <input
                id="article-tags-field"
                type="text"
                placeholder="Type tag name and hit Enter or Comma..."
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100 transition-all placeholder:text-slate-455 font-sans"
              />
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {tags.map((tag, idx) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-900/65 px-2.5 py-0.5 text-xs font-semibold font-mono animate-fade-in"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="p-0.2 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200"
                        title="Remove tag"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Draft vs Published Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#0f172a]/60 border border-slate-150 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  Post Visibility State
                </span>
                <span className="text-[10px] text-slate-450 dark:text-slate-550">
                  {published ? 'Published (Immediately visible to everyone)' : 'Draft (Is privately saved in your editor)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className={`flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  published ? 'bg-indigo-550' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    published ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end pt-3 gap-3">
              <button
                id="editor-save-btn"
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-full bg-indigo-500 hover:bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editingPostId ? 'Update Post' : 'Publish Article'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN: Posts History Directory list (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-sans text-xs font-bold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-slate-400" />
              <span>Posts Directory ({posts.length})</span>
            </h3>

            {posts.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400 font-sans">
                No active publications found. Create your very first post!
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      editingPostId === post.id
                        ? 'bg-indigo-50/50 border-indigo-250 dark:bg-indigo-950/20 dark:border-indigo-900/50'
                        : 'bg-slate-50/40 hover:bg-slate-50 border-slate-150 hover:border-slate-200 dark:bg-slate-950/25 dark:border-slate-900 dark:hover:border-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 
                        onClick={() => onSelectPostToRead(post)}
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 truncate cursor-pointer leading-tight mb-1"
                        title="Click to view read preview"
                      >
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
                        <span>{editingPostId === post.id ? 'active editing' : `/posts/${post.slug}`}</span>
                        <span>•</span>
                        {post.published ? (
                          <span className="text-indigo-600 dark:text-indigo-455 uppercase font-bold text-[8px] tracking-wider">PUBLISHED</span>
                        ) : (
                          <span className="text-slate-450 uppercase font-bold text-[8px] tracking-wider">DRAFT</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                        title="Edit post"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={loading}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-505 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Delete post permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tips about single user blogging mode */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-[#0f172a] p-5 text-slate-505 dark:text-slate-405 shadow-sm">
            <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Aesthetic Author Tips</span>
            </h4>
            <ul className="text-[11px] font-sans space-y-2 list-none pl-1 text-slate-505 dark:text-slate-400 leading-relaxed">
              <li className="flex gap-1.5 items-start">
                <span className="text-indigo-400 select-none">•</span>
                <span>Use <strong>Markdown</strong> headers (`## Heading 2`) to form majestic content columns easily.</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-indigo-400 select-none">•</span>
                <span>Toggle public state to <strong>Draft</strong> so you can revise posts iteratively before going public.</span>
              </li>
              <li className="flex gap-1.5 items-start">
                <span className="text-indigo-400 select-none">•</span>
                <span>Attach <strong>Tags</strong> with comma separators to give readers instantaneous, streamlined filtering.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
