/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, getDocs, onSnapshot, writeBatch, doc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BookOpen, Search, ArrowRight, Sparkles, Feather, ShieldCheck, Heart, Github, Star, PenTool, LayoutGrid, ShieldAlert, X } from 'lucide-react';

import { Post, UserContextType, OperationType } from './types';
import { db, auth, loginWithGoogle, logoutUser, testConnection, handleFirestoreError } from './firebase';
import Header from './components/Header';
import BlogCard from './components/BlogCard';
import BlogView from './components/BlogView';
import AdminPanel from './components/AdminPanel';

// Author core email identifier
const AUTHOR_EMAIL = 'saravanandhesingu1992@gmail.com';

export default function App() {
  // Navigation / Tab Views
  const [activeView, setActiveView] = useState<'blog' | 'admin' | 'reader'>('blog');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<{ code?: string; message?: string } | null>(null);

  // Articles collection states
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 1. Initial Connection & Auth Listener
  useEffect(() => {
    // Audit Firestore connection on startup
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email === AUTHOR_EMAIL) {
        setIsAuthor(true);
      } else {
        setIsAuthor(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch/Stream Posts
  useEffect(() => {
    setPostsLoading(true);

    // Formulate database path query based on identity permissions
    const postsRef = collection(db, 'posts');
    
    // Non-authors can only list published posts. Author sees everything.
    const baseQuery = isAuthor 
      ? query(postsRef, orderBy('createdAt', 'desc'))
      : query(postsRef, where('published', '==', true), orderBy('createdAt', 'desc'));

    // Attach real-time snapshot listeners
    const unsubscribeSnapshot = onSnapshot(
      baseQuery,
      (snapshot) => {
        const loadedPosts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedPosts.push({
            id: docSnap.id,
            ...data,
          } as Post);
        });

        setPosts(loadedPosts);
        setPostsLoading(false);

        // Seed with outstanding starter posts if database is completely blank
        if (loadedPosts.length === 0 && isAuthor) {
          seedStarterPosts();
        }
      },
      (error) => {
        console.error("Failed to query posts collection snapshot:", error);
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    );

    return () => unsubscribeSnapshot();
  }, [isAuthor]);

  // Seeding helper to create flawless starter content
  const seedStarterPosts = async () => {
    try {
      const batch = writeBatch(db);
      
      const seedData = [
        {
          id: 'minimalist-aesthetics',
          title: 'Crafting the Perfect Modern Reader Layout',
          slug: 'minimalist-aesthetics',
          excerpt: 'How generous negative space, meticulous typography choices, and smart dark modes work together to restore joy to digital longform writing.',
          content: `## Rediscovering the Sanctuary of Longform Writing

In an internet obsessed with distraction, infinite scrolls, and screen-cluttered telemetry trackers, the quiet art of deep reading has been pushed to the margins. Designing a personal blog shouldn't be about building a flashy amusement park; it should be about crafting a sanctuary.

To build the "best" blog for readers, we must focus on three core disciplines:

1. **The Silence of Negative Space**
   Margins are not empty air; they are breathing gaps. By prioritizing wide white spaces and simple 3-column desktop framing, we allow the narrative to sit majestically without fighting visual noise.
   
2. **The Intention of Classy Font Pairings**
   We pair the humanistic sans-serif **Inter** (for body columns) with the historical editorial serif **Playfair Display** (for headers). Playfair Display slows the gaze down, welcoming readers to meditate on the title, while Inter provides smooth legibility for extensive reading.

3. **Fluid Interactive Contrast**
   Our adaptive dark mode toggle acts as a physical dimmer switch. It shifts the entire workspace from crisp paper white to an oil-slack obsidian black, using subtle micro-transitions to soothe the optic nerve.

### Building for Both Canvas Sizes
An awesome interface must remain fully responsive:
- **On Smartphones**: Touch offsets are scaled to a minimum layout boundary of 44 pixels. Slugs and technical indicators shrink to avoid wrapping, while the text size adjusts smoothly from the accessibility menu.
- **On Desktops**: Expanded typographic grids stretch comfortably, allocating spacious margins and static summaries for elegant, high-impact reading.
`,
          published: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tags: ['design', 'typography', 'minimalism'],
          readTime: '3 min read',
          authorEmail: 'saravanandhesingu1992@gmail.com',
          views: 42
        },
        {
          id: 'serverless-fortress-firestore',
          title: 'The Blueprint of a serverless fortress',
          slug: 'serverless-fortress-firestore',
          excerpt: 'Deep-dive into Attribute-Based Access Control, Zero-Trust firestore rules, and securing full-stack application APIs with absolute integrity.',
          content: `## Designing Cloud Applications with Zero Leakage

When transitioning to modern cloud-hosted platforms, securing private data fields and isolating administrative operations is the highest engineering mandate. In this post, we look at building absolute data fortresses using **Firestore Attribute-Based Access Control (ABAC)**.

### The Problem: Client-Initiated Updates
Traditional client SDKs are exceptionally powerful, but they expose full query paths to malicious actors if left unshielded. Setting rules like \`allow read, write: if isSignedIn()\` is a critical system vulnerability. 

Instead, security must be built around strict transactional validators on the cloud.

### The 3 Pillars of Hardened Verification
Let's analyze some of the structural restrictions we deployed to protect this space:

*   **Verified Credentials Check**: Rather than validating users based on simple login states, we verify their verified email domain synchronously:
    \`\`\`javascript
    function isAuthor() {
      return request.auth != null && 
             request.auth.token.email == 'saravanandhesingu1992@gmail.com' && 
             request.auth.token.email_verified == true;
    }
    \`\`\`
*   **Immutability Invariants**: Fields like \`createdAt\` or \`authorEmail\` are marked as immutable immediately upon creation. Any update attempting to alter them is instantly blocked.
*   **Atypical AffectedKeys Allocation**: To let users update the view metrics of an article without granting them full write access, we partition update validations:
    \`\`\`javascript
    allow update: if isAuthor() || 
                  (!isAuthor() && incoming().diff(existing()).affectedKeys().hasOnly(['views']));
    \`\`\`

By ensuring that the database validates payload sizes, structures, and path variables securely and atomically in the cloud, we protect our users and infrastructure seamlessly.
`,
          published: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tags: ['security', 'database', 'cloud'],
          readTime: '4 min read',
          authorEmail: 'saravanandhesingu1992@gmail.com',
          views: 112
        },
        {
          id: 'restoring-human-craftsmanship',
          title: 'Decelerating Tech: Restoring Craftmanship to Code',
          slug: 'restoring-human-craftsmanship',
          excerpt: 'Why standard over-engineered slimes are hurting software experiences, and the case for humble, high-fidelity development.',
          content: `## A Manifesto for Elegant, Purposeful Software

We live in an age of metric tracking overloads. Open any dashboard, widget, or digital app, and you are immediately bombarded by unrequested metrics: *Port 3000 connects, Core Memory status: 94% active, live trace pings, telemetry coordinates.*

Why do we treat simple software tools like they are nuclear reactor control rooms?

This is **Tech-Larping**—the habit of decorating interfaces with mock systems engineering noise to sound "extra smart." It adds zero value to end users and looks highly unprofessional.

### The Craft of Deceleration
Humble software uses human, objective labels:
- We call a clock "Current Time", not a *Chronos Meter*.
- We design layout interfaces using quiet grays, deep slates, and rich natural hues rather than aggressive neon terminal gradients.
- We implement exact, requested scopes meticulously rather than trying to "enrich" simple tools with unrequested AI chat overlays, focus-noise generators, or telemetry panels.

### Executing Pristine Form
True craftsmanship isn't about adding volume; it is about absolute precision in what was requested.
It is the alignment of margins, the fluidity of entering transitions, and the tactile snap of dark mode toggles. As developers, let us vow to replace noise with quiet, high-integrity software.
`,
          published: false, // Seeded as draft to let the author experience draft transitions!
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tags: ['philosophy', 'minimalism', 'craft'],
          readTime: '3 min read',
          authorEmail: 'saravanandhesingu1992@gmail.com',
          views: 11
        }
      ];

      for (const item of seedData) {
        batch.set(doc(db, 'posts', item.id), item);
      }
      await batch.commit();
      console.log("Starter posts seeded successfully into your Firestore database!");
    } catch (err) {
      console.error("Failed to seed starter posts:", err);
    }
  };

  // 3. Gather unique tags for filtering across published posts
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [posts]);

  // 3a. Deep linking & Browser popstate back button listener
  useEffect(() => {
    if (postsLoading || posts.length === 0) return;

    const parseAndRouteDeepLink = () => {
      const params = new URLSearchParams(window.location.search);
      const postIdParam = params.get('post');
      if (postIdParam) {
        const linkedPost = posts.find(p => p.id === postIdParam);
        if (linkedPost) {
          setSelectedPost(linkedPost);
          setActiveView('reader');
          return;
        }
      }
      setSelectedPost(null);
      setActiveView('blog');
    };

    // Route on initial loads once posts have streamed
    parseAndRouteDeepLink();

    window.addEventListener('popstate', parseAndRouteDeepLink);
    return () => window.removeEventListener('popstate', parseAndRouteDeepLink);
  }, [posts, postsLoading]);

  // 4. Case-insensitive Search & Tag filtering
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Filter by tag if selected
      if (selectedTag && (!post.tags || !post.tags.includes(selectedTag))) {
        return false;
      }

      // Filter by keyword query
      if (searchQuery.trim()) {
        const queryNorm = searchQuery.toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(queryNorm);
        const matchesExcerpt = post.excerpt.toLowerCase().includes(queryNorm);
        const matchesContent = post.content.toLowerCase().includes(queryNorm);
        const matchesTags = post.tags && post.tags.some(tag => tag.toLowerCase().includes(queryNorm));
        
        return matchesTitle || matchesExcerpt || matchesContent || matchesTags;
      }

      return true;
    });
  }, [posts, searchQuery, selectedTag]);

  // Helper auth callback block
  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Verification Login failed:", err);
      setLoginError({
        code: err?.code || 'unknown-error',
        message: err?.message || 'Verification Login failed. Check your browser cookies or open in a new tab.'
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setActiveView('blog');
    } catch (err) {
      console.error("Failed logout", err);
    }
  };

  const contextWrapper: UserContextType = {
    user,
    loading: authLoading,
    isAuthor,
    login: handleLogin,
    logout: handleLogout
  };

  const handleSelectPostToRead = (post: Post) => {
    setSelectedPost(post);
    setActiveView('reader');
    window.history.pushState({ postId: post.id }, '', `?post=${post.id}`);
  };

  const handleGoBackToBlog = () => {
    setSelectedPost(null);
    setActiveView('blog');
    window.history.pushState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 transition-colors flex flex-col justify-between">
      
      {/* Upper Content wrapper */}
      <div>
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          allTags={allTags}
          userContext={contextWrapper}
          activeView={activeView}
          setActiveView={setActiveView}
          onClearReaderPost={handleGoBackToBlog}
        />

        {/* Dynamic Canvas Routing */}
        <main className="py-6 sm:py-10">
          <AnimatePresence mode="wait">
            
            {/* VIEW A: LISTING BOARD */}
            {activeView === 'blog' && (
              <motion.div
                key="blog-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-5xl px-4 sm:px-6"
              >
                {/* Author Welcome Cover (Only displayed if no filter is selected) */}
                {!selectedTag && !searchQuery && (
                  <div className="mb-12 rounded-3xl bg-neutral-900 p-8 sm:p-12 text-white dark:bg-neutral-900/40 dark:border dark:border-neutral-800 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-gradient-to-tr from-amber-500 to-rose-500 pointer-events-none rounded-r-3xl" />
                    <div className="max-w-2xl relative z-10">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-xs font-mono font-bold text-amber-400 capitalize mb-6 animate-pulse">
                        <Feather className="w-3.5 h-3.5" />
                        <span>Curated Journaling</span>
                      </div>
                      <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                        Reflections on Art, Technology, & Software Integrity
                      </h2>
                      <p className="font-sans text-neutral-300 text-sm leading-relaxed max-w-xl">
                        Welcome to my personal, high-fidelity blog. Here, I write about building secure architectures, robust data modeling, minimalism in web aesthetics, and decelerated craftsmanship.
                      </p>
                    </div>
                  </div>
                )}

                {/* Listing grid */}
                {postsLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-amber-500 dark:border-neutral-800 dark:border-t-amber-400" />
                    <p className="font-mono text-xs text-neutral-400">Synchronizing timeline...</p>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-20 rounded-3xl bg-white border border-neutral-100 dark:bg-neutral-900/30 dark:border-neutral-850 p-8">
                    <Search className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-sm font-bold font-serif text-neutral-800 dark:text-neutral-300">
                      No matching records found
                    </h3>
                    <p className="text-xs font-sans text-neutral-400 mt-1 max-w-sm mx-auto">
                      We couldn't locate any blog posts matching your search query. Try clearing your filters or testing other terms.
                    </p>
                    {(searchQuery || selectedTag) && (
                      <button
                        onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                        className="mt-6 px-4 py-2 border border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 transition-colors"
                      >
                        Reset Search View
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                    {filteredPosts.map((post) => (
                      <BlogCard
                        key={post.id}
                        post={post}
                        onClick={handleSelectPostToRead}
                        isAuthor={isAuthor}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW B: DETAILED READER PAGE */}
            {activeView === 'reader' && selectedPost && (
              <motion.div
                key="blog-reader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BlogView
                  post={selectedPost}
                  onBack={handleGoBackToBlog}
                  isAuthor={isAuthor}
                />
              </motion.div>
            )}

            {/* VIEW C: ADMIN DASHBOARD (COMPOSE) */}
            {activeView === 'admin' && (
              <motion.div
                key="admin-dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <AdminPanel
                  posts={posts}
                  isAuthor={isAuthor}
                  onRefreshPosts={async () => {}} // snapshot triggers automatically!
                  onSelectPostToRead={handleSelectPostToRead}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* FOOTER */}
      <footer id="app-footer" className="mt-20 py-8 border-t border-neutral-100 bg-white dark:border-neutral-900 dark:bg-neutral-950 transition-colors">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-400">
          
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verified Author Core Active — Zero-Trust ABAC Guarded</span>
          </div>

          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} Saravanan Dhesingu. Created with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
            <span>for exquisite longform reading.</span>
          </div>

        </div>
      </footer>

      {/* Login Error Diagnostic Modal */}
      <AnimatePresence>
        {loginError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
                    Authentication Verification Failure
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">
                    We detected a block or configuration mismatch in your browser context.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="rounded-full p-1 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Technical Specs */}
              <div className="mb-5 rounded-2xl bg-red-50/50 p-4 font-mono text-[11px] text-red-600 border border-red-100/50 dark:bg-red-950/10 dark:border-red-950/30 dark:text-red-350 text-left">
                <div className="font-semibold text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400 mb-1">
                  Diagnostics Info ({loginError.code})
                </div>
                <div className="line-clamp-3 leading-relaxed break-words">
                  {loginError.message}
                </div>
              </div>

              {/* Actionable Remedies */}
              <div className="space-y-4 text-left">
                <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-400">
                  Troubleshooting Checklist
                </h4>

                <div className="space-y-3 text-xs leading-relaxed font-sans text-slate-600 dark:text-slate-350">
                  {/* Step 1: Open in New Tab */}
                  <div className="flex gap-3 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Browser Third-Party Cookie Blocking (Most Common)
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 mt-1 block font-sans">
                        The live preview frame blocks cookies for popup authorization. Open the web application directly in a <strong>New Tab</strong> so the Google Sign-In popup can communicate auth sessions properly.
                      </span>
                      <a
                        href={window.location.origin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-1.5 font-sans font-semibold text-white transition-all shadow-md shadow-indigo-500/15"
                      >
                        <span>Open App in New Tab</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Authorized Domains */}
                  <div className="flex gap-3 items-start border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Authorized Domain Lock
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 block mt-1 font-sans">
                        Ensure you authorized your dynamic app preview and hosting domains in your <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong>. You must add both:
                      </span>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        <code className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 text-[10px] font-mono font-semibold text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 select-all leading-tight break-all">
                          saravanandhesingu-chronicle.netlify.app
                        </code>
                        <code className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 text-[10px] font-mono font-semibold text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 select-all leading-tight break-all">
                          {window.location.hostname}
                        </code>
                        <span className="text-[10px] text-slate-400 italic font-mono block">
                          (These are required for Google Auth to permit popup communications)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Enable Google Provider */}
                  <div className="flex gap-3 items-start border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Activate Sign-In Provider
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 block mt-0.5 font-sans">
                        Confirm that the <strong>Google provider</strong> is toggled to **Enabled** in the Sign-In Methods dashboard of your Firebase project.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setLoginError(null)}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Close Diagnostics
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
