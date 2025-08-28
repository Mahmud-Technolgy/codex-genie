-- Create payment methods table
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment transactions table
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'pending',
  external_transaction_id TEXT,
  proof_url TEXT,
  admin_notes TEXT,
  credits_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
CREATE POLICY "Anyone can view enabled payment methods" ON public.payment_methods
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (get_current_user_role() = 'admin'::app_role);

-- Payment transactions policies  
CREATE POLICY "Users can view their own transactions" ON public.payment_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions" ON public.payment_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.payment_transactions
  FOR SELECT USING (get_current_user_role() = 'admin'::app_role);

CREATE POLICY "Admins can update all transactions" ON public.payment_transactions
  FOR UPDATE USING (get_current_user_role() = 'admin'::app_role);

-- Insert default payment methods
INSERT INTO public.payment_methods (name, display_name, is_enabled, config) VALUES
('bkash', 'bKash', false, '{"merchant_number": "", "api_key": "", "api_secret": ""}'),
('nagad', 'Nagad', false, '{"merchant_id": "", "merchant_key": ""}'),
('manual', 'Manual Payment', true, '{"instructions": "Send payment to admin and upload proof"}'),
('stripe', 'Credit Card', false, '{}');

-- Create trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();