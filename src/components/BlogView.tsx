/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Clock, Eye, Type, Sparkles, AlertCircle, Share2, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Post, OperationType } from '../types';
import { db, handleFirestoreError } from '../firebase';

interface BlogViewProps {
  post: Post;
  onBack: () => void;
  isAuthor: boolean;
}

export default function BlogView({ post, onBack, isAuthor }: BlogViewProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localViews, setLocalViews] = useState(post.views);

  // 1. Setup Scroll Progress Indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const progress = (window.pageYOffset / totalScroll) * 100;
        setScrollProgress(progress);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Increment view counter once per initial page view
  useEffect(() => {
    const incrementViews = async () => {
      const viewedSession = sessionStorage.getItem(`viewed_${post.id}`);
      if (!viewedSession) {
        try {
          const postRef = doc(db, 'posts', post.id);
          await updateDoc(postRef, {
            views: increment(1)
          });
          sessionStorage.setItem(`viewed_${post.id}`, 'true');
          setLocalViews(prev => prev + 1);
        } catch (error) {
          // Gracefully handle or log error
          console.warn("Failed to increment page view index", error);
        }
      }
    };

    incrementViews();
    // Scroll to top on load
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [post.id]);

  // Format creation date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Content font size classes
  const fontClass = {
    sm: 'text-sm sm:text-base leading-relaxed',
    md: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed'
  }[fontSize];

  return (
    <div id="blog-article-view" className="relative pb-24 font-sans">
      {/* Scroll Progress Bar */}
      <div 
        id="reading-progress-bar"
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        
        {/* Navigation / Toolbar Actions */}
        <div className="flex items-center justify-between py-6 mb-8 border-b border-slate-100 dark:border-slate-800/80">
          <button
            id="back-btn"
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </button>

          {/* Reading Preferences toolbar */}
          <div className="flex items-center gap-3">
            {/* Share action */}
            <button
              id="share-article-btn"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500 animate-scale" />
                  <span className="text-green-600 dark:text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Font Control panel */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-800">
              <Type className="w-3.5 h-3.5 text-slate-400 mx-2" />
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-colors cursor-pointer ${
                    fontSize === sz
                      ? 'bg-indigo-500 text-white dark:bg-indigo-500 dark:text-white'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-205'
                  }`}
                  title={`Adjust readability size: ${sz}`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 font-sans"
        >
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono bg-indigo-50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-950"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Main Title */}
          <h2 className="font-sans text-3.5xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 lg:leading-[1.15] mb-6">
            {post.title}
          </h2>

          {/* Author info & Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-150/50 dark:bg-slate-900/30 dark:border-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-sans font-bold text-lg select-none shadow-md">
                SD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Saravanan Dhesingu
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 uppercase tracking-widest border border-indigo-200/50 dark:border-indigo-900/60 leading-none">
                    AUTHOR
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  @saravanandhesingu1992
                </span>
              </div>
            </div>

            {/* Secondary article meta stats */}
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.createdAt)}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-1" title="Views">
                <Eye className="w-3.5 h-3.5" />
                {localViews}
              </span>
            </div>
          </div>
          
          {/* If draft indicator */}
          {!post.published && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-900/30 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs font-mono animate-pulse">
              <AlertCircle className="w-4 h-4 text-indigo-500" />
              <span>This post is set to <strong>Draft State</strong> right now. Only you can view this page in your dashboard.</span>
            </div>
          )}
        </motion.header>

        {/* Cover Image Banner */}
        {post.coverImage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="w-full aspect-video md:max-h-96 overflow-hidden rounded-3xl mb-8 border border-slate-150 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 shadow-sm"
          >
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}

        {/* Article Body Content */}
        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className={`font-sans tracking-tight text-slate-700 dark:text-slate-300 ${fontClass}`}
        >
          {/* Strict guideline adherence wrapper */}
          <div className="markdown-body prose max-w-none dark:prose-invert prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-a:text-indigo-500 hover:prose-a:text-indigo-600 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-500 dark:prose-blockquote:text-slate-400 prose-code:font-mono prose-code:text-xs prose-code:bg-slate-100 dark:prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-img:rounded-2xl">
            <Markdown>{post.content}</Markdown>
          </div>
        </motion.article>

        {/* Post Footer Callout */}
        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center font-sans">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to listing</span>
          </button>
          
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Thank you for reading my thoughts.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
