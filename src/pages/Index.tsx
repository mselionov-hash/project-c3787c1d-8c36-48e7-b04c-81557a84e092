import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/store';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentUser();
    navigate(user ? '/dashboard' : '/auth');
  }, [navigate]);

  return null;
};

export default Index;
