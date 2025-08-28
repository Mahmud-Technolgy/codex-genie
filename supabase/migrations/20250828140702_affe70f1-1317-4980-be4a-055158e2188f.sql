-- Fix search path security issues for functions

-- Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update handle_new_user function  
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;