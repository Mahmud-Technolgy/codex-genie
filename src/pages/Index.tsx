import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Code2, 
  Zap, 
  Shield, 
  Users, 
  Star, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Globe
} from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "AI-Powered Generation",
      description: "Advanced AI models generate high-quality code in any programming language"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Instant Results",
      description: "Get production-ready code snippets in seconds, not hours"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Private",
      description: "Your code and data are completely secure with enterprise-grade encryption"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multi-Language Support",
      description: "Support for 50+ programming languages and frameworks"
    }
  ];

  const pricing = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      credits: "50 credits",
      features: [
        "50 monthly credits",
        "Basic code generation",
        "Standard support",
        "Code history"
      ],
      buttonText: "Get Started",
      variant: "outline" as const
    },
    {
      name: "Premium",
      price: "$19",
      period: "/month",
      credits: "1000 credits",
      features: [
        "1000 monthly credits",
        "Advanced AI models",
        "Priority support",
        "Export capabilities",
        "Team collaboration"
      ],
      buttonText: "Upgrade Now",
      variant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      credits: "Unlimited",
      features: [
        "Unlimited credits",
        "Custom AI training",
        "24/7 dedicated support",
        "API access",
        "Advanced analytics",
        "Custom integrations"
      ],
      buttonText: "Contact Sales",
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Code2 className="h-20 w-20 text-primary animate-float" />
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-primary-glow rounded-full animate-pulse-glow" />
              </div>
            </div>

            {/* Hero text */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="gradient-text">CodeGenie</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Transform your ideas into code with the power of AI
            </p>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              Generate production-ready code snippets in any programming language. 
              From simple functions to complex algorithms, CodeGenie makes coding effortless.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {user ? (
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 glow-border"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 glow-border"
                    onClick={() => navigate('/auth')}
                  >
                    Start Generating Free
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => navigate('/auth')}
                  >
                    Watch Demo
                  </Button>
                </>
              )}
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span>4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>10K+ developers</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>50+ languages</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose CodeGenie?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to accelerate your development workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card text-center group hover:glow-border transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include core features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, index) => (
              <Card 
                key={index} 
                className={`glass-card text-center relative ${
                  plan.popular ? 'glow-border scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold">
                    {plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <CardDescription className="text-lg font-medium text-primary">
                    {plan.credits}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.variant}
                    className="w-full"
                    size="lg"
                    onClick={() => navigate('/auth')}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Coding?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of developers who trust CodeGenie to accelerate their projects.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6"
              onClick={() => navigate('/auth')}
            >
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
