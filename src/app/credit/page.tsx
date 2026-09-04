'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreditRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/plan-ahead?tab=what-if');
  }, [router]);

  return null;
}
