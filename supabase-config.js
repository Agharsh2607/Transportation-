/**
 * Supabase Configuration
 * 
 * Shared Supabase client initialization for all frontend pages.
 * Uses the Supabase CDN client loaded via script tag.
 * 
 * IMPORTANT: Replace the URL and ANON_KEY with your actual Supabase project values.
 * These are safe to expose in frontend code — they only allow operations
 * permitted by your Row Level Security (RLS) policies.
 */

const SUPABASE_URL = 'https://inejjsewijoesjonovss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWpqc2V3aWpvZXNqb25vdnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzE1ODAsImV4cCI6MjA5MjEwNzU4MH0.cnOJcnYObPFnlaOEzRUpy1vwS8G_lIpXxPpj5doUfBw';

// Initialize Supabase client (requires supabase-js CDN to be loaded first)
let _supabaseClient = null;

function getSupabase() {
  if (!_supabaseClient) {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('Supabase JS library not loaded. Add the CDN script tag before this file.');
      return null;
    }
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabaseClient;
}

/**
 * Get the current authenticated user session.
 * @returns {Promise<{session: object|null, user: object|null}>}
 */
async function getAuthSession() {
  const sb = getSupabase();
  if (!sb) return { session: null, user: null };
  
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) throw error;
    return { session, user: session?.user || null };
  } catch (err) {
    console.error('getAuthSession error:', err.message);
    return { session: null, user: null };
  }
}

/**
 * Get the user's profile from the profiles table.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getUserProfile(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return null;
  
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    return null;
  }
}

/**
 * Sign out the current user.
 */
async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  
  try {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  } catch (err) {
    console.error('signOut error:', err.message);
  }
}

/**
 * Role-based access check.
 * @param {string} role - User's role
 * @param {string[]} allowedRoles - Roles allowed to access
 * @returns {boolean}
 */
function hasAccess(role, allowedRoles) {
  return allowedRoles.includes(role);
}
