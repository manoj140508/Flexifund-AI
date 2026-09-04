'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResilienceRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/plan-ahead?tab=cushion');
  }, [router]);

  return null;
}
