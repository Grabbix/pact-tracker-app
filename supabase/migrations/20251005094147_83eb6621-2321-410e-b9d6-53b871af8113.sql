-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  total_hours INTEGER NOT NULL,
  used_hours INTEGER NOT NULL DEFAULT 0,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interventions table
CREATE TABLE public.interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  hours_used DECIMAL NOT NULL,
  technician TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (pas d'authentification pour l'instant)
CREATE POLICY "Allow public read access to contracts" 
ON public.contracts 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to contracts" 
ON public.contracts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to contracts" 
ON public.contracts 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to contracts" 
ON public.contracts 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access to interventions" 
ON public.interventions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to interventions" 
ON public.interventions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to interventions" 
ON public.interventions 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to interventions" 
ON public.interventions 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on contracts
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contracts_archived ON public.contracts(is_archived);
CREATE INDEX idx_interventions_contract_id ON public.interventions(contract_id);