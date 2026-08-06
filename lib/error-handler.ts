import { NextResponse } from 'next/server';

export function handleApiError(error: any) {
  console.error('API Error:', error);
  
  const isProd = process.env.NODE_ENV === 'production';
  const errorMessage = isProd 
    ? 'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.' 
    : error.message || 'Unknown server error';
    
  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: 500 }
  );
}
