import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import type {
  ReactNode
} from 'react';

import type {
  User,
  Session
} from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: string
  ) => Promise<{ error: any }>;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: any }>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {

  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const fetchProfile = async (
    userId: string
  ) => {

    const { data } =
      await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (data) {
      setProfile(data);
    }

  };

  useEffect(() => {

    supabase.auth
      .getSession()
      .then(async ({
        data: { session }
      }) => {

        setSession(session);

        setUser(
          session?.user ?? null
        );

        if (session?.user) {

          await fetchProfile(
            session.user.id
          );

        }

        setLoading(false);

      });

    const {
      data: { subscription }
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {

          setSession(session);

          setUser(
            session?.user ?? null
          );

          if (session?.user) {

            await fetchProfile(
              session.user.id
            );

          } else {

            setProfile(null);

          }

        }
      );

    return () => {
      subscription.unsubscribe();
    };

  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: string
  ) => {

    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email,
        password,

        options: {
          data: {
            full_name: fullName,
            role: 'worker'
          }
        }

      });

    if (
      !error &&
      data.user
    ) {

      await supabase
        .from('profiles')
        .insert({

          id: data.user.id,
          full_name: fullName,
          role: 'worker'

        });

      await fetchProfile(
        data.user.id
      );

    }

    return { error };

  };

  const signIn = async (
    email: string,
    password: string
  ) => {

    const { error } =
      await supabase.auth
        .signInWithPassword({

          email,
          password

        });

    return { error };

  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {

    await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setProfile(null);

  };

  return (

    <AuthContext.Provider
      value={{

        user,
        session,
        profile,
        loading,

        signUp,
        signIn,
        signOut,
        refreshProfile

      }}
    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      'useAuth must be used within AuthProvider'
    );

  }

  return context;

}
