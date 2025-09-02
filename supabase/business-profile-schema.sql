-- Business Profile Schema Extension for ClientHandle
-- Run this after the main schema to add business profile fields

-- Add business profile columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_clients TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_website TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS value_proposition TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS typical_project_duration TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'professional';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Create business profile types enum
DROP TYPE IF EXISTS business_type_enum CASCADE;
CREATE TYPE business_type_enum AS ENUM (
    'freelancer',
    'agency',
    'consultant',
    'contractor',
    'studio',
    'firm',
    'other'
);

-- Create industry enum for common industries
DROP TYPE IF EXISTS industry_enum CASCADE;
CREATE TYPE industry_enum AS ENUM (
    'web_development',
    'mobile_development',
    'design_ui_ux',
    'graphic_design',
    'marketing_digital',
    'content_writing',
    'photography',
    'video_production',
    'consulting_business',
    'consulting_tech',
    'accounting_finance',
    'legal_services',
    'architecture',
    'engineering',
    'real_estate',
    'healthcare',
    'education_training',
    'translation',
    'virtual_assistant',
    'social_media',
    'seo_sem',
    'data_analysis',
    'project_management',
    'other'
);

-- Create communication style enum
DROP TYPE IF EXISTS communication_style_enum CASCADE;
CREATE TYPE communication_style_enum AS ENUM (
    'casual',
    'professional',
    'formal',
    'friendly',
    'direct'
);

-- Create pricing model enum
DROP TYPE IF EXISTS pricing_model_enum CASCADE;
CREATE TYPE pricing_model_enum AS ENUM (
    'hourly',
    'project_based',
    'retainer',
    'value_based',
    'mixed',
    'other'
);

-- Update users table to use enums
ALTER TABLE public.users ALTER COLUMN business_type TYPE business_type_enum USING business_type::business_type_enum;
ALTER TABLE public.users ALTER COLUMN industry TYPE industry_enum USING industry::industry_enum;
ALTER TABLE public.users ALTER COLUMN communication_style TYPE communication_style_enum USING communication_style::communication_style_enum;
ALTER TABLE public.users ALTER COLUMN pricing_model TYPE pricing_model_enum USING pricing_model::pricing_model_enum;

-- Add constraints
ALTER TABLE public.users ADD CONSTRAINT check_business_name_length CHECK (LENGTH(business_name) <= 100);
ALTER TABLE public.users ADD CONSTRAINT check_service_description_length CHECK (LENGTH(service_description) <= 500);
ALTER TABLE public.users ADD CONSTRAINT check_value_proposition_length CHECK (LENGTH(value_proposition) <= 300);
ALTER TABLE public.users ADD CONSTRAINT check_onboarding_step_range CHECK (onboarding_step >= 0 AND onboarding_step <= 10);

-- Create business templates table for AI context
DROP TABLE IF EXISTS public.business_templates CASCADE;
CREATE TABLE public.business_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry industry_enum NOT NULL,
    business_type business_type_enum NOT NULL,
    template_name TEXT NOT NULL,
    follow_up_style TEXT NOT NULL,
    common_phrases JSONB DEFAULT '[]'::jsonb,
    project_lifecycle JSONB DEFAULT '{}'::jsonb,
    client_pain_points JSONB DEFAULT '[]'::jsonb,
    value_propositions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common business templates for AI enhancement
INSERT INTO public.business_templates (industry, business_type, template_name, follow_up_style, common_phrases, project_lifecycle, client_pain_points, value_propositions) VALUES 
-- Web Development
('web_development', 'freelancer', 'Web Developer', 'technical_professional', 
 '["development milestone", "code review", "deployment phase", "testing completed", "feature implementation"]',
 '{"discovery": "1-2 weeks", "design": "1-2 weeks", "development": "4-8 weeks", "testing": "1 week", "launch": "1 week"}',
 '["technical complexity", "timeline pressures", "scope creep", "budget constraints"]',
 '["custom solutions", "scalable architecture", "modern technologies", "responsive design", "performance optimization"]'
),

-- Design
('design_ui_ux', 'freelancer', 'UI/UX Designer', 'creative_professional',
 '["design iteration", "user feedback", "prototype review", "design system", "user experience"]',
 '{"research": "1 week", "wireframes": "1-2 weeks", "design": "2-4 weeks", "prototyping": "1 week", "handoff": "1 week"}',
 '["user engagement", "conversion rates", "brand consistency", "usability issues"]',
 '["user-centered design", "conversion optimization", "brand enhancement", "intuitive interfaces", "research-driven solutions"]'
),

-- Digital Marketing
('marketing_digital', 'agency', 'Digital Marketing Agency', 'results_focused',
 '["campaign performance", "ROI metrics", "lead generation", "brand awareness", "conversion optimization"]',
 '{"strategy": "1 week", "setup": "1-2 weeks", "execution": "ongoing", "optimization": "continuous", "reporting": "monthly"}',
 '["low ROI", "poor lead quality", "brand visibility", "competitive pressure"]',
 '["data-driven strategies", "proven ROI", "scalable growth", "brand positioning", "competitive advantage"]'
),

-- Business Consulting
('consulting_business', 'consultant', 'Business Consultant', 'strategic_professional',
 '["strategic analysis", "process optimization", "implementation phase", "performance metrics", "business growth"]',
 '{"assessment": "2-3 weeks", "strategy": "2-4 weeks", "implementation": "8-12 weeks", "monitoring": "ongoing"}',
 '["operational inefficiencies", "growth stagnation", "process bottlenecks", "strategic direction"]',
 '["strategic insights", "operational excellence", "sustainable growth", "competitive positioning", "measurable results"]'
);

-- Create indexes for business profile queries
CREATE INDEX IF NOT EXISTS idx_users_business_type ON public.users(business_type) WHERE business_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_industry ON public.users(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON public.users(profile_completed);
CREATE INDEX IF NOT EXISTS idx_business_templates_industry_type ON public.business_templates(industry, business_type);

-- Update the user creation trigger to handle business profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, profile_completed, onboarding_step)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.business_templates IS 'Template data for AI-enhanced follow-ups based on business type and industry';
COMMENT ON COLUMN public.users.business_name IS 'Name of the user''s business or freelance brand';
COMMENT ON COLUMN public.users.service_description IS 'Description of services provided to clients';
COMMENT ON COLUMN public.users.value_proposition IS 'Unique value proposition for client communications';
COMMENT ON COLUMN public.users.profile_completed IS 'Whether user has completed business profile setup';
COMMENT ON COLUMN public.users.onboarding_step IS 'Current step in onboarding process (0-10)';