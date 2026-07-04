
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { useSupabase } from "@/lib/ecosystemFlags";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const isSupabaseAuth = useSupabase();

  useEffect(() => {
    if (!isSupabaseAuth) return;
    void supabase.auth.getSession();
  }, [isSupabaseAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'crm_rep') {
        navigate('/team/crm', { replace: true });
      } else if (user.role === 'sub_account') {
        navigate('/team/dashboard', { replace: true });
      } else {
        navigate('/search', { replace: true });
      }
      return;
    }

    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, user, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-market-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
