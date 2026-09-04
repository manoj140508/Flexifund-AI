'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IncomeRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/my-money');
  }, [router]);

  return null;
}
