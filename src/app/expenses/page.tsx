'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpensesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/my-money');
  }, [router]);

  return null;
}
