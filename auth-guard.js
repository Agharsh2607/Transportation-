/**
 * Auth Guard
 * 
 * Protects pages from unauthenticated access.
 * Include this script on any page that requires login.
 * 
 * Usage: Add these script tags to any protected page's <head>:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="supabase-config.js"></script>
 *   <script src="auth-guard.js"></script>
 * 
 * Optional: Add data-allowed-roles="admin,driver" to the <body> tag
 * to restrict access to specific roles.
 */

(async function authGuard() {
  // Show a loading state while checking auth
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'opacity 0.3s ease';
  
  try {
    const { session, user } = await getAuthSession();
    
    if (!session || !user) {
      // Not authenticated — redirect to login
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      window.location.replace(`auth.html?redirect=${encodeURIComponent(currentPage)}`);
      return;
    }
    
    // Get user profile for role check
    const profile = await getUserProfile(user.id);
    const userRole = profile?.role || 'student';
    
    // Check role-based access if specified
    const allowedRoles = document.body?.dataset?.allowedRoles;
    if (allowedRoles) {
      const roles = allowedRoles.split(',').map(r => r.trim());
      if (!hasAccess(userRole, roles)) {
        // User doesn't have the right role — redirect to dashboard with error
        window.location.replace('dashboard.html?error=unauthorized');
        return;
      }
    }
    
    // Auth passed — show the page
    document.documentElement.style.opacity = '1';
    
    // Inject user info into the navbar if a user-info element exists
    updateNavbarWithUser(user, profile);
    
    // Listen for auth state changes (e.g., token refresh, sign out)
    const sb = getSupabase();
    if (sb) {
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          window.location.replace('auth.html');
        }
      });
    }
    
  } catch (err) {
    console.error('Auth guard error:', err);
    // On error, redirect to login as a safety measure
    window.location.replace('auth.html');
  }
})();

/**
 * Update the navbar to show user info and logout button.
 * Looks for elements with specific IDs to inject content.
 */
function updateNavbarWithUser(user, profile) {
  const userName = profile?.name || user.email?.split('@')[0] || 'User';
  const userRole = profile?.role || 'student';
  const userInitial = userName.charAt(0).toUpperCase();
  
  // Find the navbar's right-side action area (the Dashboard button)
  const navActions = document.querySelector('header nav');
  if (!navActions) return;
  
  // Find any existing "Dashboard" button/link at the end of the nav
  const dashBtn = navActions.querySelector('a[href="dashboard.html"]:last-child, a[href="auth.html"]:last-child');
  
  if (dashBtn) {
    // Replace with user avatar + dropdown
    const userWidget = document.createElement('div');
    userWidget.className = 'relative';
    userWidget.id = 'user-widget';
    userWidget.innerHTML = `
      <button onclick="document.getElementById('user-dropdown').classList.toggle('hidden')" 
              class="flex items-center gap-3 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full transition-all">
        <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
          ${userInitial}
        </div>
        <div class="hidden sm:block text-left">
          <p class="text-sm font-semibold text-slate-800 leading-tight">${userName}</p>
          <p class="text-[10px] font-medium text-slate-500 uppercase tracking-wider">${userRole}</p>
        </div>
        <span class="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
      </button>
      <div id="user-dropdown" class="hidden absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
        <div class="px-4 py-3 border-b border-slate-100">
          <p class="text-sm font-semibold text-slate-800">${userName}</p>
          <p class="text-xs text-slate-500">${user.email}</p>
        </div>
        <div class="py-1">
          <a href="dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <span class="material-symbols-outlined text-lg">dashboard</span>
            Dashboard
          </a>
          <a href="live-map.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <span class="material-symbols-outlined text-lg">map</span>
            Live Map
          </a>
          ${userRole === 'admin' ? `
          <a href="admin.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <span class="material-symbols-outlined text-lg">admin_panel_settings</span>
            Admin Panel
          </a>` : ''}
        </div>
        <div class="border-t border-slate-100 py-1">
          <button onclick="signOut()" class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
            <span class="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    `;
    dashBtn.replaceWith(userWidget);
  }
  
  // Show admin nav link if user is admin
  const adminLink = document.getElementById('admin-nav-link');
  if (adminLink && userRole === 'admin') {
    adminLink.style.display = '';
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const widget = document.getElementById('user-widget');
    const dropdown = document.getElementById('user-dropdown');
    if (widget && dropdown && !widget.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
