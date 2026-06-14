/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, LogIn, LogOut, Terminal, BookOpen, PenTool, X, ShieldAlert } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { UserContextType } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  allTags: string[];
  userContext: UserContextType;
  activeView: 'blog' | 'admin' | 'reader';
  setActiveView: (view: 'blog' | 'admin' | 'reader') => void;
  onClearReaderPost?: () => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  allTags,
  userContext,
  activeView,
  setActiveView,
  onClearReaderPost,
}: HeaderProps) {
  const { user, isAuthor, login, logout, loading } = userContext;

  const handleLogoClick = () => {
    if (onClearReaderPost) {
      onClearReaderPost();
    }
    setActiveView('blog');
  };

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-slate-150 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0f172a]/85 transition-colors">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <button
              id="logo-button"
              onClick={handleLogoClick}
              className="group flex items-center gap-2.5 focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0 font-sans shadow-md group-hover:scale-105 transition-transform">SD</div>
              <div className="flex flex-col items-start text-left leading-none">
                <span className="font-sans text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  Saravanan Dhesingu
                </span>
                <span className="font-mono text-[9px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                  Chronicle
                </span>
              </div>
            </button>
          </div>

          {/* Minimalist Search Bar */}
          {activeView === 'blog' && (
            <div className="relative hidden md:block w-72 max-w-sm">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="header-search-input"
                type="text"
                placeholder="Search articles, tags, titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pr-4 pl-9 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500/50 focus:bg-white focus:ring-1 focus:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-105 dark:focus:border-indigo-500/50 dark:focus:bg-[#0f172a] transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Controls & User Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Author Entry Portal (Admin Option Only if Verified Author) */}
            {isAuthor && (
              <button
                id="view-toggle-btn"
                onClick={() => setActiveView(activeView === 'admin' ? 'blog' : 'admin')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                  activeView === 'admin'
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-900/50 shadow-inner'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800'
                }`}
              >
                {activeView === 'admin' ? (
                  <>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Reader Mode</span>
                  </>
                ) : (
                  <>
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Manage Posts</span>
                  </>
                )}
              </button>
            )}

            {/* Auth Button */}
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-451" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <button
                  id="user-logout-btn"
                  onClick={logout}
                  className="group flex h-9 items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  title={`Signed in as ${user.email}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Avatar"}
                      className="h-5 w-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white uppercase">
                      {user.email?.charAt(0)}
                    </div>
                  )}
                  <span className="hidden leading-none text-xs text-slate-600 dark:text-slate-400 sm:inline-block max-w-[100px] truncate">
                    {isAuthor ? "Author" : user.displayName || "Reader"}
                  </span>
                  <LogOut className="h-3 w-3 text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ) : (
              <button
                id="login-trigger-btn"
                onClick={login}
                className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-550 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Author Access</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Input (Only on Home listing) */}
        {activeView === 'blog' && (
          <div className="flex md:hidden relative pb-4 w-full">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="mobile-search-input"
              type="text"
              placeholder="Search articles, tags, titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500/50 focus:bg-white focus:ring-1 focus:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:bg-[#0f172a] transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-2 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Tags Selector (Only on Home Listing tab) */}
        {activeView === 'blog' && allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
            <div className="text-[11px] font-mono whitespace-nowrap text-slate-400 uppercase font-medium mr-1.5">
              Categories:
            </div>
            <button
              id="tag-all-btn"
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium whitespace-nowrap transition-all border cursor-pointer ${
                selectedTag === null
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                  : 'bg-slate-100/50 border-slate-200 text-slate-600 hover:border-slate-400 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
              }`}
            >
              All Posts
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                id={`tag-btn-${tag}`}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/15'
                    : 'bg-slate-100/50 border-slate-200 text-slate-600 hover:border-slate-400 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* If author attempts email verification warning */}
        {user && !isAuthor && !loading && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 px-3 py-1.5 rounded-lg mb-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Viewer account logged. Only <strong>saravanandhesingu1992@gmail.com</strong> is allowed admin creation access.</span>
          </div>
        )}
      </div>
    </header>
  );
}
