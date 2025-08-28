-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'premium', 'admin');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'usage', 'bonus', 'refund', 'admin_adjustment');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'incomplete');

-- Create enum for support ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'user',
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credits table for tracking user balances and transactions
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0, -- Current credit balance
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit_transactions table for tracking credit history
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for credits added, negative for credits used
  type transaction_type NOT NULL,
  description TEXT,
  reference_id TEXT, -- For linking to payments, generations, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create code_generations table for storing generation history
CREATE TABLE public.code_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_code TEXT NOT NULL,
  language TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used TEXT NOT NULL DEFAULT 'gemini-pro',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table for premium membership tracking
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan_name TEXT NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  credits_per_month INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referrals table for referral system
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Create admin_logs table for admin activity tracking
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create support_tickets table for customer support
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  admin_response TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for credits
CREATE POLICY "Users can view their own credits" ON public.credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credits" ON public.credits
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Allow credit creation" ON public.credits
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update credits" ON public.credits
  FOR UPDATE USING (true);

-- Create RLS policies for credit_transactions
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.credit_transactions
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Allow transaction creation" ON public.credit_transactions
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for code_generations
CREATE POLICY "Users can view their own generations" ON public.code_generations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public generations" ON public.code_generations
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can view all generations" ON public.code_generations
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can create generations" ON public.code_generations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generations" ON public.code_generations
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Allow subscription creation" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (true);

-- Create RLS policies for referrals
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Allow referral creation" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for admin_logs
CREATE POLICY "Admins can view all logs" ON public.admin_logs
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can create logs" ON public.admin_logs
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- Create RLS policies for support_tickets
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update all tickets" ON public.support_tickets
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_user_id UUID;
  new_referral_code TEXT;
BEGIN
  -- Generate unique referral code
  new_referral_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8));
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_referral_code
  );
  
  -- Insert initial credits (50 free credits for new users)
  INSERT INTO public.credits (user_id, amount)
  VALUES (NEW.id, 50);
  
  -- Insert initial credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50, 'bonus', 'Welcome bonus - 50 free credits');
  
  -- Handle referral if referral code was provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT user_id INTO referral_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
    
    IF referral_user_id IS NOT NULL THEN
      -- Update referred user profile
      UPDATE public.profiles
      SET referred_by = referral_user_id
      WHERE user_id = NEW.id;
      
      -- Add referral record
      INSERT INTO public.referrals (referrer_id, referred_id)
      VALUES (referral_user_id, NEW.id);
      
      -- Award credits to referrer
      UPDATE public.credits
      SET amount = amount + 50, updated_at = now()
      WHERE user_id = referral_user_id;
      
      -- Log referral credit transaction
      INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (referral_user_id, 50, 'bonus', 'Referral bonus - new user signup');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_credits_user_id ON public.credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_code_generations_user_id ON public.code_generations(user_id);
CREATE INDEX idx_code_generations_created_at ON public.code_generations(created_at DESC);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);