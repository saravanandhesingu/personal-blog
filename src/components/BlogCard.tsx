/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Calendar, Clock, Eye, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Post } from '../types';

interface BlogCardProps {
  post: Post;
  onClick: (post: Post) => void;
  isAuthor: boolean;
}

export default function BlogCard({ post, onClick, isAuthor }: BlogCardProps) {
  // Format the Firestore Timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.article
      id={`blog-card-${post.id}`}
      onClick={() => onClick(post)}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 sm:p-8 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/35 dark:hover:bg-slate-900 dark:hover:border-slate-700/80 hover:shadow-slate-100/50 dark:hover:shadow-none hover:-translate-y-1 transition-all cursor-pointer"
    >
      <div>
        {/* Cover Image Thumbnail if active */}
        {post.coverImage && (
          <div className="w-full h-40 sm:h-44 overflow-hidden rounded-xl mb-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Post Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 dark:text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.createdAt)}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-800" />
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readTime || '3 min read'}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-800" />
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {post.views || 0} views
          </span>
          
          {/* Draft indicator */}
          {!post.published && isAuthor && (
            <span className="ml-auto inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/65 font-mono animate-pulse">
              DRAFT
            </span>
          )}
        </div>

        {/* Post Title */}
        <div className="group/title flex items-start justify-between gap-2 mb-3">
          <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-500 dark:text-slate-100 dark:group-hover:text-indigo-400 leading-tight transition-colors">
            {post.title}
          </h3>
          <ArrowUpRight className="w-5 h-5 text-slate-350 group-hover:text-indigo-500 dark:text-slate-700 dark:group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
        </div>

        {/* Post Teaser Excerpt */}
        <p className="font-sans text-slate-550 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
          {post.excerpt}
        </p>
      </div>

      {/* Footer Tags Row */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-400 capitalize transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
