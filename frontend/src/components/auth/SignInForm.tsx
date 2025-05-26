import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(''); // Renamed to avoid conflict with context error
  const navigate = useNavigate();
  const { loginUser, error: contextError, loading } = useUser(); // Use context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await loginUser({ email, password });
      navigate('/calendar'); // Navigate to calendar page on successful login
    } catch (err) {
      // Error is already handled by context, but you might want to log or display a generic message
      setFormError(contextError || 'Failed to sign in. Please check your credentials.');
      console.error(err); // Keep console error for debugging if needed
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-8 border rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center">Sign In</h2>
      {formError && <p className="text-red-500 text-center">{formError}</p>}
      {contextError && !formError && <p className="text-red-500 text-center">{contextError}</p>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>
       <p className="text-center text-sm">
        Don't have an account?{' '}
        <Button variant="link" onClick={() => navigate('/signup')} className="p-0 h-auto">Sign Up</Button>
      </p>
    </form>
  );
};

export default SignInForm;
